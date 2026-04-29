import express from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

const router = express.Router();

// ✅ Configuração do Gemini Pro
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * ✅ POST /api/cron/analise-fotos
 * Cron job que roda a cada 1 minuto
 * Processa análises pendentes com Gemini Pro
 */
router.post('/analise-fotos', async (req: any, res: any ) => {
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
      .limit(5); // Processar no máximo 5 por vez para evitar timeout

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

        // ✅ Enviar para Gemini Pro
        console.log('[CRON] Enviando para Gemini Pro...');
        const geminiResponse = await axios.post(
          `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: `Você é um especialista em inspeção de equipamentos de TI. Analise a foto do equipamento e forneça uma avaliação detalhada.\n\nNúmero de série: ${analise.numero_serie || 'N/A'}\nNome da foto: ${fileName}\n\nAnalise o estado do equipamento na imagem e responda em JSON com a seguinte estrutura exata:\n{\n  "status": "OK" ou "AVARIA",\n  "danos": ["lista de danos encontrados, ou [] se nenhum"],\n  "descricao": "descrição detalhada do estado do equipamento",\n  "recomendacao": "recomendação de ação"\n}\n\nSeja preciso, objetivo e detalhado. Responda APENAS com o JSON, sem explicações adicionais.`,
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
          {
            timeout: 120000,
            headers: {
              'Content-Type': 'application/json',
            },
          }
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
          resultado = JSON.parse(geminiContent);
        } catch (parseError) {
          console.error(`[CRON] Erro ao fazer parse da resposta JSON:`, parseError);
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

      } catch (error) {
        console.error(`[CRON] Erro ao processar análise ${analise.id}:`, error);

        // ✅ Registrar erro na análise
        try {
          await supabase
            .from('analises_fotos')
            .update({
              status: 'erro',
              resultado_gptmaker: JSON.stringify({
                status: 'ERRO',
                erro: error instanceof Error ? error.message : 'Erro desconhecido',
                danos: [],
                descricao: 'Erro ao processar análise',
                recomendacao: 'Tente novamente',
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

  } catch (error) {
    console.error('[CRON] Erro geral:', error);
    res.status(500).json({
      error: 'Erro ao processar cron job',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
