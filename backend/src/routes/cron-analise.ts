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

// ============================================================================
// CONFIGURAÇÃO - Modelos com Fallback
// ============================================================================
// Modelos em ordem de preferência (fallback automático)
const CLAUDE_MODELS = [
  'claude-sonnet-5', // Sonnet 5 (mais novo, melhor qualidade)
  'claude-opus-4-1', // Opus 4.1 (alternativa se Sonnet 5 falhar)
  'claude-sonnet-4', // Sonnet 4 (fallback final)
];

const MAX_RETRIES = 2;
const REQUEST_TIMEOUT = 30000; // 30 segundos
const INITIAL_RETRY_DELAY = 1000; // 1 segundo

// ============================================================================
// ANÁLISE PROMPT - Otimizado para detectar LCD quebrado
// ============================================================================
const ANALYSIS_PROMPT = `Você é um especialista CRÍTICO em inspeção de equipamentos de TI da Positivo Tecnologia.

REGRA FUNDAMENTAL: Se a tela mostra LINHAS (horizontais ou verticais) = SEMPRE AVARIA (LCD danificado).

Analise a imagem cuidadosamente e identifique danos.

CATEGORIAS:
- TELA/DISPLAY: Linhas, trincas, quebras, manchas, pixels mortos
- CARCAÇA: Amassados, trincas, corrosão, peças faltando
- TECLADO: Teclas faltando, derramamento de líquido
- CONECTORES: Conectores danificados/soltos
- BATERIA: Inchada, danificada
- OUTROS: Sinais de líquido, oxidação

RESPONDA APENAS EM JSON (sem markdown, sem explicações):
{
  "status": "OK" ou "AVARIA",
  "categoria": "TELA/DISPLAY" ou "CARCAÇA" ou "TECLADO" ou "CONECTORES" ou "BATERIA" ou "OUTROS" (vazio se OK),
  "tipo_dano": "tipo específico" (vazio se OK),
  "descricao": "descrição resumida em 1 linha"
}`;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
}

function isValidAnalysisResponse(response: any): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }
  return (
    (response.status === 'OK' || response.status === 'AVARIA') &&
    typeof response.descricao === 'string'
  );
}

// ============================================================================
// ANÁLISE COM CLAUDE (com fallback de modelos)
// ============================================================================

async function analyzeImageWithClaude(
  base64: string,
  mimeType: string,
  numeroSerie: string,
  fileName: string,
  analysisId: number
): Promise<string> {
  let lastError: any;

  // Tentar cada modelo em ordem
  for (const model of CLAUDE_MODELS) {
    let modelLastError: any;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(
          `[CRON] Tentativa ${attempt}/${MAX_RETRIES} com ${model} para análise ${analysisId}...`
        );

        const response = await client.messages.create({
          model: model,
          max_tokens: 300,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: mimeType as
                      | 'image/jpeg'
                      | 'image/png'
                      | 'image/gif'
                      | 'image/webp',
                    data: base64,
                  },
                },
                {
                  type: 'text',
                  text: `${ANALYSIS_PROMPT}\n\nNúmero de série: ${numeroSerie || 'N/A'}\nFoto: ${fileName}`,
                },
              ],
            },
          ],
        });

        const content = response.content[0];
        if (content.type !== 'text') {
          throw new Error('Resposta do Claude não é texto');
        }

        console.log(`[CRON] ✅ Sucesso com ${model}!`);
        return content.text;
      } catch (error: any) {
        modelLastError = error;
        const message = error.message || 'Erro desconhecido';

        console.log(
          `[CRON] ❌ Tentativa ${attempt} com ${model} falhou: ${message}`
        );

        if (attempt < MAX_RETRIES) {
          const delay = getRetryDelay(attempt);
          console.log(`[CRON] ⏳ Aguardando ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Se este modelo falhou em todas as tentativas, tentar o próximo
    lastError = modelLastError;
    console.log(
      `[CRON] 🔄 Modelo ${model} não funcionou, tentando próximo...`
    );
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Se todos os modelos falharam
  throw lastError;
}

// ============================================================================
// ENDPOINT PRINCIPAL
// ============================================================================

router.post('/analise-fotos', async (req: any, res: any) => {
  try {
    console.log('[CRON] Iniciando processamento de análises pendentes...');

    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[CRON] ANTHROPIC_API_KEY não configurada');
      return res
        .status(500)
        .json({ error: 'ANTHROPIC_API_KEY não configurada' });
    }

    // Buscar análises pendentes
    const { data: analisesPendentes, error: fetchError } = await supabase
      .from('analises_fotos')
      .select('*')
      .eq('status', 'pendente')
      .limit(1);

    if (fetchError) {
      console.error('[CRON] Erro ao buscar análises:', fetchError);
      return res.status(500).json({ error: 'Erro ao buscar análises' });
    }

    if (!analisesPendentes || analisesPendentes.length === 0) {
      console.log('[CRON] Nenhuma análise pendente');
      return res.json({
        success: true,
        message: 'Nenhuma análise pendente',
        processadas: 0,
      });
    }

    console.log(
      `[CRON] Encontradas ${analisesPendentes.length} análises pendentes`
    );

    let processadas = 0;
    let erros = 0;

    for (const analise of analisesPendentes) {
      try {
        console.log(`[CRON] Processando análise ID ${analise.id}...`);

        // Buscar foto
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

        // Baixar e converter imagem
        console.log('[CRON] Baixando imagem...');
        const imageResponse = await axios.get(foto.foto_url, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const base64 = Buffer.from(imageResponse.data).toString('base64');
        console.log(
          `[CRON] Imagem convertida para base64: ${base64.length} caracteres`
        );

        // Determinar mime type
        const fileName = foto.foto_url.split('/').pop() || '';
        const extension = fileName.split('.').pop()?.toLowerCase() || 'png';
        const mimeType =
          extension === 'jpg' || extension === 'jpeg'
            ? 'image/jpeg'
            : 'image/png';

        console.log(`[CRON] Mime type: ${mimeType}`);

        // Analisar com Claude (com fallback)
        console.log('[CRON] Enviando para Claude (tentará múltiplos modelos se necessário)...');
        let claudeResponse: string;
        let resultado: any;

        try {
          claudeResponse = await analyzeImageWithClaude(
            base64,
            mimeType,
            analise.numero_serie,
            fileName,
            analise.id
          );

          console.log(
            `[CRON] Resposta bruta COMPLETA:\n${claudeResponse}`
          );

          // Parse JSON
          let jsonContent = claudeResponse.trim();

          // Remover markdown se existir
          if (jsonContent.includes('```')) {
            console.log('[CRON] Removendo blocos de markdown...');
            jsonContent = jsonContent
              .replace(/```json\n?/g, '')
              .replace(/```\n?/g, '')
              .trim();
          }

          console.log(`[CRON] JSON a fazer parse:\n${jsonContent}`);
          resultado = JSON.parse(jsonContent);

          // Validar resposta
          if (!isValidAnalysisResponse(resultado)) {
            console.error(`[CRON] Resposta inválida:`, resultado);
            throw new Error('Resposta não tem formato esperado');
          }

          console.log(
            `[CRON] ✅ Análise válida: status=${resultado.status}, categoria=${resultado.categoria}, tipo=${resultado.tipo_dano}`
          );
        } catch (parseError: any) {
          console.error(`[CRON] ❌ ERRO AO FAZER PARSE: ${parseError.message}`);
          console.error(`[CRON] RESPOSTA BRUTA COMPLETA:\n${claudeResponse}`);

          // ERRO REAL: não retornar "OK" falso
          throw new Error(
            `Falha ao analisar imagem: ${parseError.message}`
          );
        }

        // Atualizar banco
        const { error: updateError } = await supabase
          .from('analises_fotos')
          .update({
            status: 'concluida',
            resultado_gptmaker: JSON.stringify(resultado),
            updated_at: new Date().toISOString(),
          })
          .eq('id', analise.id);

        if (updateError) {
          console.error(`[CRON] Erro ao atualizar: ${updateError.message}`);
          erros++;
          continue;
        }

        console.log(`[CRON] Análise ${analise.id} concluída com sucesso!`);
        processadas++;
      } catch (error: any) {
        const message = error.message || 'Erro desconhecido';
        console.error(
          `[CRON] ❌ Erro ao processar análise ${analise.id}: ${message}`
        );

        // Registrar erro (melhor que falso negativo)
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
                descricao: 'Erro ao processar análise com Claude',
              }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', analise.id);
        } catch (updateError) {
          console.error('[CRON] Erro ao registrar erro:', updateError);
        }

        erros++;
      }
    }

    console.log(
      `[CRON] Concluído: ${processadas} processadas, ${erros} erros`
    );

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
