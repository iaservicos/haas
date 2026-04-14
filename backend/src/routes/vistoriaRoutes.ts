import express, { Request, Response } from 'express';
import { salvarFoto, listarFotosPorConfirmacao } from '../services/fotoService';
import { analisarFotoGPTMaker } from '../services/gptmakerService';
import { supabase } from '../config/database';

const router = express.Router();

/**
 * POST /api/vistorias/upload-foto
 * Recebe foto, salva no banco e envia para GPTMaker
 */
router.post('/upload-foto', async (req: Request, res: Response) => {
  try {
    const { fotoBase64, fotoNome, confirmacaoId } = req.body;

    if (!fotoBase64 || !fotoNome || !confirmacaoId) {
      return res.status(400).json({
        error: 'Faltam parâmetros: fotoBase64, fotoNome, confirmacaoId',
      });
    }

    // 1. Salvar foto no banco
    const fotoBuffer = Buffer.from(fotoBase64, 'base64');
    const fotoData = {
      confirmacao_id: confirmacaoId,
      foto_data: fotoBase64,
      foto_nome: fotoNome,
      foto_tipo: 'image/jpeg',
      tamanho_bytes: fotoBuffer.length,
    };

    const { id: fotoId } = await salvarFoto(fotoData);
    console.log(`[Vistoria] Foto salva com ID: ${fotoId}`);

    // 2. Enviar para análise do GPTMaker
    const analise = await analisarFotoGPTMaker(fotoBase64, fotoNome, confirmacaoId);

    // 3. Atualizar confirmação com resultado da análise
    const { error: updateError } = await supabase
      .from('cliente_confirmacoes')
      .update({
        analise_gptmaker: analise.descricao,
        status_analise: analise.status,
        resultado_analise: analise.resultado,
      })
      .eq('id', confirmacaoId);

    if (updateError) {
      console.error('Erro ao atualizar confirmação:', updateError);
    }

    return res.status(200).json({
      success: true,
      fotoId,
      analise,
      message: 'Foto salva e analisada com sucesso',
    });
  } catch (error) {
    console.error('[Vistoria] Erro no upload:', error);
    return res.status(500).json({
      error: `Erro ao processar foto: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    });
  }
});

/**
 * GET /api/vistorias/confirmacao/:id
 * Retorna dados da confirmação com fotos
 */
router.get('/confirmacao/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Buscar confirmação
    const { data: confirmacao, error: confirmacaoError } = await supabase
      .from('cliente_confirmacoes')
      .select('*')
      .eq('id', id)
      .single();

    if (confirmacaoError || !confirmacao) {
      return res.status(404).json({ error: 'Confirmação não encontrada' });
    }

    // 2. Buscar fotos da confirmação
    const fotos = await listarFotosPorConfirmacao(id);

    return res.status(200).json({
      confirmacao,
      fotos,
    });
  } catch (error) {
    console.error('[Vistoria] Erro ao buscar confirmação:', error);
    return res.status(500).json({
      error: `Erro ao buscar confirmação: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    });
  }
});

/**
 * PUT /api/vistorias/confirmacao/:id
 * Atualiza checklist da confirmação
 */
router.put('/confirmacao/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fonte_presente, teclado_presente, mouse_presente, tipo_material } = req.body;

    // Validar campos obrigatórios
    if (fonte_presente === undefined) {
      return res.status(400).json({
        error: 'Campo obrigatório: fonte_presente',
      });
    }

    // Atualizar confirmação
    const { data, error } = await supabase
      .from('cliente_confirmacoes')
      .update({
        fonte_presente,
        teclado_presente: teclado_presente || false,
        mouse_presente: mouse_presente || false,
        tipo_material: tipo_material || 'genérico',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      confirmacao: data,
      message: 'Confirmação atualizada com sucesso',
    });
  } catch (error) {
    console.error('[Vistoria] Erro ao atualizar confirmação:', error);
    return res.status(500).json({
      error: `Erro ao atualizar confirmação: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    });
  }
});

export default router;
