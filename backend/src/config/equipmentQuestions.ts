/**
 * Estrutura de perguntas dinâmicas para cada tipo de equipamento
 * Cada pergunta tem um ID único, texto, tipo de resposta e observações
 * 
 * LÓGICA CLARA:
 * - Sim = OK (equipamento bom)
 * - Não = NOK (equipamento com problema)
 */

export type EquipmentType = 
  | 'Desktop'
  | 'Monitor'
  | 'Notebook'
  | 'MiniPro'
  | 'All in One'
  | 'Duo'
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
 * IMPORTANTE: Todas as perguntas devem ser formuladas para que:
 * - Sim = OK (equipamento está bom)
 * - Não = NOK (equipamento tem problema)
 */
export const equipmentQuestionsMap: Record<EquipmentType, Question[]> = {
  'Desktop': [
    {
      id: 'desktop_lacres',
      text: 'Lacres de Garantia estão OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_cabos',
      text: 'Cabos (Vídeo/Energia) estão OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_danos',
      text: 'Sem danos físicos visíveis?',
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
  'Monitor': [
    {
      id: 'monitor_tela',
      text: 'Tela/Display está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'monitor_cabos',
      text: 'Cabos de Conexão estão OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'monitor_suporte',
      text: 'Suporte/Base está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'monitor_danos',
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'monitor_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Notebook': [
    {
      id: 'notebook_tela',
      text: 'Tela está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_teclado',
      text: 'Teclado está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_adaptador',
      text: 'Adaptador de Energia presente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_danos',
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_observacoes',
      text: 'Observações (Ex: Pequeno amassado na lateral, arranhado na tela)',
      type: 'text',
      required: false,
    },
  ],
  'MiniPro': [
    {
      id: 'minipro_painel',
      text: 'Painel Traseiro (Portas) está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'minipro_perifericos',
      text: 'Periféricos (Mouse/Teclado) presentes?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'minipro_adaptador',
      text: 'Adaptador de Energia presente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'minipro_danos',
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'minipro_observacoes',
      text: 'Observações (Ex: Pequeno amassado na lateral, arranhado na tela)',
      type: 'text',
      required: false,
    },
  ],
  'All in One': [
    {
      id: 'allinone_painel',
      text: 'Painel Traseiro (Portas) está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_perifericos',
      text: 'Periféricos (Mouse/Teclado) estão OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_suporte',
      text: 'Suporte/Base está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_danos',
      text: 'Sem danos físicos visíveis?',
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
  'Duo': [
    {
      id: 'duo_tela',
      text: 'Telas/Displays estão OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_articulacao',
      text: 'Articulação/Dobradiça está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_carregador',
      text: 'Carregador Original está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_danos',
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_observacoes',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
  'Tablet': [
    {
      id: 'tablet_sensibilidade',
      text: 'Sensibilidade do Touch está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_adaptador',
      text: 'Adaptador de Energia está OK?',
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
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_observacoes',
      text: 'Observações (Ex: Pequeno amassado na lateral, arranhado na tela)',
      type: 'text',
      required: false,
    },
  ],
  'Chromebook': [
    {
      id: 'chromebook_tela',
      text: 'Tela está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_teclado',
      text: 'Teclado está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_carregador',
      text: 'Carregador Original está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_danos',
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_observacoes',
      text: 'Observações (Ex: Pequeno amassado na lateral, arranhado na tela)',
      type: 'text',
      required: false,
    },
  ],
  'Máquina de pagamento': [
    {
      id: 'pagamento_tela',
      text: 'Tela está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_botoes',
      text: 'Botões estão OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_leitor',
      text: 'Leitor de Cartão está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_danos',
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'pagamento_observacoes',
      text: 'Observações (Ex: Pequeno amassado na lateral, arranhado na tela)',
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
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'diversos_observacoes',
      text: 'Observações (Ex: Pequeno amassado na lateral, arranhado na tela)',
      type: 'text',
      required: false,
    },
  ],
  'Celular': [
    {
      id: 'celular_tela',
      text: 'Tela/Display está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_bateria',
      text: 'Saúde da Bateria está OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_acessorios',
      text: 'Acessórios estão OK?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_danos',
      text: 'Sem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'celular_observacoes',
      text: 'Observações (Ex: Pequeno amassado na lateral, arranhado na tela)',
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
