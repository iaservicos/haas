import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { saveAnalisisFoto } from '../services/supabaseClient.js';

const router = Router();

const GPTMakerWebhookSchema = z.object({
  chatId: z.string().optional(),
  contextId: z.string().optional(),
  messageId: z.string().optional(),
  content: z.string(),
  role: z.string().optional(),
  metadata: z.object({
    vistoria_id: z.string().optional(),
    foto_id: z.number().optional(),
    numero_serie: z.string().optional(),
    prompt: z.string().optional(),
  }).optional(),
  timestamp: z.string().optional(),
});

type GPTMakerWebhookPayload = z.infer<typeof GPTMakerWebhookSchema>;

function extractContextData(contextId?: string): { confirmacaoId?: string } {
  if (!contextId) return {};
  const match = contextId.match(/vistoria-(.+)/);
  if (match) {
    return { confirmacaoId: match[1] };
  }
  return {};
}

function parseGPTMakerResponse(content: string): {
  status?: string;
  resultado?: string;
  descricao?: string;
  raw: string;
} {
  try {
    const parsed = JSON.parse(content);
    return {
      status: parsed.status,
      resultado: parsed.resultado,
      descricao: parsed.descricao,
      raw: content,
    };
  } catch {
    return {
      raw: content,
    };
  }
}

router.post('/gptmaker', async (req: Request, res: Response) => {
  try {
    console.log('[GPTMaker Webhook] Recebido:', JSON.stringify(req.body, null, 2));

    const payload = GPTMakerWebhookSchema.parse(req.body);
    const { confirmacaoId } = extractContextData(payload.contextId);
    const metadata = payload.metadata || {};
    const vistoriaId = metadata.vistoria_id;
    const fotoId = metadata.foto_id;
    const numeroSerie = metadata.numero_serie;
    const prompt = metadata.prompt;

    if (!fotoId) {
      return res.status(400).json({
        success: false,
        error: 'foto_id é obrigatório',
      });
    }

    const parsedResponse = parseGPTMakerResponse(payload.content);
    console.log('[GPTMaker Webhook] Resposta processada:', parsedResponse);

    const success = await saveAnalisisFoto({
      numero_serie: numeroSerie || 'desconhecido',
      foto_id: fotoId || 0,
      vistoria_id: vistoriaId || '',
      prompt_enviado: prompt,
      resultado_gptmaker: JSON.stringify(parsedResponse),
      status: 'concluído',
    });

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar análise no Supabase',
      });
    }

    res.json({
      success: true,
      message: 'Análise recebida e salva com sucesso',
      data: {
        fotoId,
        vistoriaId,
        numeroSerie,
      },
    });
  } catch (error) {
    console.error('[GPTMaker Webhook] Erro:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: error.issues,
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erro ao processar webhook',
      message: error instanceof Error ? error.message : 'Desconhecido',
    });
  }
});

router.post('/gptmaker/test', async (req: Request, res: Response) => {
  try {
    console.log('[GPTMaker Webhook Test] Recebido:', JSON.stringify(req.body, null, 2));

    res.json({
      success: true,
      message: 'Webhook de teste recebido com sucesso',
      receivedData: req.body,
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
