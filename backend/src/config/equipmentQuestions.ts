/**
 * Estrutura de perguntas dinâmicas para cada tipo de equipamento
 * Cada pergunta tem um ID único, texto, tipo de resposta e observações
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
 * Baseado em conhecimento de RPA e inspeção técnica
 */
export const equipmentQuestionsMap: Record<EquipmentType, Question[]> = {
  'Desktop': [
    {
      id: 'desktop_monitor',
      text: 'Monitor presente e funcionando?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_keyboard',
      text: 'Teclado presente e funcionando?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_mouse',
      text: 'Mouse presente e funcionando?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_cables',
      text: 'Cabos em bom estado?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_physical_damage',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'desktop_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'Monitor': [
    {
      id: 'monitor_display',
      text: 'Tela exibe imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'monitor_cables',
      text: 'Cabos em bom estado?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'monitor_stand',
      text: 'Suporte/Pedestal firme?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'monitor_physical_damage',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'monitor_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'Notebook': [
    {
      id: 'notebook_display',
      text: 'Tela exibe imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_keyboard',
      text: 'Teclado funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_touchpad',
      text: 'Touchpad funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_ports',
      text: 'Portas e conectores funcionam?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_screen_damage',
      text: 'Existem danos físicos visíveis na tela?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_hinge_damage',
      text: 'Dobradiça está firme?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_body_damage',
      text: 'Existem danos físicos visíveis no corpo?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'notebook_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'MiniPro': [
    {
      id: 'minipro_display',
      text: 'Tela exibe imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'minipro_keyboard',
      text: 'Teclado funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'minipro_ports',
      text: 'Portas e conectores funcionam?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'minipro_physical_damage',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'minipro_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'All in One': [
    {
      id: 'allinone_display',
      text: 'Tela exibe imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_keyboard',
      text: 'Teclado funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_mouse',
      text: 'Mouse funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_ports',
      text: 'Portas e conectores funcionam?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_stand',
      text: 'Suporte/Pedestal firme?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_physical_damage',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'allinone_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'Duo': [
    {
      id: 'duo_display',
      text: 'Telas exibem imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_keyboard',
      text: 'Teclado funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_hinge',
      text: 'Dobradiça está firme?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_ports',
      text: 'Portas e conectores funcionam?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_physical_damage',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'duo_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'Tablet': [
    {
      id: 'tablet_display',
      text: 'Tela exibe imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_touch',
      text: 'Tela sensível ao toque funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_ports',
      text: 'Portas e conectores funcionam?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_camera',
      text: 'Câmera funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_screen_damage',
      text: 'Existem danos físicos visíveis na tela?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_body_damage',
      text: 'Existem danos físicos visíveis no corpo?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'tablet_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'Chromebook': [
    {
      id: 'chromebook_display',
      text: 'Tela exibe imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_keyboard',
      text: 'Teclado funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_touchpad',
      text: 'Touchpad funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_ports',
      text: 'Portas e conectores funcionam?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_physical_damage',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'chromebook_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'Máquina de pagamento': [
    {
      id: 'payment_display',
      text: 'Tela exibe imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'payment_card_reader',
      text: 'Leitor de cartão funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'payment_keyboard',
      text: 'Teclado funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'payment_printer',
      text: 'Impressora funciona (se aplicável)?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'payment_physical_damage',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'payment_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'Diversos': [
    {
      id: 'misc_functionality',
      text: 'Funciona conforme esperado?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'misc_display',
      text: 'Display/Indicadores funcionam?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'misc_physical_damage',
      text: 'Existem danos físicos visíveis?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'misc_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],

  'Celular': [
    {
      id: 'phone_display',
      text: 'Tela exibe imagem corretamente?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'phone_touch',
      text: 'Tela sensível ao toque funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'phone_buttons',
      text: 'Botões (volume, power) funcionam?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'phone_camera',
      text: 'Câmera funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'phone_audio',
      text: 'Áudio (alto-falante, microfone) funciona?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'phone_screen_damage',
      text: 'Existem danos físicos visíveis na tela?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'phone_body_damage',
      text: 'Existem danos físicos visíveis no corpo?',
      type: 'yes_no',
      required: true,
    },
    {
      id: 'phone_observations',
      text: 'Observações',
      type: 'text',
      required: false,
    },
  ],
};

/**
 * Função helper para obter perguntas de um tipo de equipamento
 */
export function getQuestionsByEquipmentType(equipmentType: EquipmentType): Question[] {
  return equipmentQuestionsMap[equipmentType] || [];
}
