import { createClient } from '@supabase/supabase-js';

// Inicializar cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

/**
 * Salva foto na tabela fotos_vistoria
 * @param fotoData - Dados da foto (confirmacao_id, foto_data, foto_nome, foto_tipo, tamanho_bytes)
 * @returns ID da foto salva
 */
export async function salvarFoto(fotoData: {
  confirmacao_id: string;
  foto_data: string; // base64
  foto_nome: string;
  foto_tipo: string;
  tamanho_bytes: number;
}) {
  try {
    console.log(`[fotoService] Salvando foto: ${fotoData.foto_nome} para confirmacao: ${fotoData.confirmacao_id}`);

    // Converter base64 para buffer
    const fotoBuffer = Buffer.from(fotoData.foto_data, 'base64');

    // Inserir na tabela fotos_vistoria
    const { data, error } = await supabase
      .from('fotos_vistoria')
      .insert([
        {
          confirmacao_id: fotoData.confirmacao_id,
          foto_data: fotoBuffer, // Supabase converte automaticamente para bytea
          foto_nome: fotoData.foto_nome,
          foto_tipo: fotoData.foto_tipo,
          tamanho_bytes: fotoData.tamanho_bytes,
          data_upload: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error('[fotoService] Erro ao salvar foto:', error);
      throw new Error(`Erro ao salvar foto: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Nenhuma foto foi salva');
    }

    console.log(`[fotoService] Foto salva com sucesso! ID: ${data[0].id}`);

    return {
      id: data[0].id,
      confirmacao_id: data[0].confirmacao_id,
      foto_nome: data[0].foto_nome,
      data_upload: data[0].data_upload,
    };
  } catch (error) {
    console.error('[fotoService] Erro ao salvar foto:', error);
    throw error;
  }
}

/**
 * Lista fotos de uma confirmação
 * @param confirmacao_id - ID da confirmação
 * @returns Array de fotos
 */
export async function listarFotosPorConfirmacao(confirmacao_id: string) {
  try {
    console.log(`[fotoService] Listando fotos para confirmacao: ${confirmacao_id}`);

    const { data, error } = await supabase
      .from('fotos_vistoria')
      .select('*')
      .eq('confirmacao_id', confirmacao_id)
      .order('data_upload', { ascending: false });

    if (error) {
      console.error('[fotoService] Erro ao listar fotos:', error);
      throw new Error(`Erro ao listar fotos: ${error.message}`);
    }

    console.log(`[fotoService] ${data?.length || 0} fotos encontradas`);

    return data || [];
  } catch (error) {
    console.error('[fotoService] Erro ao listar fotos:', error);
    throw error;
  }
}

/**
 * Deleta uma foto
 * @param foto_id - ID da foto
 * @returns true se deletada com sucesso
 */
export async function deletarFoto(foto_id: number) {
  try {
    console.log(`[fotoService] Deletando foto: ${foto_id}`);

    const { error } = await supabase
      .from('fotos_vistoria')
      .delete()
      .eq('id', foto_id);

    if (error) {
      console.error('[fotoService] Erro ao deletar foto:', error);
      throw new Error(`Erro ao deletar foto: ${error.message}`);
    }

    console.log(`[fotoService] Foto deletada com sucesso!`);

    return true;
  } catch (error) {
    console.error('[fotoService] Erro ao deletar foto:', error);
    throw error;
  }
}

/**
 * Obtém uma foto pelo ID
 * @param foto_id - ID da foto
 * @returns Dados da foto
 */
export async function obterFoto(foto_id: number) {
  try {
    console.log(`[fotoService] Obtendo foto: ${foto_id}`);

    const { data, error } = await supabase
      .from('fotos_vistoria')
      .select('*')
      .eq('id', foto_id)
      .single();

    if (error) {
      console.error('[fotoService] Erro ao obter foto:', error);
      throw new Error(`Erro ao obter foto: ${error.message}`);
    }

    console.log(`[fotoService] Foto encontrada!`);

    return data;
  } catch (error) {
    console.error('[fotoService] Erro ao obter foto:', error);
    throw error;
  }
}
