import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { saveAnalisisFoto, updateAnalisisFoto } from '../services/supabaseClient';

const router = Router();

/**
 * Schema para validar webhook do GPTMaker
 * Quando o GPTMaker termina uma análise, envia um webhook com a resposta
 */
const GPTMakerWebhookSchema = z.object({
  // Dados da conversa
  chatId: z.string().optional(),
  contextId: z.string().optional(), // ex: "vistoria-{confirmacaoId}"
  
  // Dados da mensagem (resposta do GPTMaker)
  messageId: z.string().optional(),
  content: z.string(), // Resposta da análise (JSON ou texto)
  role: z.string().optional(), // "assistant"
  
  // Metadados
  metadata: z.object({
    vistoria_id: z.string().optional(),
    foto_id: z.number().optional(),
    numero_serie: z.string().optional(),
    prompt: z.string().optional(),
  }).optional(),
  
  // Timestamp
  timestamp: z.string().optional(),
});

type GPTMakerWebhookPayload = z.infer<typeof GPTMakerWebhookSchema>;

/**
 * Extrai dados do contextId
 * Formato esperado: "vistoria-{confirmacaoId}"
 */
function extractContextData(contextId?: string): { confirmacaoId?: string } {
  if (!contextId) return {};
  
  const match = contextId.match(/vistoria-(.+)/);
  if (match) {
    return { confirmacaoId: match[1] };
  }
  
  return {};
}

/**
 * Processa resposta do GPTMaker
 * Tenta fazer parse como JSON, se falhar trata como texto
 */
function parseGPTMakerResponse(content: string): {
  status?: string;
  resultado?: string;
  descricao?: string;
  raw: string;
} {
  try {
    // Tenta fazer parse como JSON
    const parsed = JSON.parse(content);
    return {
      status: parsed.status,
      resultado: parsed.resultado,
      descricao: parsed.descricao,
      raw: content,
    };
  } catch {
    // Se não for JSON, retorna como texto
    return {
      raw: content,
    };
  }
}

/**
 * POST /api/webhooks/gptmaker
 * Recebe análises do GPTMaker
 */
router.post('/gptmaker', async (req: Request, res: Response) => {
  try {
    console.log('[GPTMaker Webhook] Recebido:', JSON.stringify(req.body, null, 2));

    // Validar payload
    const payload = GPTMakerWebhookSchema.parse(req.body);

    // Extrair dados do contextId
    const { confirmacaoId } = extractContextData(payload.contextId);

    // Extrair metadados
    const metadata = payload.metadata || {};
    const vistoriaId = metadata.vistoria_id;
    const fotoId = metadata.foto_id;
    const numeroSerie = metadata.numero_serie;
    const prompt = metadata.prompt;

    if (!vistoriaId || !fotoId || !numeroSerie) {
      console.warn('[GPTMaker Webhook] Metadados incompletos:', {
        vistoriaId,
        fotoId,
        numeroSerie,
      });

      // Mesmo assim, tenta salvar com os dados disponíveis
      if (!fotoId) {
        return res.status(400).json({
          success: false,
          error: 'foto_id é obrigatório',
        });
      }
    }

    // Processar resposta do GPTMaker
    const parsedResponse = parseGPTMakerResponse(payload.content);

    console.log('[GPTMaker Webhook] Resposta processada:', parsedResponse);

    // Salvar análise no Supabase
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

    // Responder com sucesso
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
