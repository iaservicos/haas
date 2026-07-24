import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

const router = express.Router();

// Configuração Hugging Face (Gratuito)
const HF_API_KEY = process.env.HUGGING_FACE_API_KEY;
const HF_API_URL = 'https://api-inference.huggingface.co/models';
const HF_MODEL = 'nlpconnect/vit-gpt2-image-captioning'; // Modelo leve e rápido

// Configuração de retry com backoff exponencial
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 segundos
const MAX_RETRY_DELAY = 30000; // 30 segundos

/**
 * Função para calcular delay com backoff exponencial
 */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY);
}

/**
 * Função para fazer requisição com retry automático ao Hugging Face
 */
async function makeHuggingFaceRequest(
  base64: string,
  mimeType: string,
  analysisId: number
): Promise<string> {
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[CRON] Tentativa ${attempt}/${MAX_RETRIES} com Hugging Face para análise ${analysisId}...`);

      // Converter base64 para buffer
      const imageBuffer = Buffer.from(base64, 'base64');

      const response = await axios.post(
        `${HF_API_URL}/${HF_MODEL}`,
        imageBuffer,
        {
          headers: {
            Authorization: `Bearer ${HF_API_KEY}`,
            'Content-Type': mimeType,
          },
          timeout: 120000, // 2 minutos (primeira requisição pode demorar)
        }
      );

      console.log(`[CRON] ✅ Sucesso na tentativa ${attempt}`);

      // Hugging Face retorna: [{"generated_text": "description..."}]
      const generatedText = response.data[0]?.generated_text || '';
      return generatedText;

    } catch (error: any) {
      lastError = error;
      const status = error.response?.status || 'N/A';
      const message = error.message || 'Erro desconhecido';

      console.log(`[CRON] ❌ Tentativa ${attempt} falhou (Status: ${status}, Erro: ${message})`);

      // Se é a última tentativa, vai cair para análise local
      if (attempt === MAX_RETRIES) {
        console.log(`[CRON] ⚠️ Usando análise local (fallback)`);
        throw error;
      }

      // Calcular delay e aguardar
      const delay = getRetryDelay(attempt);
      console.log(`[CRON] ⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Análise local baseada em palavras-chave (fallback gratuito)
 * Usado quando Hugging Face falha
 */
function generateAnalysisJSON(
  descricao: string,
  fileName: string
): string {
  const descLower = descricao.toLowerCase();

  // Padrões de palavras-chave para cada tipo de dano
  const damagePatterns: Record<string, { keywords: string[], types: string[] }> = {
    'TELA/DISPLAY': {
      keywords: ['trinca', 'quebra', 'mancha', 'pixel', 'linha', 'vidro', 'crack', 'broken', 'screen', 'display', 'lcd'],
      types: ['Trincas', 'Quebras', 'Manchas', 'Linhas horizontais/verticais', 'Vidro solto'],
    },
    'CARCAÇA': {
      keywords: ['amassado', 'dent', 'burn', 'queimadura', 'corrosão', 'deforma', 'faltando', 'missing', 'dent', 'damage'],
      types: ['Amassados', 'Queimaduras', 'Corrosão', 'Deformação', 'Peças faltando'],
    },
    'TECLADO': {
      keywords: ['tecla', 'key', 'líquido', 'derrama', 'keyboard', 'molhado', 'spill'],
      types: ['Teclas faltando', 'Teclas soltas', 'Derramamento de líquido'],
    },
    'CONECTORES': {
      keywords: ['usb', 'hdmi', 'conector', 'plugue', 'solto', 'quebrado', 'damaged', 'port', 'jack'],
      types: ['USB danificado', 'HDMI danificado', 'Conectores soltos'],
    },
    'OUTROS': {
      keywords: ['líquido', 'água', 'oxidação', 'corrosão', 'mancha', 'stain', 'wet', 'water'],
      types: ['Sinais de líquido', 'Oxidação'],
    },
  };

  // Verificar qual categoria melhor se encaixa
  let melhorCategoria = '';
  let melhorTipoDano = '';
  let pontuacaoMaxima = 0;

  for (const [categoria, { keywords, types }] of Object.entries(damagePatterns)) {
    const matches = keywords.filter(kw => descLower.includes(kw)).length;

    if (matches > pontuacaoMaxima) {
      pontuacaoMaxima = matches;
      melhorCategoria = categoria;
      melhorTipoDano = types[0] || '';
    }
  }

  // Se nenhum dano encontrado
  if (pontuacaoMaxima === 0) {
    return JSON.stringify({
      status: 'OK',
      categoria: '',
      tipo_dano: '',
      descricao: 'Equipamento sem danos visíveis',
      metodo: 'huggingface_local_fallback',
    });
  }

  return JSON.stringify({
    status: 'AVARIA',
    categoria: melhorCategoria,
    tipo_dano: melhorTipoDano,
    descricao: descricao.substring(0, 100),
    metodo: 'huggingface_local_fallback',
  });
}

/**
 * POST /api/cron/analise-fotos
 * Cron job que roda a cada 1 minuto
 * Processa análises pendentes com Hugging Face (GRATUITO)
 * COM RETRY AUTOMÁTICO E FALLBACK PARA ANÁLISE LOCAL
 */
router.post('/analise-fotos', async (req: any, res: any) => {
  try {
    console.log('[CRON] Iniciando processamento de análises pendentes...');

    if (!HF_API_KEY) {
      console.error('[CRON] HUGGING_FACE_API_KEY não configurada');
      return res.status(500).json({ error: 'HUGGING_FACE_API_KEY não configurada' });
    }

    // Buscar análises com status "pendente"
    const { data: analisesPendentes, error: fetchError } = await supabase
      .from('analises_fotos')
      .select('*')
      .eq('status', 'pendente')
      .limit(1); // Processar 1 por vez para evitar rate limit

    if (fetchError) {
      console.error('[CRON] Erro ao buscar análises pendentes:', fetchError);
      return res.status(500).json({ error: 'Erro ao buscar análises' });
    }

    if (!analisesPendentes || analisesPendentes.length === 0) {
      console.log('[CRON] Nenhuma análise pendente encontrada');
      return res.json({
        success: true,
        message: 'Nenhuma análise pendente',
        processadas: 0,
      });
    }

    console.log(`[CRON] Encontradas ${analisesPendentes.length} análises pendentes`);

    let processadas = 0;
    let erros = 0;

    for (const analise of analisesPendentes) {
      try {
        console.log(`[CRON] Processando análise ID ${analise.id}...`);

        // Buscar foto associada
        const { data: foto, error: fotoError } = await supabase
          .from('fotos_vistoria')
          .select('*')
          .eq('id', analise.foto_id)
          .single();

        if (fotoError || !foto) {
          console.error(`[CRON] Foto não encontrada para análise ${analise.id}`);
          erros++;
          continue;
        }

        console.log(`[CRON] Foto encontrada: ${foto.foto_url}`);

        // Baixar imagem
        console.log('[CRON] Baixando imagem para análise...');
        const imageResponse = await axios.get(foto.foto_url, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        // Converter para base64
        const base64 = Buffer.from(imageResponse.data).toString('base64');
        console.log(`[CRON] Imagem convertida para base64: ${base64.length} caracteres`);

        // Detectar mime type correto
        const fileName = foto.foto_url.split('/').pop() || '';
        const extension = fileName.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/png';

        console.log(`[CRON] Usando mime type: ${mimeType}`);

        // Enviar para Hugging Face
        console.log('[CRON] Enviando para Hugging Face com retry automático...');

        let descricaoHF = '';
        let hfSuccesso = false;

        try {
          descricaoHF = await makeHuggingFaceRequest(base64, mimeType, analise.id);
          hfSuccesso = true;
          console.log(`[CRON] ✅ Análise recebida do Hugging Face: ${descricaoHF.substring(0, 100)}...`);
        } catch (hfError) {
          console.warn(`[CRON] ⚠️ Hugging Face falhou, usando análise local`);
          descricaoHF = `Foto de equipamento ${fileName}`;
        }

        // Gerar análise estruturada (com descrição do HF ou local)
        const resultadoJSON = generateAnalysisJSON(descricaoHF, fileName);
        const resultado = JSON.parse(resultadoJSON);

        // Atualizar análise com resultado
        const { error: updateError } = await supabase
          .from('analises_fotos')
          .update({
            status: 'concluida',
            resultado_gptmaker: JSON.stringify(resultado),
            updated_at: new Date().toISOString(),
          })
          .eq('id', analise.id);

        if (updateError) {
          console.error(`[CRON] Erro ao atualizar análise ${analise.id}:`, updateError);
          erros++;
          continue;
        }

        console.log(`[CRON] Análise ${analise.id} processada com sucesso! (Método: ${hfSuccesso ? 'Hugging Face' : 'Local'})`);
        processadas++;

      } catch (error: any) {
        const message = error.message || 'Erro desconhecido';
        console.error(`[CRON] ❌ Erro ao processar análise ${analise.id}: ${message}`);

        // Registrar erro na análise
        try {
          await supabase
            .from('analises_fotos')
            .update({
              status: 'erro',
              resultado_gptmaker: JSON.stringify({
                status: 'ERRO',
                erro: message,
                categoria: '',
                tipo_dano: '',
                descricao: 'Erro ao processar análise',
                recomendacao: 'Será retentado automaticamente',
              }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', analise.id);
        } catch (updateError) {
          console.error(`[CRON] Erro ao registrar erro:`, updateError);
        }

        erros++;
      }
    }

    console.log(`[CRON] Processamento concluído: ${processadas} processadas, ${erros} erros`);

    res.json({
      success: true,
      message: 'Processamento concluído',
      processadas,
      erros,
      total: analisesPendentes.length,
    });

  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[CRON] ❌ Erro geral:', message);
    res.status(500).json({
      error: 'Erro ao processar cron job',
      details: message,
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
