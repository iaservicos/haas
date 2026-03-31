// backend/src/types/index.ts - VERSÃO ATUALIZADA

export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: 'ADMIN' | 'ANALISTA' | 'VIEWER';
  user_type: 'analyst' | 'client';  // NOVO: tipo de usuário
  contrato_id?: string;              // NOVO: contrato do cliente
  ativo: boolean;
  data_criacao: string;
  data_atualizacao: string;
}

export interface Contrato {
  id: string;
  numero_contrato: string;
  nome_cliente: string;
  cnpj_cliente?: string;
  status: 'active' | 'inactive' | 'completed';
  data_criacao: string;
  data_atualizacao: string;
}

export interface ContratoEquipamento {
  id: string;
  contrato_id: string;
  numero_serie: string;
  modelo: string;
  material?: string;
  meses_garantia: number;
  data_criacao: string;
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
  user_type: 'analyst' | 'client';  // NOVO
  contrato_id?: string;              // NOVO
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Tipos para requisições
export interface CreateClientRequest {
  email: string;
  nome: string;
  contrato_id: string;
  senha: string;
}

export interface CreateContratoRequest {
  numero_contrato: string;
  nome_cliente: string;
  cnpj_cliente?: string;
}

export interface AddContratoEquipamentoRequest {
  contrato_id: string;
  numero_serie: string;
  modelo: string;
  material?: string;
  meses_garantia?: number;
}
