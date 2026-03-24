import { Router, Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.use(authMiddleware);

router.get('/vistoria/:vistoriaId', async (req: Request, res: Response) => {
  try {
    const { vistoriaId } = req.params;

    const { data, error } = await supabase
      .from('componentes')
      .select('*')
      .eq('vistoria_id', vistoriaId);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar componentes' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const componenteData = req.body;

    const { data, error } = await supabase
      .from('componentes')
      .insert([componenteData])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar componente' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const { data, error } = await supabase
      .from('componentes')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar componente' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('componentes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Componente deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao deletar componente' });
  }
});

export default router;
