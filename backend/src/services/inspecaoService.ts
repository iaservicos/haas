import { supabase } from '../config/database.js';
import { getQuestionsByEquipmentType, EquipmentType } from '../config/equipmentQuestions.js';

export interface SalvarInspecaoDTO {
  vistoriaId: string;
  equipmentType: string;
  answers: any;
  observacoes?: string;
  equipamento_id?: number;
}

export class InspecaoService {
  /**
   * Retorna as perguntas para um tipo de equipamento
   */
  getQuestionsByEquipmentType(equipmentType: string) {
    const validTypes = [
      'Desktop', 'Monitor', 'Notebook', 'MiniPro', 'All in One',
      'Duo', 'Tablet', 'Chromebook', 'Máquina de pagamento', 'Diversos', 'Celular'
    ];

    if (!validTypes.includes(equipmentType)) {
      throw new Error('Tipo de equipamento inválido');
    }

    const questions = getQuestionsByEquipmentType(equipmentType as EquipmentType);
    return {
      equipmentType,
      questions,
      totalQuestions: questions.length,
    };
  }

  /**
   * Busca dados de equipamento
   */
  async buscarEquipamento(equipamentoId: string) {
    const { data, error } = await supabase
      .from('contrato_equipamentos')
      .select('tipo_material, numero_serie, modelo')
      .eq('id', equipamentoId)
      .single();

    if (error || !data) {
      throw new Error('Equipamento não encontrado');
    }

    return {
      id: equipamentoId,
      tipo_material: data.tipo_material,
      numero_serie: data.numero_serie,
      modelo: data.modelo,
    };
  }

  /**
   * Salva respostas da inspeção
   */
  async salvarRespostas(dto: SalvarInspecaoDTO) {
    const insertData: any = {
      vistoria_id: dto.vistoriaId,
      equipment_type: dto.equipmentType,
      respostas: dto.answers,
      observacoes: dto.observacoes || null,
      data_inspecao: new Date().toISOString(),
    };

    if (dto.equipamento_id) {
      insertData.equipamento_id = dto.equipamento_id;
      console.log(`[InspecaoService] Salvando inspeção com equipamento_id: ${dto.equipamento_id}`);
    }

    const { data, error } = await supabase
      .from('inspecao_respostas')
      .insert(insertData)
      .select();

    if (error) {
      console.error('[InspecaoService] Erro ao salvar respostas:', error);
      throw new Error('Erro ao salvar respostas');
    }

    console.log('[InspecaoService] Inspeção salva com sucesso:', data[0]);

    // Atualizar status da vistoria (non-blocking)
    try {
      await supabase
        .from('vistorias')
        .update({ status: 'inspecionada' })
        .eq('id', dto.vistoriaId);
    } catch (updateError) {
      console.log('[InspecaoService] Aviso: Não foi possível atualizar status da vistoria', updateError);
    }

    return data[0];
  }

  /**
   * Busca respostas de uma inspeção
   */
  async buscarRespostas(vistoriaId: string) {
    const { data, error } = await supabase
      .from('inspecao_respostas')
      .select('*')
      .eq('vistoria_id', vistoriaId)
      .single();

    if (error) {
      console.error('[InspecaoService] Erro ao buscar inspeção:', error);
      throw new Error('Inspeção não encontrada');
    }

    return data;
  }
}

export default new InspecaoService();
