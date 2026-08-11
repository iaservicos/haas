import { Router, Request, Response } from 'express';
import { supabase } from '../config/database.js';

const router = Router();

/**
 * GET /api/vistorias
 * Listar todas as vistorias com paginação e filtros
 */
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

/**
 * GET /api/vistorias/stats
 * Retorna estatísticas das vistorias
 */
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

/**
 * GET /api/vistorias/:id
 * Retorna uma vistoria específica
 */
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

/**
 * POST /api/vistorias
 * Criar uma nova vistoria
 */
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

/**
 * GET /api/inspecao/portal/listar
 * Retorna todas as inspeções (respostas) do portal com dados relacionados
 */
router.get('/portal/listar', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('inspecao_respostas')
      .select(`
        *,
        contrato_equipamentos (
          id,
          numero_serie,
          tipo_material,
          modelo
        )
      `)
      .order('data_inspecao', { ascending: false });

    if (error) {
      console.error('[inspecao] Erro ao buscar inspeções do portal:', error);
      return res.status(500).json({ error: 'Erro ao buscar inspeções' });
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('[inspecao] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar inspeções' });
  }
});

/**
 * DELETE /api/vistorias/:id
 * Deleta uma vistoria do portal (inspecao_respostas e dados relacionados)
 * Cascata: analises_fotos -> fotos_vistoria -> inspecao_respostas
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`[vistorias] Iniciando exclusão de vistoria portal ID: ${id}`);

    // Passo 1: Buscar a inspeção para obter vistoria_id
    const { data: inspecao, error: inspecaoError } = await supabase
      .from('inspecao_respostas')
      .select('vistoria_id')
      .eq('id', id)
      .single();

    if (inspecaoError || !inspecao) {
      console.error('[vistorias] Vistoria não encontrada:', id);
      return res.status(404).json({
        error: 'Vistoria não encontrada'
      });
    }

    const vistoriaId = inspecao.vistoria_id;
    console.log(`[vistorias] Vistoria encontrada, vistoria_id: ${vistoriaId}`);

    // Passo 2: Buscar todas as fotos desta vistoria
    const { data: fotos, error: fotosError } = await supabase
      .from('fotos_vistoria')
      .select('id')
      .eq('vistoria_id', vistoriaId);

    console.log(`[vistorias] Fotos encontradas: ${fotos?.length || 0}`);

    // Passo 3: Deletar análises de fotos
    if (fotos && fotos.length > 0) {
      const fotoIds = fotos.map((f: any) => f.id);
      console.log(`[vistorias] Deletando análises de fotos...`);
      const { error: deleteAnalisesError } = await supabase
        .from('analises_fotos')
        .delete()
        .in('foto_id', fotoIds);

      if (deleteAnalisesError) {
        console.error('[vistorias] Erro ao deletar análises:', deleteAnalisesError);
      } else {
        console.log(`[vistorias] ✓ Análises deletadas`);
      }
    }

    // Passo 4: Deletar fotos
    console.log(`[vistorias] Deletando fotos...`);
    const { error: deleteFotosError } = await supabase
      .from('fotos_vistoria')
      .delete()
      .eq('vistoria_id', vistoriaId);

    if (deleteFotosError) {
      console.error('[vistorias] Erro ao deletar fotos:', deleteFotosError);
    } else {
      console.log(`[vistorias] ✓ Fotos deletadas`);
    }

    // Passo 5: Deletar respostas da inspeção
    console.log(`[vistorias] Deletando respostas de inspeção...`);
    const { error: deleteRespostasError } = await supabase
      .from('inspecao_respostas')
      .delete()
      .eq('id', id);

    if (deleteRespostasError) {
      console.error('[vistorias] Erro ao deletar inspecao_respostas:', deleteRespostasError);
      return res.status(500).json({
        error: 'Erro ao deletar vistoria',
        details: deleteRespostasError.message
      });
    }

    console.log(`[vistorias] ✅ Vistoria do portal ${id} (vistoria_id: ${vistoriaId}) deletada com sucesso`);

    res.json({
      success: true,
      message: 'Vistoria deletada com sucesso'
    });
  } catch (error) {
    console.error('[vistorias] Erro ao deletar vistoria:', error);
    res.status(500).json({
      error: 'Erro ao deletar vistoria',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;