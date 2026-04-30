import { Router, Request, Response } from 'express';
import { supabase } from '../config/database.js';

const router = Router();

/**
 * GET /confirmacoes/clientes
 * Listar todos os clientes únicos com seus contratos
 */
router.get('/clientes', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('contratos')
      .select('id, nome_cliente')
      .order('nome_cliente');

    if (error) throw error;

    // Remover duplicatas de clientes
    const clientesUnicos = Array.from(
      new Map(
        (data || []).map((c: any) => [c.nome_cliente, c])
      ).values()
    );

    res.json({
      success: true,
      data: clientesUnicos,
    });
  } catch (error) {
    console.error('[confirmacoes] Erro ao buscar clientes:', error);
    res.status(500).json({ error: 'Erro ao buscar clientes' });
  }
});

/**
 * GET /confirmacoes/contratos/:nomeCliente
 * Listar contratos de um cliente específico
 */
router.get('/contratos/:nomeCliente', async (req: Request, res: Response) => {
  try {
    const { nomeCliente } = req.params;
    const decodedNome = decodeURIComponent(nomeCliente);

    const { data, error } = await supabase
      .from('contratos')
      .select('id, numero_contrato, nome_cliente')
      .eq('nome_cliente', decodedNome)
      .order('numero_contrato');

    if (error) throw error;

    res.json({
      success: true,
      data: data || [],
    });
  } catch (error) {
    console.error('[confirmacoes] Erro ao buscar contratos:', error);
    res.status(500).json({ error: 'Erro ao buscar contratos' });
  }
});

/**
 * GET /confirmacoes/equipamentos/:contratoId
 * Listar equipamentos de um contrato com suas confirmações
 */
router.get('/equipamentos/:contratoId', async (req: Request, res: Response) => {
  try {
    const { contratoId } = req.params;

    // Buscar equipamentos do contrato
    const { data: equipamentos, error: equipError } = await supabase
      .from('contrato_equipamentos')
      .select('id, numero_serie, modelo, tipo_material')
      .eq('contrato_id', contratoId)
      .order('numero_serie');

    if (equipError) throw equipError;

    // Buscar confirmações existentes
    const { data: confirmacoes, error: confirmError } = await supabase
      .from('equipamento_confirmacoes')
      .select('*');

    if (confirmError) throw confirmError;

    // Mapear confirmações aos equipamentos
    const equipamentosComConfirmacao = (equipamentos || []).map((eq: any) => {
      const confirmacao = (confirmacoes || []).find(
        (c: any) => c.equipamento_id === eq.id
      );
      return {
        ...eq,
        confirmacao: confirmacao || null,
      };
    });

    res.json({
      success: true,
      data: equipamentosComConfirmacao,
    });
  } catch (error) {
    console.error('[confirmacoes] Erro ao buscar equipamentos:', error);
    res.status(500).json({ error: 'Erro ao buscar equipamentos' });
  }
});

/**
 * POST /confirmacoes/salvar
 * Salvar confirmações para múltiplos equipamentos
 */
router.post('/salvar', async (req: Request, res: Response) => {
  try {
    const { equipamentos, nota_fiscal, destino } = req.body;

    if (!equipamentos || !Array.isArray(equipamentos)) {
      return res.status(400).json({ error: 'equipamentos deve ser um array' });
    }

    if (!nota_fiscal || !destino) {
      return res.status(400).json({ error: 'nota_fiscal e destino são obrigatórios' });
    }

    const resultados = [];
    const erros = [];

    for (const eq of equipamentos) {
      try {
        // Verificar se já existe confirmação
        const { data: existente, error: searchError } = await supabase
          .from('equipamento_confirmacoes')
          .select('id')
          .eq('equipamento_id', eq.equipamento_id)
          .single();

        if (existente) {
          // Atualizar
          const { data: updated, error: updateError } = await supabase
            .from('equipamento_confirmacoes')
            .update({
              nota_fiscal,
              destino,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existente.id)
            .select();

          if (updateError) throw updateError;
          resultados.push(updated[0]);
        } else {
          // Inserir
          const { data: inserted, error: insertError } = await supabase
            .from('equipamento_confirmacoes')
            .insert({
              equipamento_id: eq.equipamento_id,
              numero_serie: eq.numero_serie,
              nota_fiscal,
              destino,
            })
            .select();

          if (insertError) throw insertError;
          resultados.push(inserted[0]);
        }
      } catch (error) {
        erros.push({
          serial: eq.numero_serie,
          erro: (error as any).message,
        });
      }
    }

    res.json({
      success: true,
      message: `${resultados.length} equipamento(s) confirmado(s)`,
      salvos: resultados.length,
      erros: erros.length,
      detalhesErros: erros,
    });
  } catch (error) {
    console.error('[confirmacoes] Erro ao salvar confirmações:', error);
    res.status(500).json({ error: 'Erro ao salvar confirmações' });
  }
});

/**
 * POST /confirmacoes/importar
 * Importar confirmações em massa via dados parseados do frontend
 * O frontend faz o parse do Excel/CSV e envia os dados como array
 */
router.post('/importar', async (req: Request, res: Response) => {
  try {
    const { dados } = req.body;

    if (!dados || !Array.isArray(dados)) {
      return res.status(400).json({ error: 'dados deve ser um array' });
    }

    const sucessos = [];
    const erros = [];

    for (const linha of dados) {
      try {
        const serial = (linha.Serial || linha.serial || '').toString().trim();
        const nf = (linha['Nota Fiscal'] || linha.nota_fiscal || '').toString().trim();
        const destino = (linha.Destino || linha.destino || '').toString().trim();

        if (!serial) {
          erros.push({
            linha: dados.indexOf(linha) + 1,
            erro: 'Serial vazio',
          });
          continue;
        }

        // Buscar equipamento pelo serial
        const { data: equipData, error: equipError } = await supabase
          .from('contrato_equipamentos')
          .select('id')
          .eq('numero_serie', serial)
          .single();

        if (equipError || !equipData) {
          erros.push({
            serial,
            erro: 'Serial não encontrado',
          });
          continue;
        }

        // Verificar se já existe confirmação
        const { data: existente } = await supabase
          .from('equipamento_confirmacoes')
          .select('id')
          .eq('equipamento_id', equipData.id)
          .single();

        if (existente) {
          // Atualizar
          const { data: updated, error: updateError } = await supabase
            .from('equipamento_confirmacoes')
            .update({
              nota_fiscal: nf,
              destino,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existente.id)
            .select();

          if (updateError) throw updateError;
          sucessos.push(updated[0]);
        } else {
          // Inserir
          const { data: inserted, error: insertError } = await supabase
            .from('equipamento_confirmacoes')
            .insert({
              equipamento_id: equipData.id,
              numero_serie: serial,
              nota_fiscal: nf,
              destino,
            })
            .select();

          if (insertError) throw insertError;
          sucessos.push(inserted[0]);
        }
      } catch (error) {
        erros.push({
          linha: dados.indexOf(linha) + 1,
          erro: (error as any).message,
        });
      }
    }

    res.json({
      success: true,
      message: `${sucessos.length} equipamento(s) processado(s)`,
      processados: sucessos.length,
      erros: erros.length,
      detalhesErros: erros,
    });
  } catch (error) {
    console.error('[confirmacoes] Erro ao importar confirmações:', error);
    res.status(500).json({ error: 'Erro ao importar confirmações' });
  }
});

/**
 * PUT /confirmacoes/atualizar/:id
 * Atualizar uma confirmação existente
 */
router.put('/atualizar/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nota_fiscal, destino } = req.body;

    if (!nota_fiscal || !destino) {
      return res.status(400).json({ error: 'nota_fiscal e destino são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('equipamento_confirmacoes')
      .update({
        nota_fiscal,
        destino,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Confirmação atualizada com sucesso',
      data: data[0],
    });
  } catch (error) {
    console.error('[confirmacoes] Erro ao atualizar confirmação:', error);
    res.status(500).json({ error: 'Erro ao atualizar confirmação' });
  }
});

/**
 * DELETE /confirmacoes/deletar/:id
 * Deletar uma confirmação
 */
router.delete('/deletar/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('equipamento_confirmacoes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Confirmação deletada com sucesso',
    });
  } catch (error) {
    console.error('[confirmacoes] Erro ao deletar confirmação:', error);
    res.status(500).json({ error: 'Erro ao deletar confirmação' });
  }
});

export default router;
