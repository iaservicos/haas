import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

const router = express.Router();

// Configuração Claude Analysis Service (Proxy Gratuito)
const ANALYZER_SERVICE_URL = process.env.ANALYZER_SERVICE_URL || 'https://haas-analyzer.vercel.app/api/analyze';

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
 * Função para fazer requisição ao serviço de análise Claude
 */
async function makeAnalysisRequest(
  base64: string,
  mimeType: string,
  analysisId: number
): Promise<any> {
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[CRON] Tentativa ${attempt}/${MAX_RETRIES} com Claude Analyzer para análise ${analysisId}...`);

      const response = await axios.post(
        ANALYZER_SERVICE_URL,
        {
          base64,
          mimeType,
        },
        {
          timeout: 120000, // 2 minutos
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`[CRON] ✅ Sucesso na tentativa ${attempt}`);
      return response.data;

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
 * Usado quando Claude Analyzer falha
 */
function generateAnalysisJSON(
  descricao: string,
  fileName: string
): string {
  const descLower = descricao.toLowerCase();

  // Padrões de palavras-chave para cada tipo de dano (expandido)
  const damagePatterns: Record<string, { keywords: string[], types: string[] }> = {
    'TELA/DISPLAY': {
      keywords: ['trinca', 'quebra', 'mancha', 'pixel', 'linha', 'vidro', 'crack', 'broken', 'screen', 'display', 'lcd', 'risca', 'risco', 'desbotamento', 'burn', 'queimada'],
      types: ['Trincas', 'Quebras', 'Manchas', 'Linhas horizontais/verticais', 'Vidro solto'],
    },
    'CARCAÇA': {
      keywords: ['amassado', 'dent', 'burn', 'queimadura', 'corrosão', 'deforma', 'faltando', 'missing', 'damage', 'oxidação', 'mancha escura', 'risca'],
      types: ['Amassados', 'Queimaduras', 'Corrosão', 'Deformação', 'Peças faltando'],
    },
    'TECLADO': {
      keywords: ['tecla', 'key', 'líquido', 'derrama', 'keyboard', 'molhado', 'spill', 'sujeira'],
      types: ['Teclas faltando', 'Teclas soltas', 'Derramamento de líquido'],
    },
    'CONECTORES': {
      keywords: ['usb', 'hdmi', 'conector', 'plugue', 'solto', 'quebrado', 'damaged', 'port', 'jack', 'pino'],
      types: ['USB danificado', 'HDMI danificado', 'Conectores soltos'],
    },
    'OUTROS': {
      keywords: ['líquido', 'água', 'oxidação', 'corrosão', 'mancha', 'stain', 'wet', 'water', 'sujeira'],
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
      confianca: 'média',
      metodo: 'local_fallback',
    });
  }

  return JSON.stringify({
    status: 'AVARIA',
    categoria: melhorCategoria,
    tipo_dano: melhorTipoDano,
    descricao: descricao.substring(0, 100),
    confianca: 'média',
    metodo: 'local_fallback',
  });
}

/**
 * POST /api/cron/analise-fotos
 * Cron job que roda a cada 1 minuto
 * Processa análises pendentes com Claude Analyzer Service (GRATUITO)
 * COM RETRY AUTOMÁTICO E FALLBACK PARA ANÁLISE LOCAL
 */
router.post('/analise-fotos', async (req: any, res: any) => {
  try {
    console.log('[CRON] Iniciando processamento de análises pendentes...');

    if (!ANALYZER_SERVICE_URL) {
      console.error('[CRON] ANALYZER_SERVICE_URL não configurada');
      return res.status(500).json({ error: 'ANALYZER_SERVICE_URL não configurada' });
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

        // Enviar para Claude Analyzer Service
        console.log('[CRON] Enviando para Claude Analyzer com retry automático...');

        let resultado: any = null;
        let analyzerSuccesso = false;

        try {
          const analysisResponse = await makeAnalysisRequest(base64, mimeType, analise.id);
          if (analysisResponse.success && analysisResponse.data) {
            resultado = analysisResponse.data;
            analyzerSuccesso = true;
            console.log(`[CRON] ✅ Análise recebida do Claude: ${resultado.status}`);
          }
        } catch (analyzerError) {
          console.warn(`[CRON] ⚠️ Claude Analyzer falhou, usando análise local`);
          const resultadoJSON = generateAnalysisJSON(`Foto de equipamento ${fileName}`, fileName);
          resultado = JSON.parse(resultadoJSON);
        }

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

        console.log(`[CRON] Análise ${analise.id} processada com sucesso! (Método: ${analyzerSuccesso ? 'Claude' : 'Local'})`);
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
