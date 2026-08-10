import express from 'express';
import { createClient } from '@supabase/supabase-js';
import ClaudeAnalysisService from '../services/claudeAnalysisService.js';
import { env } from '../config/env.js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_KEY || ''
);

const analysisService = new ClaudeAnalysisService(env.ANTHROPIC_API_KEY);
const router = express.Router();


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

        // Analisar com Claude (download + análise)
        console.log('[CRON] Enviando para Claude (tentará múltiplos modelos se necessário)...');
        const resultado = await analysisService.analyzeImageFromUrl(
          foto.foto_url,
          analise.numero_serie
        );

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
