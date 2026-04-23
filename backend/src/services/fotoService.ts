import { Pool } from 'pg';

// Conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

    // Converter base64 para Buffer
    const fotoBuffer = Buffer.from(fotoData.foto_data, 'base64');

    // Inserir na tabela fotos_vistoria
    const query = `
      INSERT INTO fotos_vistoria (confirmacao_id, foto_data, foto_nome, foto_tipo, tamanho_bytes, data_upload)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, confirmacao_id, foto_nome, data_upload;
    `;

    const result = await pool.query(query, [
      fotoData.confirmacao_id,
      fotoBuffer, // PostgreSQL converte automaticamente para bytea
      fotoData.foto_nome,
      fotoData.foto_tipo,
      fotoData.tamanho_bytes,
    ]);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Nenhuma foto foi salva');
    }

    console.log(`[fotoService] Foto salva com sucesso! ID: ${result.rows[0].id}`);

    return {
      id: result.rows[0].id,
      confirmacao_id: result.rows[0].confirmacao_id,
      foto_nome: result.rows[0].foto_nome,
      data_upload: result.rows[0].data_upload,
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

    const query = `
      SELECT id, confirmacao_id, foto_nome, foto_tipo, tamanho_bytes, data_upload
      FROM fotos_vistoria
      WHERE confirmacao_id = $1
      ORDER BY data_upload DESC;
    `;

    const result = await pool.query(query, [confirmacao_id]);

    console.log(`[fotoService] ${result.rows.length} fotos encontradas`);

    return result.rows || [];
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

    const query = `DELETE FROM fotos_vistoria WHERE id = $1;`;

    await pool.query(query, [foto_id]);

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

    const query = `
      SELECT id, confirmacao_id, foto_nome, foto_tipo, tamanho_bytes, data_upload
      FROM fotos_vistoria
      WHERE id = $1;
    `;

    const result = await pool.query(query, [foto_id]);

    if (!result.rows || result.rows.length === 0) {
      throw new Error('Foto não encontrada');
    }

    console.log(`[fotoService] Foto encontrada!`);

    return result.rows[0];
  } catch (error) {
    console.error('[fotoService] Erro ao obter foto:', error);
    throw error;
  }
}
