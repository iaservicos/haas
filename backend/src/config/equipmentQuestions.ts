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
      text: 'Portas e Trincas',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'recarga_rodizios',
      text: 'Rodízios/Pés',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'recarga_cabos',
      text: 'Cabos de energia internos',
      type: 'yes_no',
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
      text: 'Tela',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_teclado',
      text: 'Teclado',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_carregador',
      text: 'Carregador Original',
      type: 'yes_no',
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
      text: 'Tela/Display',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'smartphone_bateria',
      text: 'Saúde da Bateria',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'smartphone_acessorios',
      text: 'Acessórios',
      type: 'yes_no',
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
      text: 'Cabo de Força',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'nobreak_bateria',
      text: 'Teste de Autonomia (Bateria)',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'nobreak_ruido',
      text: 'Ruído Excessivo',
      type: 'yes_no',
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
      text: 'Painel Traseiro (Portas)',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_perifericos',
      text: 'Periféricos (Mouse/Teclado)',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_suporte',
      text: 'Suporte/Base',
      type: 'yes_no',
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
      text: 'Lacres de Garantia',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_cabos',
      text: 'Cabos (Vídeo/Energia)',
      type: 'yes_no',
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
      text: 'Sensibilidade do Touch',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_adaptador',
      text: 'Adaptador energia',
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
      text: 'Tela',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_teclado',
      text: 'Teclado',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_carregador',
      text: 'Carregador Original',
      type: 'yes_no',
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
      text: 'Tela',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_botoes',
      text: 'Botões',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_leitor',
      text: 'Leitor de Cartão',
      type: 'yes_no',
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
      text: 'Tela/Display',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_bateria',
      text: 'Saúde da Bateria',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_acessorios',
      text: 'Acessórios',
      type: 'yes_no',
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
