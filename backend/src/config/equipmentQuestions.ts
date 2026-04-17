/**
 * Estrutura de perguntas dinâmicas para cada tipo de equipamento
 * Cada pergunta tem um ID único, texto, tipo de resposta e observações
 */

export type EquipmentType = 
  | 'Armário de Recarga'
  | 'Notebook'
  | 'Smartphone'
  | 'Nobreak'
  | 'All in One'
  | 'Desktop'
  | 'Tablet'
  | 'Chromebook'
  | 'Máquina de pagamento'
  | 'Diversos'
  | 'Celular';

export interface Question {
  id: string;
  text: string;
  type: 'yes_no' | 'text' | 'select';
  options?: string[];
  required: boolean;
}

export interface EquipmentQuestions {
  equipmentType: EquipmentType;
  questions: Question[];
}

/**
 * Perguntas genéricas para cada tipo de equipamento
 * Baseado em conhecimento de RPA e inspeção técnica
 */
export const equipmentQuestionsMap: Record<EquipmentType, Question[]> = {
  'Armário de Recarga': [
    {
      id: 'recarga_portas',
      text: 'Portas e Trincas - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'recarga_rodizios',
      text: 'Rodízios/Pés - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'recarga_cabos',
      text: 'Cabos de energia internos - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'recarga_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'recarga_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'recarga_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Notebook': [
    {
      id: 'notebook_tela',
      text: 'Tela (Manchas/Trincas) - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_teclado',
      text: 'Teclado (Teclas faltando) - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_carregador',
      text: 'Carregador Original - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'notebook_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Smartphone': [
    {
      id: 'smartphone_tela',
      text: 'Tela/Display - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'smartphone_bateria',
      text: 'Saúde da Bateria (%) - Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'smartphone_acessorios',
      text: 'Acessórios (Capa/Película) - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'smartphone_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'smartphone_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'smartphone_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Nobreak': [
    {
      id: 'nobreak_cabo',
      text: 'Cabo de Força - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'nobreak_bateria',
      text: 'Teste de Autonomia (Bateria) - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'nobreak_ruido',
      text: 'Ruído Excessivo - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'nobreak_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'nobreak_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'nobreak_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'All in One': [
    {
      id: 'allinone_painel',
      text: 'Painel Traseiro (Portas) - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_perifericos',
      text: 'Periféricos (Mouse/Teclado) - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_suporte',
      text: 'Suporte/Base - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'allinone_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Desktop': [
    {
      id: 'desktop_lacres',
      text: 'Lacres de Garantia - Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_cabos',
      text: 'Cabos (Vídeo/Energia) - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'desktop_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Tablet': [
    {
      id: 'tablet_sensibilidade',
      text: 'Sensibilidade do Touch - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_adaptador',
      text: 'Adaptador energia - Sim',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'tablet_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Chromebook': [
    {
      id: 'chromebook_tela',
      text: 'Tela (Manchas/Trincas) - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_teclado',
      text: 'Teclado (Teclas faltando) - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_carregador',
      text: 'Carregador Original - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'chromebook_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Máquina de pagamento': [
    {
      id: 'pagamento_tela',
      text: 'Tela - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_botoes',
      text: 'Botões - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_leitor',
      text: 'Leitor de Cartão - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'pagamento_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Diversos': [
    {
      id: 'diversos_descricao',
      text: 'Descrição do Equipamento',
      type: 'text',
      required: true,
    },
    {
      id: 'diversos_funcionamento',
      text: 'Equipamento funcionando?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'diversos_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'diversos_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'diversos_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Celular': [
    {
      id: 'celular_tela',
      text: 'Tela/Display - Sim/Não + Foto',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_bateria',
      text: 'Saúde da Bateria (%) - Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_acessorios',
      text: 'Acessórios (Capa/Película) - Sim/Não',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_capa',
      text: 'Capa/Película',
      type: 'select',
      options: ['Sim', 'Não', 'Não possui'],
      required: true,
    },
    {
      id: 'celular_danos',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
};

/**
 * Retorna as perguntas para um tipo de equipamento específico
 */
export function getQuestionsByEquipmentType(equipmentType: EquipmentType): Question[] {
  return equipmentQuestionsMap[equipmentType] || [];
}
