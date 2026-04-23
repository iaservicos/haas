import express from 'express';
import { Pool } from 'pg';

const router = express.Router();

// Conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * POST /api/inspecao/upload-foto
 * Faz upload de foto, salva no banco e retorna resultado
 */
router.post('/upload-foto', async (req, res) => {
  try {
    const { fotoBase64, fotoNome, confirmacaoId } = req.body;

    if (!fotoBase64 || !fotoNome || !confirmacaoId) {
      return res.status(400).json({
        error: 'Dados incompletos: fotoBase64, fotoNome e confirmacaoId são obrigatórios',
      });
    }

    console.log(`[inspecao] Iniciando upload de foto: ${fotoNome}`);

    try {
      // Converter base64 para Buffer
      const fotoBuffer = Buffer.from(fotoBase64, 'base64');
      const tamanhoBytes = fotoBuffer.length;

      console.log(`[inspecao] Tamanho da foto: ${tamanhoBytes} bytes`);

      // Inserir na tabela fotos_vistoria
      const query = `
        INSERT INTO fotos_vistoria (confirmacao_id, foto_data, foto_nome, foto_tipo, tamanho_bytes, data_upload)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, confirmacao_id, foto_nome, data_upload;
      `;

      const result = await pool.query(query, [
        confirmacaoId,
        fotoBuffer,
        fotoNome,
        'jpeg',
        tamanhoBytes,
      ]);

      if (!result.rows || result.rows.length === 0) {
        return res.status(500).json({ error: 'Erro ao salvar foto no banco' });
      }

      const fotoSalva = result.rows[0];
      console.log(`[inspecao] Foto salva com sucesso! ID: ${fotoSalva.id}`);

      // Retornar resultado
      res.json({
        success: true,
        message: 'Foto enviada e salva com sucesso',
        foto: {
          id: fotoSalva.id,
          confirmacao_id: fotoSalva.confirmacao_id,
          foto_nome: fotoSalva.foto_nome,
          data_upload: fotoSalva.data_upload,
          tamanho_bytes: tamanhoBytes,
        },
      });
    } catch (dbError) {
      console.error('[inspecao] Erro ao salvar no banco:', dbError);
      return res.status(500).json({
        error: 'Erro ao salvar foto no banco de dados',
        details: dbError instanceof Error ? dbError.message : 'Erro desconhecido',
      });
    }
  } catch (error) {
    console.error('[inspecao] Erro geral:', error);
    res.status(500).json({
      error: 'Erro ao processar foto',
      details: error instanceof Error ? error.message : 'Desconhecido',
    });
  }
});

/**
 * GET /api/inspecao/equipamento/:equipamentoId
 * Retorna o tipo de equipamento pelo ID
 */
router.get('/equipamento/:equipamentoId', async (req, res) => {
  try {
    const { equipamentoId } = req.params;

    const query = `
      SELECT id, tipo_material, numero_serie, modelo
      FROM contrato_equipamentos
      WHERE id = $1;
    `;

    const result = await pool.query(query, [equipamentoId]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    const data = result.rows[0];
    res.json({
      success: true,
      data: {
        id: equipamentoId,
        tipo_material: data.tipo_material,
        numero_serie: data.numero_serie,
        modelo: data.modelo,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar equipamento:', error);
    res.status(500).json({ error: 'Erro ao buscar equipamento' });
  }
});

/**
 * GET /api/inspecao/perguntas/:equipmentType
 * Retorna as perguntas para um tipo de equipamento específico
 */
router.get('/perguntas/:equipmentType', async (req, res) => {
  try {
    const { equipmentType } = req.params;
    
    // Validar tipo de equipamento
    const validTypes = [
      'Desktop', 'Monitor', 'Notebook', 'MiniPro', 'All in One',
      'Duo', 'Tablet', 'Chromebook', 'Máquina de pagamento', 'Diversos', 'Celular'
    ];
    
    if (!validTypes.includes(equipmentType)) {
      return res.status(400).json({ 
        error: 'Tipo de equipamento inválido',
        validTypes 
      });
    }

    // Retornar perguntas vazias por enquanto
    res.json({
      equipmentType,
      questions: [],
      totalQuestions: 0,
    });
  } catch (error) {
    console.error('Erro ao buscar perguntas:', error);
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

/**
 * POST /api/inspecao/salvar
 * Salva as respostas da inspeção
 */
router.post('/salvar', async (req, res) => {
  try {
    const { vistoriaId, equipmentType, answers, observacoes, equipamento_id } = req.body;

    if (!vistoriaId || !equipmentType || !answers) {
      return res.status(400).json({ 
        error: 'Dados incompletos: vistoriaId, equipmentType e answers são obrigatórios' 
      });
    }

    const query = `
      INSERT INTO inspecao_respostas (vistoria_id, equipment_type, respostas, observacoes, equipamento_id, data_inspecao)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *;
    `;

    const result = await pool.query(query, [
      vistoriaId,
      equipmentType,
      JSON.stringify(answers),
      observacoes || null,
      equipamento_id || null,
    ]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(500).json({ error: 'Erro ao salvar respostas' });
    }

    res.json({
      success: true,
      message: 'Inspeção salva com sucesso',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('Erro ao salvar inspeção:', error);
    res.status(500).json({ 
      error: 'Erro ao salvar inspeção',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/inspecao/:vistoriaId
 * Retorna as respostas de uma inspeção específica
 */
router.get('/:vistoriaId', async (req, res) => {
  try {
    const { vistoriaId } = req.params;

    const query = `
      SELECT * FROM inspecao_respostas WHERE vistoria_id = $1;
    `;

    const result = await pool.query(query, [vistoriaId]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar inspeção:', error);
    res.status(500).json({ error: 'Erro ao buscar inspeção' });
  }
});

/**
 * GET /api/inspecao/portal/listar
 * Retorna todas as inspeções do portal
 */
router.get('/portal/listar', async (req, res) => {
  try {
    const query = `
      SELECT * FROM inspecao_respostas ORDER BY data_inspecao DESC;
    `;

    const result = await pool.query(query);
    const inspecoes = result.rows || [];

    res.json({
      success: true,
      data: inspecoes,
      total: inspecoes.length,
    });
  } catch (error) {
    console.error('Erro ao listar inspeções:', error);
    res.status(500).json({ 
      error: 'Erro ao listar inspeções',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;
