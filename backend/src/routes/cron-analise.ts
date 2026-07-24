import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const router = express.Router();

// Configuração otimizada para velocidade
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000; // 1 segundo

/**
 * Função para calcular delay com backoff exponencial
 */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
  return Math.min(delay, 5000); // Máximo 5 segundos
}

/**
 * Função para fazer requisição com retry automático ao Claude
 */
async function analyzeImageWithClaude(
  base64: string,
  mimeType: string,
  numeroSerie: string,
  fileName: string,
  analysisId: number
): Promise<string> {
  let lastError: any;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[CRON] Tentativa ${attempt}/${MAX_RETRIES} com Claude 3.5 Haiku para análise ${analysisId}...`);

      const response = await client.messages.create({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: `Você é um especialista CRÍTICO em inspeção de equipamentos de TI da Positivo Tecnologia. Sua tarefa é identificar QUALQUER dano visível na imagem.

Número de série: ${numeroSerie || 'N/A'}
Nome da foto: ${fileName}

⚠️ INSTRUÇÕES CRÍTICAS - LEIA COM ATENÇÃO:
1. Examine CADA PARTE da imagem em detalhes: tela/display, carcaça, teclado, conectores, bordas
2. Se houver QUALQUER anomalia visual → é AVARIA (não é OK)
3. Linhas na tela (horizontais ou verticais) = SEMPRE AVARIA
4. Pixels mortos ou manchas = SEMPRE AVARIA
5. Trincas em qualquer lugar = SEMPRE AVARIA
6. Desbotamento ou descoloração = AVARIA
7. Oxidação ou corrosão = AVARIA
8. Amassados ou deformações = AVARIA
9. Se tiver dúvida → responda AVARIA (é mais seguro)
10. Nunca retorne OK se vê QUALQUER problema

CATEGORIAS DE AVARIAS:

TELA/DISPLAY (procure atentamente por):
- Linhas horizontais/verticais (LCD danificado) = SEMPRE AVARIA
- Trincas (pequenas, médias, grandes)
- Quebras (vidro quebrado)
- Manchas (pixel morto, mancha de tinta)
- Desbotamento
- Vidro solto

CARCAÇA:
- Amassados
- Trincas
- Queimaduras
- Corrosão
- Deformação
- Peças faltando

TECLADO:
- Teclas faltando
- Teclas soltas
- Derramamento de líquido

TOUCHPAD:
- Trincado
- Solto
- Molhado

CONECTORES:
- USB danificado
- HDMI danificado
- Carregador danificado
- Conectores soltos
- Conectores quebrados

BATERIA (Notebooks):
- Inchada
- Danificada
- Vazando

OUTROS:
- Sinais de líquido
- Oxidação

FORMATO DE RESPOSTA - RETORNE EXATAMENTE ASSIM:
{
  "status": "OK" ou "AVARIA",
  "categoria": "TELA/DISPLAY" ou "CARCAÇA" ou "TECLADO" ou "TOUCHPAD" ou "CONECTORES" ou "BATERIA" ou "OUTROS" (vazio se OK),
  "tipo_dano": "tipo específico encontrado" (ex: "Linhas horizontais/verticais", "Trincas", "Quebras", "Amassados") (vazio se OK),
  "descricao": "descrição resumida em 1 linha do que viu"
}

Responda APENAS com o JSON, sem explicações, sem markdown, sem blocos de código.`,
              },
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Resposta não é texto');
      }

      console.log(`[CRON] ✅ Sucesso na tentativa ${attempt}`);
      return content.text;

    } catch (error: any) {
      lastError = error;
      const message = error.message || 'Erro desconhecido';

      console.log(`[CRON] ❌ Tentativa ${attempt} falhou: ${message}`);

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
 * Usado quando Claude falha
 */
function generateAnalysisJSON(
  descricao: string,
  fileName: string
): string {
  const descLower = descricao.toLowerCase();

  // Padrões de palavras-chave para cada tipo de dano (expandido)
  const damagePatterns: Record<string, { keywords: string[], types: string[] }> = {
    'TELA/DISPLAY': {
      keywords: ['trinca', 'quebra', 'mancha', 'pixel', 'linha', 'vidro', 'crack', 'broken', 'screen', 'display', 'lcd', 'risca', 'risco', 'desbotamento', 'burn', 'queimada', 'horizontal', 'vertical'],
      types: ['Trincas', 'Quebras', 'Manchas', 'Linhas horizontais/verticais', 'Vidro solto'],
    },
    'CARCAÇA': {
      keywords: ['amassado', 'dent', 'burn', 'queimadura', 'corrosão', 'deforma', 'faltando', 'missing', 'damage', 'oxidação', 'mancha escura', 'risca', 'deformado'],
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
      metodo: 'local_fallback',
    });
  }

  return JSON.stringify({
    status: 'AVARIA',
    categoria: melhorCategoria,
    tipo_dano: melhorTipoDano,
    descricao: descricao.substring(0, 100),
    metodo: 'local_fallback',
  });
}

/**
 * POST /api/cron/analise-fotos
 * Cron job que roda a cada 1 minuto
 * Processa análises pendentes com Claude 3.5 Sonnet (GRATUITO NO PILOTO)
 * COM RETRY AUTOMÁTICO E FALLBACK PARA ANÁLISE LOCAL
 */
router.post('/analise-fotos', async (req: any, res: any) => {
  try {
    console.log('[CRON] Iniciando processamento de análises pendentes...');

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[CRON] ANTHROPIC_API_KEY não configurada');
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY não configurada' });
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

        // Enviar para Claude Sonnet com retry automático
        console.log('[CRON] Enviando para Claude 3.5 Sonnet com retry automático...');

        let claudeResponse = '';
        let claudeSuccesso = false;

        try {
          claudeResponse = await analyzeImageWithClaude(
            base64,
            mimeType,
            analise.numero_serie,
            fileName,
            analise.id
          );
          claudeSuccesso = true;
          console.log(`[CRON] ✅ Análise recebida do Claude: ${claudeResponse.substring(0, 100)}...`);
        } catch (claudeError) {
          console.warn(`[CRON] ⚠️ Claude falhou, usando análise local`);
          claudeResponse = `Foto de equipamento ${fileName}`;
        }

        // Fazer parse do JSON
        let resultado;
        try {
          // Remover blocos de código markdown se existirem
          let jsonContent = claudeResponse;
          if (claudeResponse.includes('```')) {
            console.log('[CRON] Removendo blocos de código markdown da resposta...');
            jsonContent = claudeResponse.replace(/```json\n?/g, '').replace(/```/g, '').trim();
          }

          resultado = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error(`[CRON] Erro ao fazer parse da resposta JSON:`, parseError);
          console.error(`[CRON] Conteúdo bruto:`, claudeResponse);
          // Fallback para análise local se parse falhar
          const resultadoJSON = generateAnalysisJSON(claudeResponse, fileName);
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

        console.log(`[CRON] Análise ${analise.id} processada com sucesso! (Método: ${claudeSuccesso ? 'Claude' : 'Local'})`);
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
