// backend/src/routes/confirmacoes.ts - VERSÃO QUE FUNCIONA

import { Router, Request, Response } from 'express';
import { supabase } from '../config/database.js';

const router = Router();

// ============ ROTAS PARA CLIENTES ============

// Obter minhas confirmações
router.get('/minhas-confirmacoes', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const { data, error } = await supabase
      .from('cliente_confirmacoes')
      .select('*')
      .eq('usuario_id', userId)
      .order('data_criacao', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Erro ao obter confirmações:', error);
    res.status(500).json({ error: 'Erro ao obter confirmações' });
  }
});

// Enviar confirmação com foto (URL já vem do frontend)
router.post('/enviar-confirmacao', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    const {
      equipamento_id,
      equipamento_ligado,
      sem_problemas_visuais,
      funcionando_normalmente,
      fonte_presente,
      teclado_presente,
      mouse_presente,
      url_foto,
    } = req.body;

    if (!equipamento_id || !url_foto) {
      return res.status(400).json({ error: 'Equipamento e foto são obrigatórios' });
    }

    // Verificar se já existe confirmação para este equipamento
    const { data: existente } = await supabase
      .from('cliente_confirmacoes')
      .select('id')
      .eq('equipamento_id', equipamento_id)
      .eq('usuario_id', userId)
      .single();

    let confirmacao;

    if (existente) {
      // Atualizar confirmação existente
      const { data, error } = await supabase
        .from('cliente_confirmacoes')
        .update({
          equipamento_ligado,
          sem_problemas_visuais,
          funcionando_normalmente,
          fonte_presente,
          teclado_presente,
          mouse_presente,
          url_foto,
          status_analise: 'concluido',
          resultado_analise: 'ok',
          data_envio: new Date().toISOString(),
        })
        .eq('id', existente.id)
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      confirmacao = data[0];
    } else {
      // Criar nova confirmação
      const { data, error } = await supabase
        .from('cliente_confirmacoes')
        .insert([
          {
            equipamento_id,
            usuario_id: userId,
            equipamento_ligado,
            sem_problemas_visuais,
            funcionando_normalmente,
            fonte_presente,
            teclado_presente,
            mouse_presente,
            url_foto,
            status_analise: 'concluido',
            resultado_analise: 'ok',
            data_envio: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      confirmacao = data[0];
    }

    res.json({
      success: true,
      data: confirmacao,
      message: 'Confirmação enviada com sucesso!',
    });
  } catch (error) {
    console.error('Erro ao enviar confirmação:', error);
    res.status(500).json({ error: 'Erro ao enviar confirmação' });
  }
});

// ============ ROTAS PARA ANALISTAS ============

// Listar confirmações de clientes (para analista ver)
router.get('/confirmacoes-clientes', async (req: Request, res: Response) => {
  try {
    // Verificar se é analista
    const userRole = (req as any).userRole;
    if (userRole !== 'ADMIN' && userRole !== 'ANALISTA') {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const { data, error } = await supabase
      .from('cliente_confirmacoes')
      .select(
        `
        *,
        equipamento:contrato_equipamentos(numero_serie, modelo, tipo_equipamento),
        usuario:usuarios(email, nome)
      `
      )
      .order('data_criacao', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Erro ao listar confirmações:', error);
    res.status(500).json({ error: 'Erro ao listar confirmações' });
  }
});

// Obter detalhes de uma confirmação
router.get('/confirmacoes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('cliente_confirmacoes')
      .select(
        `
        *,
        equipamento:contrato_equipamentos(numero_serie, modelo, tipo_equipamento),
        usuario:usuarios(email, nome)
      `
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Confirmação não encontrada' });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Erro ao obter confirmação:', error);
    res.status(500).json({ error: 'Erro ao obter confirmação' });
  }
});

export default router;