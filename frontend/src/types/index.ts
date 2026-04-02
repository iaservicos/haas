export interface Usuario {
  id: string;
  email: string;
  nome: string;
  role: 'ADMIN' | 'ANALISTA' | 'VIEWER';
  user_type?: 'analyst' | 'client';
  contrato_id?: number; 
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

export interface VistoriaDetalhada {
  vistoria: Vistoria;
  componentes: Componente[];
  fotos: Foto[];
}
