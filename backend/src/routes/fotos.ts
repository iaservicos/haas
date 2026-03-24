import { Router, Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/vistoria/:vistoriaId', async (req: Request, res: Response) => {
  try {
    const { vistoriaId } = req.params;

    const { data, error } = await supabase
      .from('fotos')
      .select('*')
      .eq('vistoria_id', vistoriaId)
      .order('data_criacao', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fotos' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { tipo, page = 1, limit = 20 } = req.query;

    let query = supabase.from('fotos').select('*');

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { data, error } = await query
      .order('data_criacao', { ascending: false })
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
    res.status(500).json({ error: 'Erro ao buscar fotos' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const fotoData = req.body;

    const { data, error } = await supabase
      .from('fotos')
      .insert([fotoData])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar foto' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('fotos')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Foto deletada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar foto' });
  }
});

export default router;
