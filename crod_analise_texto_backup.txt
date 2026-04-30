import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// ✅ Configuração de retry com backoff exponencial
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000; // 2 segundos
const MAX_RETRY_DELAY = 30000; // 30 segundos

/**
 * Função para calcular delay com backoff exponencial
 * Tentativa 1: 2s, Tentativa 2: 4s, Tentativa 3: 8s
 */
function getRetryDelay(attempt: number): number {
  const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
  return Math.min(delay, MAX_RETRY_DELAY);
}

/**
 * Função para verificar se o erro é retentável
 */
function isRetryableError(error: any): boolean {
  if (error.response?.status === 503) return true; // Service Unavailable
  if (error.response?.status === 429) return true; // Too Many Requests
  if (error.response?.status === 500) return true; // Internal Server Error
  if (error.code === 'ECONNRESET') return true; // Connection reset
  if (error.code === 'ETIMEDOUT') return true; // Timeout
  if (error.code === 'ENOTFOUND') return true; // DNS error
  return false;
}

/**
 * Função para fazer requisição com retry automático
 */
async function makeGeminiRequestWithRetry(
  url: string,
  data: any,
  analysisId: number
): Promise<any> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[CRON] Tentativa ${attempt}/${MAX_RETRIES} para análise ${analysisId}...`);
      
      const response = await axios.post(url, data, {
        timeout: 120000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`[CRON] ✅ Sucesso na tentativa ${attempt}`);
      return response;
      
    } catch (error: any) {
      lastError = error;
      const status = error.response?.status || 'N/A';
      const message = error.message || 'Erro desconhecido';
      
      console.log(`[CRON] ❌ Tentativa ${attempt} falhou (Status: ${status}, Erro: ${message})`);
      
      // Se não é retentável ou é a última tentativa, lançar erro
      if (!isRetryableError(error) || attempt === MAX_RETRIES) {
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

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

const router = express.Router();

// ✅ Configuração do Gemini Pro
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * ✅ POST /api/cron/analise-fotos
 * Cron job que roda a cada 1 minuto
 * Processa análises pendentes com Gemini Pro
 * PROMPT ASSERTIVO COM CATEGORIAS ESPECÍFICAS
 * COM RETRY AUTOMÁTICO E BACKOFF EXPONENCIAL
 */
router.post('/analise-fotos', async (req: any, res: any  ) => {
  try {
    console.log('[CRON] Iniciando processamento de análises pendentes...');

    if (!GEMINI_API_KEY) {
      console.error('[CRON] GEMINI_API_KEY não configurada');
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada' });
    }

    // ✅ Buscar análises com status "pendente"
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

        // ✅ Buscar foto associada
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

        // ✅ Baixar imagem
        console.log('[CRON] Baixando imagem para análise...');
        const imageResponse = await axios.get(foto.foto_url, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        // ✅ Converter para base64
        const base64 = Buffer.from(imageResponse.data).toString('base64');
        console.log(`[CRON] Imagem convertida para base64: ${base64.length} caracteres`);

        // ✅ Truncar base64 se muito grande (máximo 4MB)
        let base64Truncado = base64;
        if (base64.length > 4000000) {
          base64Truncado = base64.substring(0, 4000000);
          console.log(`[CRON] Base64 truncado para 4MB`);
        }

        // ✅ Detectar mime type correto baseado na extensão do arquivo
        const fileName = foto.foto_url.split('/').pop() || '';
        const extension = fileName.split('.').pop()?.toLowerCase() || 'png';
        const mimeType = extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/png';
        
        console.log(`[CRON] Usando mime type: ${mimeType}`);

        // ✅ Enviar para Gemini Pro COM RETRY AUTOMÁTICO
        console.log('[CRON] Enviando para Gemini Pro com retry automático...');

        const geminiResponse = await makeGeminiRequestWithRetry(
          `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: `Você é um especialista em inspeção de equipamentos de TI da Positivo Tecnologia. Analise a foto do equipamento e identifique danos ESPECÍFICOS e ASSERTIVOS.

Número de série: ${analise.numero_serie || 'N/A'}
Nome da foto: ${fileName}

CATEGORIAS DE AVARIAS ACEITAS (use EXATAMENTE como está):

TELA/DISPLAY:
- Trincas (pequenas, médias, grandes)
- Quebras (vidro quebrado)
- Manchas (pixel morto, mancha de tinta)
- Desbotamento
- Linhas horizontais/verticais
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

INSTRUÇÕES:
1. Se o equipamento está OK (sem danos visíveis), retorne status="OK" e deixe categoria e tipo_dano vazios
2. Se houver dano, identifique a CATEGORIA e o TIPO_DANO específico
3. A descrição deve ser RESUMIDA em 1 linhas máximo
4. Seja ASSERTIVO e ESPECÍFICO

Responda em JSON com EXATAMENTE esta estrutura:
{
  "status": "OK" ou "AVARIA",
  "categoria": "TELA/DISPLAY" ou "CARCAÇA" ou "TECLADO" ou "TOUCHPAD" ou "CONECTORES" ou "BATERIA" ou "OUTROS" (vazio se OK),
  "tipo_dano": "tipo específico encontrado" (ex: "Trincas", "Quebras", "Amassados") (vazio se OK),
  "descricao": "descrição resumida em 1 linhas",  
}

Responda APENAS com o JSON, sem explicações adicionais.`,
                  },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Truncado,
                    },
                  },
                ],
              },
            ],
          },
          analise.id
        );

        // ✅ Extrair resposta do Gemini
        const geminiContent = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!geminiContent) {
          console.error(`[CRON] Resposta vazia do Gemini para análise ${analise.id}`);
          erros++;
          continue;
        }

        console.log(`[CRON] Resposta recebida do Gemini: ${geminiContent.substring(0, 100)}...`);

        // ✅ Fazer parse do JSON
        let resultado;
        try {
          // ✅ Remover blocos de código markdown se existirem
          let jsonContent = geminiContent;
          if (geminiContent.includes('```')) {
            console.log('[CRON] Removendo blocos de código markdown da resposta...');
            jsonContent = geminiContent.replace(/```json\n?/g, '').replace(/```/g, '').trim();
          }
          
          resultado = JSON.parse(jsonContent);
        } catch (parseError) {
          console.error(`[CRON] Erro ao fazer parse da resposta JSON:`, parseError);
          console.error(`[CRON] Conteúdo bruto:`, geminiContent);
          erros++;
          continue;
        }

        // ✅ Atualizar análise com resultado
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

        console.log(`[CRON] Análise ${analise.id} processada com sucesso!`);
        processadas++;

      } catch (error: any) {
        const status = error.response?.status || 'N/A';
        const message = error.message || 'Erro desconhecido';
        console.error(`[CRON] ❌ Erro ao processar análise ${analise.id} (Status: ${status}): ${message}`);

        // ✅ Registrar erro na análise
        try {
          await supabase
            .from('analises_fotos')
            .update({
              status: 'erro',
              resultado_gptmaker: JSON.stringify({
                status: 'ERRO',
                erro: message,
                status_code: status,
                categoria: '',
                tipo_dano: '',
                descricao: 'Erro ao processar análise após 3 tentativas',
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

    console.log(`[CRON] ✅ Processamento concluído: ${processadas} processadas, ${erros} erros`);

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
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
