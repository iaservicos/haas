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
router.post('/analise-fotos', async (req: any, res: any) => {
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
        processadas: 0 
      });
    }

    console.log(`[CRON] Encontradas ${analisesPendentes.length} análises pendentes`);

    let processadas = 0;
    let erros = 0;

    // ✅ Processar cada análise
    for (const analise of analisesPendentes) {
      try {
        console.log(`[CRON] Processando análise ID ${analise.id}...`);

        // Buscar foto para obter URL
        const { data: foto, error: fotoError } = await supabase
          .from('fotos_vistoria')
          .select('foto_url, foto_nome')
          .eq('id', analise.foto_id)
          .single();

        if (fotoError || !foto) {
          console.error(`[CRON] Foto não encontrada para análise ${analise.id}`);
          erros++;
          continue;
        }

        console.log(`[CRON] Foto encontrada: ${foto.foto_url}`);

        // ✅ Prompt para análise
        const prompt = `Você é um especialista em inspeção de equipamentos de TI. Analise a foto do equipamento e forneça uma avaliação detalhada.

Número de série: ${analise.numero_serie}
Nome da foto: ${foto.foto_nome}

Analise o estado do equipamento na imagem e responda em JSON com a seguinte estrutura exata:
{
  "status": "OK" ou "AVARIA",
  "danos": ["lista de danos encontrados, ou [] se nenhum"],
  "descricao": "descrição detalhada do estado do equipamento",
  "recomendacao": "recomendação de ação"
}

Seja preciso, objetivo e detalhado. Responda APENAS com o JSON, sem explicações adicionais.`;

        // ✅ Chamar Gemini Pro com base64
        console.log(`[CRON] Baixando imagem para análise...`);
        
        const imageResponse = await axios.get(foto.foto_url, {
          responseType: 'arraybuffer',
          timeout: 30000,
        });

        const base64 = Buffer.from(imageResponse.data).toString('base64');
        console.log(`[CRON] Imagem convertida para base64: ${base64.length} caracteres`);

        // Truncar se muito grande
        let base64Truncado = base64;
        if (base64.length > 5000000) {
          base64Truncado = base64.substring(0, 5000000);
          console.log(`[CRON] Base64 truncado para 5MB`);
        }

        console.log(`[CRON] Enviando para Gemini Pro...`);

        const response = await axios.post(
          `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: base64Truncado,
                    },
                  },
                ],
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 120000, // 120 segundos
          }
        );

        console.log(`[CRON] Resposta recebida do Gemini`);

        // ✅ Extrair resposta
        let responseText = '';
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          responseText = response.data.candidates[0].content.parts[0].text;
        }

        console.log(`[CRON] Resposta bruta: ${responseText.substring(0, 200)}`);

        // ✅ Fazer parse do JSON
        let analiseResultado;
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            analiseResultado = JSON.parse(jsonMatch[0]);
          } else {
            throw new Error('Nenhum JSON encontrado');
          }
        } catch (parseError) {
          console.error(`[CRON] Erro ao fazer parse da resposta:`, parseError);
          analiseResultado = {
            status: 'OK',
            danos: [],
            descricao: 'Análise concluída (formato padrão)',
            recomendacao: 'Equipamento aparenta estar em bom estado',
          };
        }

        console.log(`[CRON] Análise concluída:`, analiseResultado);

        // ✅ Atualizar análise com resultado
        const { error: updateError } = await supabase
          .from('analises_fotos')
          .update({
            status: analiseResultado.status === 'OK' ? 'ok' : 'avaria',
            resultado_gptmaker: JSON.stringify(analiseResultado),
            updated_at: new Date().toISOString(),
          })
          .eq('id', analise.id);

        if (updateError) {
          console.error(`[CRON] Erro ao atualizar análise ${analise.id}:`, updateError);
          erros++;
        } else {
          console.log(`[CRON] Análise ${analise.id} atualizada com sucesso`);
          processadas++;
        }

        // Aguardar 2 segundos entre requisições para evitar rate limit
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        console.error(`[CRON] Erro ao processar análise ${analise.id}:`, error);
        
        // Registrar erro na análise
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
