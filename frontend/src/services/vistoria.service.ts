import { apiClient } from './api';
import { Vistoria, VistoriaDetalhada } from '../types';

interface ListResponse {
  data: Vistoria[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export const vistoriaService = {
  async listar(filters?: {
    status?: string;
    dataInicio?: string;
    dataFim?: string;
    page?: number;
    limit?: number;
  }): Promise<ListResponse> {
    const { data } = await apiClient.get<ListResponse>('/vistorias', {
      params: filters,
    });
    return data;
  },

  async obter(id: string): Promise<VistoriaDetalhada> {
    const { data } = await apiClient.get<VistoriaDetalhada>(`/vistorias/${id}`);
    return data;
  },

  async criar(vistoria: Partial<Vistoria>): Promise<Vistoria> {
    const { data } = await apiClient.post<Vistoria>('/vistorias', vistoria);
    return data;
  },

  async atualizar(id: string, vistoria: Partial<Vistoria>): Promise<Vistoria> {
    const { data } = await apiClient.put<Vistoria>(`/vistorias/${id}`, vistoria);
    return data;
  },

  async deletar(id: string): Promise<void> {
    await apiClient.delete(`/vistorias/${id}`);
  },
};
