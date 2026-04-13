/**
 * Serviço para gerenciar fotos de vistorias
 * Responsável por salvar, recuperar e listar fotos no banco de dados
 */

import { supabase } from '../config/database.js';
import type { Multer } from 'multer';

interface FotoVistoria {
  id?: number;
  confirmacao_id: string;
  foto_data: string; // base64
  foto_nome: string;
  foto_tipo: string;
  tamanho_bytes?: number;
  data_upload?: string;
}

export const fotoService = {
  /**
   * Salvar uma nova foto no banco de dados
   */
  async salvarFoto(
    confirmacaoId: string,
    fotoBuffer: Buffer,
    nomeArquivo: string,
    tipoMime: string
  ): Promise<FotoVistoria> {
    try {
      console.log(`📸 Salvando foto: ${nomeArquivo}`);

      // Converter buffer para base64
      const fotoBase64 = fotoBuffer.toString('base64');

      const { data, error } = await supabase
        .from('fotos_vistoria')
        .insert({
          confirmacao_id: confirmacaoId,
          foto_data: fotoBase64,
          foto_nome: nomeArquivo,
          foto_tipo: tipoMime,
          tamanho_bytes: fotoBuffer.length,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Foto salva com sucesso');
      return data;
    } catch (error) {
      console.error('❌ Erro ao salvar foto:', error);
      throw error;
    }
  },

  /**
   * Obter a foto mais recente de uma confirmação
   */
  async obterFoto(confirmacaoId: string): Promise<FotoVistoria> {
    try {
      const { data, error } = await supabase
        .from('fotos_vistoria')
        .select('*')
        .eq('confirmacao_id', confirmacaoId)
        .order('data_upload', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao obter foto:', error);
      throw error;
    }
  },

  /**
   * Listar todas as fotos de uma confirmação
   */
  async listarFotos(confirmacaoId: string): Promise<FotoVistoria[]> {
    try {
      const { data, error } = await supabase
        .from('fotos_vistoria')
        .select('*')
        .eq('confirmacao_id', confirmacaoId)
        .order('data_upload', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao listar fotos:', error);
      throw error;
    }
  },

  /**
   * Deletar uma foto
   */
  async deletarFoto(fotoId: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('fotos_vistoria')
        .delete()
        .eq('id', fotoId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar foto:', error);
      throw error;
    }
  },

  /**
   * Validar tamanho da foto (máximo 10MB)
   */
  validarTamanho(tamanhoBytes: number): boolean {
    const tamanhoMaximoBytes = 10 * 1024 * 1024; // 10MB
    return tamanhoBytes <= tamanhoMaximoBytes;
  },

  /**
   * Validar tipo MIME
   */
  validarTipoMime(tipoMime: string): boolean {
    const tiposValidos = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    return tiposValidos.includes(tipoMime.toLowerCase());
  },

  /**
   * Validar arquivo completo
   */
  validarArquivo(arquivo: Express.Multer.File): { valido: boolean; erro?: string } {
    if (!arquivo) {
      return { valido: false, erro: 'Nenhum arquivo foi enviado' };
    }

    if (!this.validarTipoMime(arquivo.mimetype)) {
      return { valido: false, erro: 'Tipo de arquivo inválido' };
    }

    if (!this.validarTamanho(arquivo.size)) {
      return { valido: false, erro: 'Arquivo muito grande (máximo 10MB)' };
    }

    return { valido: true };
  },
};
