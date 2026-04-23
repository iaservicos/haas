import { Router, Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { salvarFoto, listarFotosPorConfirmacao } from '../services/fotoService.js';
import { analisarFotoGPTMaker } from '../services/gptmakerService.js';


const router = Router( );


router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, tecnico, estado, teclado, mouse } = req.query;

    let query = supabase.from('vistorias').select('*');

    if (tecnico) {
      query = query.ilike('tecnico', `%${tecnico}%`);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (teclado) {
      query = query.eq('teclado_status', teclado);
    }

    if (mouse) {
      query = query.eq('mouse_status', mouse);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { data, error } = await query
      .order('data_vistoria', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    res.json({
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: data.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar vistorias' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { data: vistorias, error } = await supabase
      .from('vistorias')
      .select('*');

    if (error) throw error;

    const stats = {
      total: vistorias.length,
      comAvaria: vistorias.filter((v: any) => v.estado === 'Equip. com AVARIA').length,
      semAvaria: vistorias.filter((v: any) => v.estado === 'Equipamento OK').length,
      mouseOk: vistorias.filter((v: any) => v.mouse_status === 'OK').length,
      mouseAusente: vistorias.filter((v: any) => v.mouse_status === 'AUSENTE').length,
      tecladoOk: vistorias.filter((v: any) => v.teclado_status === 'OK').length,
      tecladoAusente: vistorias.filter((v: any) => v.teclado_status === 'AUSENTE').length,
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('vistorias')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar vistoria' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { data_vistoria, tecnico, email_tecnico, cliente, numero_serie, equipamento, estado, teclado_status, mouse_status, laudo } = req.body;

    const { data, error } = await supabase
      .from('vistorias')
      .insert([
        {
          data_vistoria,
          tecnico,
          email_tecnico,
          cliente,
          numero_serie,
          equipamento,
          estado,
          teclado_status,
          mouse_status,
          laudo,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar vistoria' });
  }
});

// ===== ROTAS NOVAS PARA FOTOS E GPTMAKER =====

/**
 * POST /api/vistoria/upload-foto
 * Recebe foto, salva no banco e envia para GPTMaker
 */
router.post('/upload-foto', async (req: Request, res: Response) => {
  try {
    const { fotoBase64, fotoNome, confirmacaoId, numeroSerie, equipmentType, nomeCliente } = req.body;

    if (!fotoBase64 || !fotoNome || !confirmacaoId) {
      return res.status(400).json({
        error: 'Faltam parâmetros: fotoBase64, fotoNome, confirmacaoId',
      });
    }

    console.log(`[Vistoria] Upload de foto para serial: ${numeroSerie}, tipo: ${equipmentType}, cliente: ${nomeCliente}`);

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

    // 2. Enviar para análise do GPTMaker com contexto do equipamento
    const analise = await analisarFotoGPTMaker(fotoBase64, fotoNome, confirmacaoId, numeroSerie, equipmentType, nomeCliente);

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
 * GET /api/vistoria/confirmacao/:id
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
 * PUT /api/vistoria/confirmacao/:id
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