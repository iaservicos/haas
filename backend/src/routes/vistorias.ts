import { Router, Request, Response } from 'express';
import { supabase } from '../config/database.js';
import { authMiddleware } from '../middleware/auth.js';
import { salvarFoto, listarFotosPorConfirmacao } from '../services/fotoService.js';
import { analisarFotoGPTMaker } from '../services/gptmakerService.js';


const router = Router( );


router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, tecnico, estado, teclado, mouse } = req.query;

    let query = supabase.from('vistorias').select('*');

    if (tecnico) {
      query = query.ilike('tecnico', `%${tecnico}%`);
    }

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (teclado) {
      query = query.eq('teclado_status', teclado);
    }

    if (mouse) {
      query = query.eq('mouse_status', mouse);
    }

    const offset = (Number(page) - 1) * Number(limit);
    const { data, error } = await query
      .order('data_vistoria', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw error;

    res.json({
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: data.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar vistorias' });
  }
});

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const { data: vistorias, error } = await supabase
      .from('vistorias')
      .select('*');

    if (error) throw error;

    const stats = {
      total: vistorias.length,
      comAvaria: vistorias.filter((v: any) => v.estado === 'Equip. com AVARIA').length,
      semAvaria: vistorias.filter((v: any) => v.estado === 'Equipamento OK').length,
      mouseOk: vistorias.filter((v: any) => v.mouse_status === 'OK').length,
      mouseAusente: vistorias.filter((v: any) => v.mouse_status === 'AUSENTE').length,
      tecladoOk: vistorias.filter((v: any) => v.teclado_status === 'OK').length,
      tecladoAusente: vistorias.filter((v: any) => v.teclado_status === 'AUSENTE').length,
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estatísticas' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('vistorias')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar vistoria' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { data_vistoria, tecnico, email_tecnico, cliente, numero_serie, equipamento, estado, teclado_status, mouse_status, laudo } = req.body;

    const { data, error } = await supabase
      .from('vistorias')
      .insert([
        {
          data_vistoria,
          tecnico,
          email_tecnico,
          cliente,
          numero_serie,
          equipamento,
          estado,
          teclado_status,
          mouse_status,
          laudo,
        },
      ])
      .select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar vistoria' });
  }
});

// ===== ROTAS PARA FOTOS E GPTMAKER =====

/**
 * POST /api/vistoria/upload-foto
 * Recebe foto em base64, salva em fotos_vistoria, Supabase Storage e envia para GPTMaker
 * Salva resultado em inspecao_respostas (JSONB)
 * 
 * Fluxo:
 * 1. Recebe confirmacaoId (do cliente_confirmacoes)
 * 2. Busca o inspecaoId correspondente (de inspecao_respostas)
 * 3. Salva foto em fotos_vistoria
 * 4. Salva foto em Supabase Storage (gera URL)
 * 5. Envia para GPTMaker analisar
 * 6. Salva resultado em inspecao_respostas.respostas.analise_foto
 */
router.post('/upload-foto', async (req: Request, res: Response) => {
  try {
    const { fotoBase64, fotoNome, confirmacaoId, numeroSerie, equipmentType, nomeCliente } = req.body;

    if (!fotoBase64 || !fotoNome || !confirmacaoId) {
      return res.status(400).json({
        error: 'Faltam parâmetros: fotoBase64, fotoNome, confirmacaoId',
      });
    }

    console.log(`[Vistoria] Upload de foto para serial: ${numeroSerie}, tipo: ${equipmentType}, cliente: ${nomeCliente}`);

    // 1. Buscar inspecaoId usando confirmacaoId
    const { data: confirmacaoData, error: confirmacaoError } = await supabase
      .from('cliente_confirmacoes')
      .select('id, vistoria_id')
      .eq('id', confirmacaoId)
      .single();

    if (confirmacaoError || !confirmacaoData) {
      console.error('[Vistoria] Confirmação não encontrada:', confirmacaoId);
      return res.status(404).json({ error: 'Confirmação não encontrada' });
    }

    // 2. Buscar inspecaoId da vistoria
    const { data: inspecaoData, error: inspecaoError } = await supabase
      .from('inspecao_respostas')
      .select('id')
      .eq('vistoria_id', confirmacaoData.vistoria_id)
      .single();

    if (inspecaoError || !inspecaoData) {
      console.error('[Vistoria] Inspeção não encontrada para vistoria:', confirmacaoData.vistoria_id);
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    const inspecaoId = inspecaoData.id;
    console.log(`[Vistoria] Confirmação ${confirmacaoId} → Inspeção ${inspecaoId}`);

    // 3. Converter base64 para buffer
    const fotoBuffer = Buffer.from(fotoBase64, 'base64');

    // 4. Salvar foto no banco (fotos_vistoria)
    const fotoData = {
      confirmacao_id: confirmacaoId,
      foto_data: fotoBase64,
      foto_nome: fotoNome,
      foto_tipo: 'image/jpeg',
      tamanho_bytes: fotoBuffer.length,
    };

    const { id: fotoId } = await salvarFoto(fotoData);
    console.log(`[Vistoria] Foto salva com ID: ${fotoId}`);

    // 5. Salvar em Supabase Storage (gera URL pública)
    const nomeUnico = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${fotoNome}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('fotos')
      .upload(nomeUnico, fotoBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error('[Supabase Storage] Erro ao fazer upload:', uploadError);
      throw uploadError;
    }

    const { data: publicUrl } = supabase.storage
      .from('fotos')
      .getPublicUrl(nomeUnico);

    const fotoUrl = publicUrl.publicUrl;
    console.log(`[Supabase Storage] ✅ Foto salva: ${fotoUrl}`);

    // 6. Enviar para análise do GPTMaker com contexto do equipamento
    const analise = await analisarFotoGPTMaker(fotoBase64, fotoNome, confirmacaoId, numeroSerie, equipmentType, nomeCliente);
    console.log(`[Vistoria] Análise GPTMaker concluída: ${analise.resultado}`);

    // 7. Buscar respostas existentes de inspecao_respostas
    const { data: inspecaoRespostasData, error: inspecaoRespostasError } = await supabase
      .from('inspecao_respostas')
      .select('respostas')
      .eq('id', inspecaoId)
      .single();

    if (inspecaoRespostasError) {
      console.error('[Inspecao Respostas] Erro ao buscar:', inspecaoRespostasError);
      throw inspecaoRespostasError;
    }

    // 8. Mesclar análise com respostas existentes
    const respostasAtualizadas = {
      ...(inspecaoRespostasData.respostas || {}),
      analise_foto: {
        status: analise.status,
        resultado: analise.resultado,
        descricao: analise.descricao,
        url_foto: fotoUrl,
        timestamp: analise.timestamp,
      },
    };

    // 9. Atualizar inspecao_respostas com análise
    const { error: updateError } = await supabase
      .from('inspecao_respostas')
      .update({
        respostas: respostasAtualizadas,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inspecaoId);

    if (updateError) {
      console.error('[Inspecao Respostas] Erro ao atualizar:', updateError);
      throw updateError;
    }

    console.log(`[Vistoria] ✅ Análise salva em inspecao_respostas`);

    return res.status(200).json({
      success: true,
      fotoId,
      fotoUrl,
      analise: {
        status: analise.status,
        resultado: analise.resultado,
        descricao: analise.descricao,
        timestamp: analise.timestamp,
      },
      message: 'Foto salva e analisada com sucesso',
    });
  } catch (error) {
    console.error('[Vistoria] Erro no upload:', error);
    return res.status(500).json({
      error: `Erro ao processar foto: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    });
  }
});

/**
 * GET /api/vistoria/confirmacao/:id
 * Retorna dados da confirmação com fotos
 */
router.get('/confirmacao/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Buscar confirmação
    const { data: confirmacao, error: confirmacaoError } = await supabase
      .from('cliente_confirmacoes')
      .select('*')
      .eq('id', id)
      .single();

    if (confirmacaoError || !confirmacao) {
      return res.status(404).json({ error: 'Confirmação não encontrada' });
    }

    // 2. Buscar fotos da confirmação
    const fotos = await listarFotosPorConfirmacao(id);

    return res.status(200).json({
      confirmacao,
      fotos,
    });
  } catch (error) {
    console.error('[Vistoria] Erro ao buscar confirmação:', error);
    return res.status(500).json({
      error: `Erro ao buscar confirmação: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    });
  }
});

/**
 * PUT /api/vistoria/confirmacao/:id
 * Atualiza checklist da confirmação
 */
router.put('/confirmacao/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { fonte_presente, teclado_presente, mouse_presente, tipo_material } = req.body;

    // Validar campos obrigatórios
    if (fonte_presente === undefined) {
      return res.status(400).json({
        error: 'Campo obrigatório: fonte_presente',
      });
    }

    // Atualizar confirmação
    const { data, error } = await supabase
      .from('cliente_confirmacoes')
      .update({
        fonte_presente,
        teclado_presente: teclado_presente || false,
        mouse_presente: mouse_presente || false,
        tipo_material: tipo_material || 'genérico',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      confirmacao: data,
      message: 'Confirmação atualizada com sucesso',
    });
  } catch (error) {
    console.error('[Vistoria] Erro ao atualizar confirmação:', error);
    return res.status(500).json({
      error: `Erro ao atualizar confirmação: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    });
  }
});


export default router;
