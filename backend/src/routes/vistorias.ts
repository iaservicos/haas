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
 * Retorna todas as análises de fotos do portal
 */
router.get('/portal/listar', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('analises_fotos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[inspecao] Erro ao buscar análises:', error);
      return res.status(500).json({ error: 'Erro ao buscar análises' });
    }

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('[inspecao] Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar análises' });
  }
});

export default router;