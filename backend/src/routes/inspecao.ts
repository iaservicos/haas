import express, { Request, Response } from 'express';
import { supabase } from '../config/database.js';
import type { EquipmentType } from '../config/equipmentQuestions.js';
import { getQuestionsByEquipmentType } from '../config/equipmentQuestions.js';


const router = express.Router();

/**
 * GET /api/inspecao/perguntas/:equipmentType
 * Retorna as perguntas para um tipo de equipamento específico
 */
router.get('/perguntas/:equipmentType', async (req: Request, res: Response) => {
  try {
    const { equipmentType } = req.params;
    
    // Validar tipo de equipamento
    const validTypes = [
      'Desktop', 'Monitor', 'Notebook', 'MiniPro', 'All in One',
      'Duo', 'Tablet', 'Chromebook', 'Máquina de pagamento', 'Diversos', 'Celular'
    ];
    
    if (!validTypes.includes(equipmentType)) {
      return res.status(400).json({ 
        error: 'Tipo de equipamento inválido',
        validTypes 
      });
    }

    const questions = getQuestionsByEquipmentType(equipmentType as EquipmentType);

    
    res.json({
      equipmentType,
      questions,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error('Erro ao buscar perguntas:', error);
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

/**
 * POST /api/inspecao/salvar
 * Salva as respostas da inspeção
 */
router.post('/salvar', async (req: Request, res: Response) => {
  try {
    const { vistoriaId, equipmentType, answers, observacoes } = req.body;

    if (!vistoriaId || !equipmentType || !answers) {
      return res.status(400).json({ 
        error: 'Dados incompletos: vistoriaId, equipmentType e answers são obrigatórios' 
      });
    }

    // Salvar respostas no banco de dados
    const { data, error } = await supabase
      .from('inspecao_respostas')
      .insert({
        vistoria_id: vistoriaId,
        equipment_type: equipmentType,
        respostas: answers,
        observacoes: observacoes || null,
        data_inspecao: new Date().toISOString(),
      })
      .select();

    if (error) {
      console.error('Erro ao salvar respostas:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar respostas',
        details: error.message 
      });
    }

    // Atualizar status da vistoria
    await supabase
      .from('vistorias')
      .update({ status: 'inspecionada' })
      .eq('id', vistoriaId);

    res.json({
      success: true,
      message: 'Inspeção salva com sucesso',
      data: data[0],
    });
  } catch (error) {
    console.error('Erro ao salvar inspeção:', error);
    res.status(500).json({ 
      error: 'Erro ao salvar inspeção',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/inspecao/:vistoriaId
 * Retorna as respostas de uma inspeção específica
 */
router.get('/:vistoriaId', async (req: Request, res: Response) => {
  try {
    const { vistoriaId } = req.params;

    const { data, error } = await supabase
      .from('inspecao_respostas')
      .select('*')
      .eq('vistoria_id', vistoriaId)
      .single();

    if (error) {
      console.error('Erro ao buscar inspeção:', error);
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar inspeção:', error);
    res.status(500).json({ error: 'Erro ao buscar inspeção' });
  }
});

export default router;
