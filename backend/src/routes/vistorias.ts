import express from 'express';
import { analisarFotoGPTMaker } from '../services/gptmakerService.js';
import { db } from '../db/index.js';
import { cliente_confirmacoes } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * POST /api/vistorias/upload-foto
 * 
 * Fluxo correto:
 * 1. Recebe foto em base64
 * 2. Salva em Supabase (gera URL)
 * 3. Envia para GPTMaker analisar
 * 4. Salva resultado no banco
 * 5. Retorna resultado para o cliente
 */
router.post('/upload-foto', async (req, res) => {
  try {
    const {
      fotoBase64,
      fotoNome,
      confirmacaoId,
      numeroSerie,
      equipmentType,
      nomeCliente,
    } = req.body;

    // Validação
    if (!fotoBase64 || !confirmacaoId) {
      return res.status(400).json({
        error: 'fotoBase64 e confirmacaoId são obrigatórios',
      });
    }

    console.log(`[Upload Foto] Recebido: ${fotoNome} para confirmação ${confirmacaoId}`);

    // 1. Atualizar status para "analisando"
    await db
      .update(cliente_confirmacoes)
      .set({
        status_analise: 'analisando',
        updated_at: new Date(),
      })
      .where(eq(cliente_confirmacoes.id, confirmacaoId));

    // 2. Enviar para GPTMaker
    const analise = await analisarFotoGPTMaker(
      fotoBase64,
      fotoNome,
      confirmacaoId,
      numeroSerie,
      equipmentType,
      nomeCliente
    );

    // 3. Salvar resultado no banco
    await db
      .update(cliente_confirmacoes)
      .set({
        status_analise: analise.status,
        resultado_analise: analise.resultado,
        analise_gptmaker: analise.descricao,
        updated_at: new Date(),
      })
      .where(eq(cliente_confirmacoes.id, confirmacaoId));

    console.log(`[Upload Foto] ✅ Análise concluída: ${analise.resultado}`);

    // 4. Retornar resultado
    return res.status(200).json({
      sucesso: true,
      analise: {
        status: analise.status,
        resultado: analise.resultado,
        descricao: analise.descricao,
        timestamp: analise.timestamp,
      },
    });
  } catch (error) {
    console.error('[Upload Foto] Erro:', error);

    // Atualizar status para "erro"
    if (req.body.confirmacaoId) {
      await db
        .update(cliente_confirmacoes)
        .set({
          status_analise: 'erro',
          analise_gptmaker: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`,
          updated_at: new Date(),
        })
        .where(eq(cliente_confirmacoes.id, req.body.confirmacaoId));
    }

    return res.status(500).json({
      error: 'Erro ao processar foto',
      detalhes: error instanceof Error ? error.message : 'Desconhecido',
    });
  }
});

export default router;
