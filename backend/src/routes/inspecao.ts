import express from 'express';
import { Pool } from 'pg';
import type { EquipmentType } from '../config/equipmentQuestions.js';
import { getQuestionsByEquipmentType } from '../config/equipmentQuestions.js';
import { salvarFoto } from '../services/fotoService.js';
import { analisarFotoGPTMaker } from '../services/gptmakerService.js';

const router = express.Router();

// Conexão com PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

    const questions = getQuestionsByEquipmentType(equipmentType as EquipmentType);

    res.json({
      equipmentType,
      questions,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error('Erro ao buscar perguntas:', error);
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

/**
 * POST /api/inspecao/salvar
 * Salva as respostas da inspeção com equipamento_id
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

    console.log('[inspecao.ts] Inspeção salva com sucesso:', result.rows[0]);

    // Atualizar status da vistoria (se existir)
    try {
      const updateQuery = `UPDATE vistorias SET status = 'inspecionada' WHERE id = $1;`;
      await pool.query(updateQuery, [vistoriaId]);
    } catch (updateError) {
      console.log('[inspecao.ts] Aviso: Não foi possível atualizar status da vistoria', updateError);
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
 * Retorna todas as inspeções do portal com dados de equipamento e contrato
 */
router.get('/portal/listar', async (req, res) => {
  try {
    console.log('[inspecao.ts] Iniciando listagem de inspeções do portal...');

    const query = `
      SELECT * FROM inspecao_respostas ORDER BY data_inspecao DESC;
    `;

    const result = await pool.query(query);
    const inspecoes = result.rows || [];

    console.log(`[inspecao.ts] ${inspecoes.length} inspeções encontradas`);

    // Enriquecer dados com informações de equipamento e contrato
    const enrichedData = await Promise.all(
      inspecoes.map(async (inspecao) => {
        try {
          if (!inspecao.equipamento_id) {
            console.log(`[inspecao.ts] Inspeção ${inspecao.id} sem equipamento_id`);
            return {
              ...inspecao,
              contrato_equipamentos: null,
            };
          }

          console.log(`[inspecao.ts] Buscando equipamento ${inspecao.equipamento_id}...`);

          const equipQuery = `
            SELECT id, numero_serie, modelo, tipo_material, contrato_id
            FROM contrato_equipamentos
            WHERE id = $1;
          `;

          const equipResult = await pool.query(equipQuery, [inspecao.equipamento_id]);

          if (!equipResult.rows || equipResult.rows.length === 0) {
            console.warn(`[inspecao.ts] Equipamento ${inspecao.equipamento_id} não encontrado`);
            return {
              ...inspecao,
              contrato_equipamentos: null,
            };
          }

          const equipamento = equipResult.rows[0];
          console.log(`[inspecao.ts] Equipamento encontrado:`, equipamento);

          const contratoQuery = `
            SELECT id, numero_contrato, nome_cliente
            FROM contratos
            WHERE id = $1;
          `;

          const contratoResult = await pool.query(contratoQuery, [equipamento.contrato_id]);

          if (!contratoResult.rows || contratoResult.rows.length === 0) {
            console.warn(`[inspecao.ts] Contrato ${equipamento.contrato_id} não encontrado`);
            return {
              ...inspecao,
              contrato_equipamentos: {
                ...equipamento,
                contratos: null,
              },
            };
          }

          const contrato = contratoResult.rows[0];
          console.log(`[inspecao.ts] Contrato encontrado:`, contrato);

          return {
            ...inspecao,
            contrato_equipamentos: {
              ...equipamento,
              contratos: contrato,
            },
          };
        } catch (enrichError) {
          console.error(`[inspecao.ts] Erro ao enriquecer inspeção ${inspecao.id}:`, enrichError);
          return {
            ...inspecao,
            contrato_equipamentos: null,
          };
        }
      })
    );

    console.log('[inspecao.ts] Listagem concluída com sucesso');

    res.json({
      success: true,
      data: enrichedData || [],
      total: enrichedData?.length || 0,
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro geral ao listar inspeções do portal:', error);
    res.status(500).json({ 
      error: 'Erro ao listar inspeções',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * POST /api/inspecao/upload-foto
 * Faz upload de foto, salva no banco e analisa com GPTMaker
 */
router.post('/upload-foto', async (req, res) => {
  try {
    const { fotoBase64, fotoNome, confirmacaoId, numeroSerie, equipmentType, nomeCliente } = req.body;

    if (!fotoBase64 || !fotoNome || !confirmacaoId) {
      return res.status(400).json({
        error: 'Dados incompletos: fotoBase64, fotoNome e confirmacaoId são obrigatórios',
      });
    }

    console.log(`[inspecao.ts] Iniciando upload de foto: ${fotoNome}`);

    // 1. Calcular tamanho da foto em bytes
    const tamanhoBytes = Buffer.byteLength(fotoBase64, 'base64');
    console.log(`[inspecao.ts] Tamanho da foto: ${tamanhoBytes} bytes`);

    // 2. Salvar foto no banco de dados
    console.log(`[inspecao.ts] Salvando foto no banco de dados...`);
    const fotoSalva = await salvarFoto({
      confirmacao_id: confirmacaoId,
      foto_data: fotoBase64,
      foto_nome: fotoNome,
      foto_tipo: 'jpeg',
      tamanho_bytes: tamanhoBytes,
    });

    console.log(`[inspecao.ts] Foto salva com sucesso! ID: ${fotoSalva.id}`);

    // 3. Analisar foto com GPTMaker
    console.log(`[inspecao.ts] Enviando foto para análise com GPTMaker...`);
    const analise = await analisarFotoGPTMaker(
      fotoBase64,
      fotoNome,
      confirmacaoId,
      numeroSerie,
      equipmentType,
      nomeCliente
    );

    console.log(`[inspecao.ts] Análise concluída: ${analise.status}`);

    // 4. Retornar resultado
    res.json({
      success: true,
      message: 'Foto enviada, salva e analisada com sucesso',
      foto: fotoSalva,
      analise: analise,
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro ao fazer upload de foto:', error);
    res.status(500).json({
      error: 'Erro ao fazer upload de foto',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
});

export default router;
