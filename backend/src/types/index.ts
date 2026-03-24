export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: 'ADMIN' | 'ANALISTA' | 'VIEWER';
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Vistoria {
  id: string;
  numero_serie: string;
  nome_equipamento: string;
  whatsapp_cliente: string;
  nome_cliente: string;
  localizacao?: string;
  status_geral: 'COM_AVARIA' | 'SEM_AVARIA' | 'PENDENTE';
  descricao_problema?: string;
  conversa_gptmaker?: string;
  data_vistoria: string;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Componente {
  id: string;
  vistoria_id: string;
  nome_componente: string;
  status: 'OK' | 'COM_DEFEITO' | 'AUSENTE' | 'DANIFICADO';
  descricao?: string;
  data_criacao: string;
}

export interface Foto {
  id: string;
  vistoria_id: string;
  url_foto: string;
  nome_arquivo: string;
  descricao?: string;
  tipo: 'EQUIPAMENTO' | 'AVARIA' | 'COMPONENTE';
  data_criacao: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
