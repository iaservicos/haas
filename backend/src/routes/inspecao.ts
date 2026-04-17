import express from 'express';
import type { EquipmentType } from '../config/equipmentQuestions.js';
import { supabase } from '../config/database.js';
import { getQuestionsByEquipmentType } from '../config/equipmentQuestions.js';

const router = express.Router();

/**
 * GET /api/inspecao/equipamento/:equipamentoId
 * Retorna o tipo de equipamento pelo ID
 */
router.get('/equipamento/:equipamentoId', async (req, res) => {
  try {
    const { equipamentoId } = req.params;

    const { data, error } = await supabase
      .from('contrato_equipamentos')
      .select('tipo_material, numero_serie, modelo')
      .eq('id', equipamentoId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json({
      success: true,
      data: {
        id: equipamentoId,
        tipo_material: data.tipo_material,
        numero_serie: data.numero_serie,
        modelo: data.modelo,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar equipamento:', error);
    res.status(500).json({ error: 'Erro ao buscar equipamento' });
  }
});

/**
 * GET /api/inspecao/perguntas/:equipmentType
 * Retorna as perguntas para um tipo de equipamento específico
 */
router.get('/perguntas/:equipmentType', async (req, res) => {
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
 * Salva as respostas da inspeção com equipamento_id
 */
router.post('/salvar', async (req, res) => {
  try {
    const { vistoriaId, equipmentType, answers, observacoes, equipamento_id } = req.body;

    if (!vistoriaId || !equipmentType || !answers) {
      return res.status(400).json({ 
        error: 'Dados incompletos: vistoriaId, equipmentType e answers são obrigatórios' 
      });
    }

    // Construir objeto de inserção
    const insertData: any = {
      vistoria_id: vistoriaId,
      equipment_type: equipmentType,
      respostas: answers,
      observacoes: observacoes || null,
      data_inspecao: new Date().toISOString(),
    };

    // Adicionar equipamento_id se fornecido
    if (equipamento_id) {
      insertData.equipamento_id = equipamento_id;
      console.log(`[inspecao.ts] Salvando inspeção com equipamento_id: ${equipamento_id}`);
    }

    // Salvar respostas no banco de dados
    const { data, error } = await supabase
      .from('inspecao_respostas')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Erro ao salvar respostas:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar respostas',
        details: error.message 
      });
    }

    console.log('[inspecao.ts] Inspeção salva com sucesso:', data[0]);

    // Atualizar status da vistoria (se existir)
    try {
      await supabase
        .from('vistorias')
        .update({ status: 'inspecionada' })
        .eq('id', vistoriaId);
    } catch (updateError) {
      // Não falhar se a vistoria não existir (pode ser uma inspeção do portal)
      console.log('[inspecao.ts] Aviso: Não foi possível atualizar status da vistoria', updateError);
    }

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
router.get('/:vistoriaId', async (req, res) => {
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

/**
 * GET /api/inspecao/portal/listar
 * Retorna todas as inspeções do portal com dados de equipamento e contrato
 */
router.get('/portal/listar', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('inspecao_respostas')
      .select(`
        id,
        vistoria_id,
        equipamento_id,
        equipment_type,
        respostas,
        observacoes,
        data_inspecao,
        contrato_equipamentos:equipamento_id (
          id,
          numero_serie,
          modelo,
          tipo_material,
          contrato_id,
          contratos:contrato_id (
            id,
            numero_contrato,
            cliente_id
          )
        )
      `)
      .order('data_inspecao', { ascending: false });

    if (error) {
      console.error('Erro ao listar inspeções do portal:', error);
      return res.status(500).json({ 
        error: 'Erro ao listar inspeções',
        details: error.message 
      });
    }

    res.json({
      success: true,
      data: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Erro ao listar inspeções do portal:', error);
    res.status(500).json({ 
      error: 'Erro ao listar inspeções',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/inspecao/portal/equipamento/:equipamentoId
 * Retorna todas as inspeções para um equipamento específico
 */
router.get('/portal/equipamento/:equipamentoId', async (req, res) => {
  try {
    const { equipamentoId } = req.params;

    const { data, error } = await supabase
      .from('inspecao_respostas')
      .select(`
        id,
        vistoria_id,
        equipamento_id,
        equipment_type,
        respostas,
        observacoes,
        data_inspecao,
        contrato_equipamentos:equipamento_id (
          id,
          numero_serie,
          modelo,
          tipo_material,
          contrato_id,
          contratos:contrato_id (
            id,
            numero_contrato,
            cliente_id
          )
        )
      `)
      .eq('equipamento_id', equipamentoId)
      .order('data_inspecao', { ascending: false });

    if (error) {
      console.error('Erro ao buscar inspeções do equipamento:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar inspeções',
        details: error.message 
      });
    }

    res.json({
      success: true,
      data: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Erro ao buscar inspeções do equipamento:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar inspeções',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
