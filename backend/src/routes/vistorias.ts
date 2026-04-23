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
 */
router.post('/upload-foto', async (req: Request, res: Response) => {
  try {
    const { fotoBase64, fotoNome, inspecaoId, numeroSerie, equipmentType, nomeCliente } = req.body;

    if (!fotoBase64 || !fotoNome || !inspecaoId) {
      return res.status(400).json({
        error: 'Faltam parâmetros: fotoBase64, fotoNome, inspecaoId',
      });
    }

    console.log(`[Vistoria] Upload de foto para serial: ${numeroSerie}, tipo: ${equipmentType}, cliente: ${nomeCliente}`);

    // 1. Converter base64 para buffer
    const fotoBuffer = Buffer.from(fotoBase64, 'base64');

    // 2. Salvar foto no banco (fotos_vistoria)
    const fotoData = {
      confirmacao_id: inspecaoId,
      foto_data: fotoBase64,
      foto_nome: fotoNome,
      foto_tipo: 'image/jpeg',
      tamanho_bytes: fotoBuffer.length,
    };

    const { id: fotoId } = await salvarFoto(fotoData);
    console.log(`[Vistoria] Foto salva com ID: ${fotoId}`);

    // 3. Salvar em Supabase Storage (gera URL pública)
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

    // 4. Enviar para análise do GPTMaker com contexto do equipamento
    const analise = await analisarFotoGPTMaker(fotoBase64, fotoNome, inspecaoId, numeroSerie, equipmentType, nomeCliente);
    console.log(`[Vistoria] Análise GPTMaker concluída: ${analise.resultado}`);

    // 5. Buscar respostas existentes de inspecao_respostas
    const { data: inspecaoData, error: inspecaoError } = await supabase
      .from('inspecao_respostas')
      .select('respostas')
      .eq('id', inspecaoId)
      .single();

    if (inspecaoError) {
      console.error('[Inspecao Respostas] Erro ao buscar:', inspecaoError);
      throw inspecaoError;
    }

    // 6. Mesclar análise com respostas existentes
    const respostasAtualizadas = {
      ...(inspecaoData.respostas || {}),
      analise_foto: {
        status: analise.status,
        resultado: analise.resultado,
        descricao: analise.descricao,
        url_foto: fotoUrl,
        timestamp: analise.timestamp,
      },
    };

    // 7. Atualizar inspecao_respostas com análise
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

    // 1. Buscar inspeção
    const { data: inspecao, error: inspecaoError } = await supabase
      .from('inspecao_respostas')
      .select('*')
      .eq('id', id)
      .single();

    if (inspecaoError || !inspecao) {
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    // 2. Buscar fotos da inspeção
    const fotos = await listarFotosPorConfirmacao(id);

    return res.status(200).json({
      inspecao,
      fotos,
    });
  } catch (error) {
    console.error('[Vistoria] Erro ao buscar inspeção:', error);
    return res.status(500).json({
      error: `Erro ao buscar inspeção: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    });
  }
});

/**
 * PUT /api/vistoria/confirmacao/:id
 * Atualiza checklist da inspeção
 */
router.put('/confirmacao/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { respostas } = req.body;

    // Validar campos obrigatórios
    if (!respostas) {
      return res.status(400).json({
        error: 'Campo obrigatório: respostas',
      });
    }

    // Buscar respostas existentes
    const { data: inspecaoData, error: inspecaoError } = await supabase
      .from('inspecao_respostas')
      .select('respostas')
      .eq('id', id)
      .single();

    if (inspecaoError) {
      return res.status(400).json({ error: inspecaoError.message });
    }

    // Mesclar respostas (manter análise_foto se existir)
    const respostasAtualizadas = {
      ...(inspecaoData.respostas || {}),
      ...respostas,
    };

    // Atualizar inspeção
    const { data, error } = await supabase
      .from('inspecao_respostas')
      .update({
        respostas: respostasAtualizadas,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(200).json({
      success: true,
      inspecao: data,
      message: 'Inspeção atualizada com sucesso',
    });
  } catch (error) {
    console.error('[Vistoria] Erro ao atualizar inspeção:', error);
    return res.status(500).json({
      error: `Erro ao atualizar inspeção: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    });
  }
});


export default router;
