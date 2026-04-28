import { Router, Request, Response } from 'express';

const router = Router();

/**
 * POST /api/webhooks/gptmaker
 * Webhook para receber análises do GPTMaker
 * Salva diretamente no Supabase via REST API (sem importar cliente)
 */
router.post('/gptmaker', async (req: Request, res: Response) => {
  try {
    const { content, metadata } = req.body;

    // Validar dados obrigatórios
    if (!content || !metadata?.foto_id) {
      return res.status(400).json({
        success: false,
        error: 'Faltam dados obrigatórios: content e metadata.foto_id',
      });
    }

    const { foto_id, vistoria_id, numero_serie, prompt } = metadata;

    console.log('[GPTMaker Webhook] Recebido:', {
      foto_id,
      vistoria_id,
      numero_serie,
    });

    // Pegar credenciais do ambiente
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[GPTMaker Webhook] ⚠️ Supabase não configurado, salvando em log apenas');
      
      // Apenas registrar em log se Supabase não estiver configurado
      console.log('[GPTMaker Webhook] Dados recebidos:', {
        foto_id,
        vistoria_id,
        numero_serie,
        content,
      });

      return res.json({
        success: true,
        message: 'Webhook recebido (Supabase não configurado)',
        data: { foto_id, vistoria_id, numero_serie },
      });
    }

    // Preparar dados para salvar
    const analysisData = {
      numero_serie: numero_serie || 'desconhecido',
      foto_id: foto_id,
      vistoria_id: vistoria_id || '',
      prompt_enviado: prompt || null,
      resultado_gptmaker: content,
      status: 'concluído',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Fazer requisição para Supabase REST API
    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/analises_fotos`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(analysisData),
      }
    );

    if (!supabaseResponse.ok) {
      const error = await supabaseResponse.text();
      console.error('[GPTMaker Webhook] ❌ Erro ao salvar no Supabase:', error);
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar análise',
        details: error,
      });
    }

    console.log('[GPTMaker Webhook] ✅ Análise salva com sucesso');

    res.json({
      success: true,
      message: 'Análise recebida e salva com sucesso',
      data: {
        foto_id,
        vistoria_id,
        numero_serie,
      },
    });
  } catch (error) {
    console.error('[GPTMaker Webhook] ❌ Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar webhook',
      message: error instanceof Error ? error.message : 'Desconhecido',
    });
  }
});

/**
 * POST /api/webhooks/gptmaker/test
 * Endpoint de teste para validar webhook
 */
router.post('/gptmaker/test', async (req: Request, res: Response) => {
  try {
    console.log('[GPTMaker Webhook Test] Recebido:', JSON.stringify(req.body, null, 2));

    res.json({
      success: true,
      message: 'Webhook de teste recebido com sucesso',
      receivedData: req.body,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GPTMaker Webhook Test] Erro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao processar teste',
    });
  }
});

export default router;
