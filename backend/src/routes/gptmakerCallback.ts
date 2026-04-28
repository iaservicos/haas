import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /api/gptmaker/callback
 * Webhook para receber resposta do GPTMaker
 */
router.post('/callback', async (req: Request, res: Response) => {
  try {
    const { contextId, message, images } = req.body;

    console.log('[GPTMaker Callback] Recebido:', {
      contextId,
      message,
      images,
    });

    if (!contextId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Faltam dados obrigatórios: contextId e message',
      });
    }

    // Extrair dados do contextId (formato: vistoria-{id})
    const vistoriaId = contextId.replace('vistoria-', '');

    // Tentar fazer parse da resposta JSON do GPTMaker
    let analysisResult = {
      status: 'PENDENTE',
      danos: [],
      descricao: message,
      recomendacao: '',
    };

    try {
      const jsonMatch = message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.warn('[GPTMaker Callback] ⚠️ Não foi possível fazer parse do JSON');
    }

    // Salvar no Supabase via REST API
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[GPTMaker Callback] ⚠️ Supabase não configurado, apenas logando');
      console.log('[GPTMaker Callback] Dados que seriam salvos:', {
        vistoriaId,
        analysisResult,
      });

      return res.json({
        success: true,
        message: 'Análise recebida (Supabase não configurado)',
        data: { vistoriaId, status: analysisResult.status },
      });
    }

    // Fazer requisição para Supabase REST API
    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/analises_fotos?vistoria_id=eq.${vistoriaId}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          resultado_gptmaker: JSON.stringify(analysisResult),
          status: 'concluído',
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('[GPTMaker Callback] ❌ Erro ao salvar no Supabase:', error);

      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar análise',
        details: error,
      });
    }

    console.log('[GPTMaker Callback] ✅ Análise salva com sucesso');

    res.json({
      success: true,
      message: 'Análise recebida e salva com sucesso',
      data: {
        vistoriaId,
        status: analysisResult.status,
      },
    });
  } catch (error) {
    console.error('[GPTMaker Callback] ❌ Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar callback',
      message: error instanceof Error ? error.message : 'Desconhecido',
    });
  }
});

export default router;
