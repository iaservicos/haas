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
// CONFIRMADOS E TESTADOS:
const CLAUDE_MODELS = [
  'claude-haiku-4-5-20251001', // Haiku 4.5 (5x mais barato, rápido)
  'claude-sonnet-5', // Sonnet 5 (fallback se Haiku falhar - mais preciso)
  'claude-opus-4-1', // Opus 4.1 (fallback final)
];

const MAX_RETRIES = 2;
const REQUEST_TIMEOUT = 30000; // 30 segundos
const INITIAL_RETRY_DELAY = 1000; // 1 segundo

// ============================================================================
// ANÁLISE PROMPT - CRÍTICA: Foco extremo em TRINCAS E QUEBRAS
// ============================================================================
const ANALYSIS_PROMPT = `ANÁLISE CRÍTICA DE EQUIPAMENTO TI - POSITIVO TECNOLOGIA

INSTRUÇÃO PRIMÁRIA: Você DEVE mencionar TODOS os danos encontrados, não apenas um.

🔴 PRIMEIRA VERIFICAÇÃO - TELA/VIDRO:
PROCURE OBRIGATORIAMENTE POR:
A) TRINCAS NO VIDRO - qualquer linha/rachadura no vidro da tela
   - Trincas finas (mesmo invisíveis à distância)
   - Trincas nos cantos ou bordas
   - Qualquer padrão de quebra (tipo teia de aranha, linear, etc)
   - Se há QUALQUER dúvida = REPORTAR COMO TRINCA

B) LINHAS/FALHA LCD - linhas horizontais ou verticais na exibição
   - Indica LCD danificado/matriz quebrada
   - Mesmo que haja TAMBÉM trincas no vidro, MENCIONE AMBAS

C) QUEBRAS - vidro totalmente quebrado/fragmentado
   - Reportar como QUEBRA, não apenas TRINCA

🟢 SEGUNDA VERIFICAÇÃO - OUTROS DANOS:
- Manchas, pixels mortos
- Desbotamento
- Amassados na carcaça
- Qualquer outra anomalia

⚠️ REGRA CRÍTICA:
Se há MÚLTIPLOS danos (ex: trinca + linhas LCD), LISTE TODOS NA RESPOSTA.
Não reporte apenas um e ignore os outros!

EXEMPLOS DE RESPOSTAS CORRETAS:
✅ "Trincas no vidro + Linhas verticais no LCD - Dano duplo"
✅ "Múltiplas trincas nos cantos + Linha horizontal - Vidro e LCD danificados"
✅ "Quebra do vidro com linhas no LCD - Falha dupla de display"

EXEMPLOS DE RESPOSTAS INCORRETAS:
❌ "Apenas linhas no LCD" (se há também trinca)
❌ "Apenas trinca no vidro" (se há também linhas LCD)
❌ Mencionar um dano e ignorar outro

RESPONDA APENAS EM JSON (sem markdown):
{
  "status": "AVARIA",
  "categoria": "TELA/DISPLAY",
  "tipo_dano": "DESCREVA TODOS OS DANOS (ex: 'Trincas no vidro + Linhas no LCD')",
  "descricao": "Liste cada dano encontrado (ex: 'Múltiplas trincas visíveis + linhas verticais e horizontais no painel LCD')"
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
