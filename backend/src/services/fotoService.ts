import { supabase } from '../config/database.js';
import multer from 'multer';

interface FotoData {
  confirmacao_id: string;
  foto_data: string; // base64
  foto_nome: string;
  foto_tipo: string;
  tamanho_bytes: number;
}

// Configurar multer para upload em memória
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * Salvar foto no banco de dados
 */
export async function salvarFoto(fotoData: FotoData): Promise<{ id: string }> {
  try {
    const { data, error } = await supabase
      .from('fotos_vistoria')
      .insert([
        {
          confirmacao_id: fotoData.confirmacao_id,
          foto_data: fotoData.foto_data,
          foto_nome: fotoData.foto_nome,
          foto_tipo: fotoData.foto_tipo,
          tamanho_bytes: fotoData.tamanho_bytes,
          data_upload: new Date().toISOString(),
        },
      ])
      .select('id')
      .single();

    if (error) throw error;

    return { id: data.id };
  } catch (error) {
    console.error('Erro ao salvar foto:', error);
    throw error;
  }
}

/**
 * Recuperar foto do banco de dados
 */
export async function recuperarFoto(fotoId: string): Promise<FotoData | null> {
  try {
    const { data, error } = await supabase
      .from('fotos_vistoria')
      .select('*')
      .eq('id', fotoId)
      .single();

    if (error) throw error;

    return data as FotoData;
  } catch (error) {
    console.error('Erro ao recuperar foto:', error);
    return null;
  }
}

/**
 * Listar fotos de uma confirmação
 */
export async function listarFotosPorConfirmacao(confirmacaoId: string): Promise<FotoData[]> {
  try {
    const { data, error } = await supabase
      .from('fotos_vistoria')
      .select('*')
      .eq('confirmacao_id', confirmacaoId)
      .order('data_upload', { ascending: false });

    if (error) throw error;

    return data as FotoData[];
  } catch (error) {
    console.error('Erro ao listar fotos:', error);
    return [];
  }
}

/**
 * Deletar foto
 */
export async function deletarFoto(fotoId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('fotos_vistoria')
      .delete()
      .eq('id', fotoId);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Erro ao deletar foto:', error);
    return false;
  }
}

export { upload };
