// backend/src/routes/clientesroutes.ts - NOVO

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../config/database.js';
import { CreateClientRequest, CreateContratoRequest, AddContratoEquipamentoRequest } from '../types/index.js';

const router = Router();

// ============ ROTAS PARA ANALISTAS ============

// Criar novo contrato
router.post('/contratos', async (req: Request, res: Response) => {
  try {
    const { numero_contrato, nome_cliente, cnpj_cliente }: CreateContratoRequest = req.body;

    if (!numero_contrato || !nome_cliente) {
      return res.status(400).json({ error: 'Número do contrato e nome do cliente são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('contratos')
      .insert([{
        numero_contrato,
        nome_cliente,
        cnpj_cliente,
        status: 'active',
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      data: data[0],
      message: 'Contrato criado com sucesso',
    });
  } catch (error) {
    console.error('Erro ao criar contrato:', error);
    res.status(500).json({ error: 'Erro ao criar contrato' });
  }
});

// Listar todos os contratos
router.get('/contratos', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .order('data_criacao', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Erro ao listar contratos:', error);
    res.status(500).json({ error: 'Erro ao listar contratos' });
  }
});

// Obter contrato por ID
router.get('/contratos/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', id)
      .single();

    if (contratoError || !contrato) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Buscar equipamentos do contrato
    const { data: equipamentos, error: equipError } = await supabase
      .from('contrato_equipamentos')
      .select('*')
      .eq('contrato_id', id)
      .order('data_criacao', { ascending: false });

    if (equipError) {
      return res.status(400).json({ error: equipError.message });
    }

    res.json({
      success: true,
      data: {
        ...contrato,
        equipamentos: equipamentos || [],
      },
    });
  } catch (error) {
    console.error('Erro ao obter contrato:', error);
    res.status(500).json({ error: 'Erro ao obter contrato' });
  }
});

// Adicionar equipamento ao contrato
router.post('/contratos/:id/equipamentos', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { numero_serie, modelo, material, meses_garantia }: AddContratoEquipamentoRequest = req.body;

    if (!numero_serie || !modelo) {
      return res.status(400).json({ error: 'Número de série e modelo são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('contrato_equipamentos')
      .insert([{
        contrato_id: id,
        numero_serie,
        modelo,
        material,
        meses_garantia: meses_garantia || 12,
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      data: data[0],
      message: 'Equipamento adicionado ao contrato',
    });
  } catch (error) {
    console.error('Erro ao adicionar equipamento:', error);
    res.status(500).json({ error: 'Erro ao adicionar equipamento' });
  }
});

// Criar novo cliente (usuário tipo 'client')
router.post('/criar-cliente', async (req: Request, res: Response) => {
  try {
    const { email, nome, contrato_id, senha }: CreateClientRequest = req.body;

    if (!email || !nome || !contrato_id || !senha) {
      return res.status(400).json({ error: 'Email, nome, contrato e senha são obrigatórios' });
    }

    // Verificar se contrato existe
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('id')
      .eq('id', contrato_id)
      .single();

    if (contratoError || !contrato) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Verificar se email já existe
    const { data: usuarioExistente } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (usuarioExistente) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Criar usuário cliente
    const { data, error } = await supabase
      .from('usuarios')
      .insert([{
        email,
        nome,
        contrato_id,
        senha_hash: senha,  // Em produção, usar bcrypt
        user_type: 'client',
        role: 'VIEWER',
        ativo: true,
      }])
      .select();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({
      success: true,
      data: {
        id: data[0].id,
        email: data[0].email,
        nome: data[0].nome,
        user_type: data[0].user_type,
      },
      message: 'Cliente criado com sucesso',
      credenciais: {
        email,
        senha,  // Mostrar apenas na criação
      },
    });
  } catch (error) {
    console.error('Erro ao criar cliente:', error);
    res.status(500).json({ error: 'Erro ao criar cliente' });
  }
});

// Listar clientes
router.get('/clientes', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, contrato_id, ativo, data_criacao')
      .eq('user_type', 'client')
      .order('data_criacao', { ascending: false });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('Erro ao listar clientes:', error);
    res.status(500).json({ error: 'Erro ao listar clientes' });
  }
});

// ============ ROTAS PARA CLIENTES ============

// Obter dados do contrato do cliente (autenticado)
router.get('/meu-contrato', async (req: Request, res: Response) => {
  try {
    // Obter usuário do token (implementar middleware de autenticação)
    const userId = (req as any).userId;  // Vem do middleware de auth

    if (!userId) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    // Buscar usuário para pegar contrato_id
    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('contrato_id')
      .eq('id', userId)
      .single();

    if (usuarioError || !usuario || !usuario.contrato_id) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Buscar contrato
    const { data: contrato, error: contratoError } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', usuario.contrato_id)
      .single();

    if (contratoError || !contrato) {
      return res.status(404).json({ error: 'Contrato não encontrado' });
    }

    // Buscar equipamentos do contrato
    const { data: equipamentos, error: equipError } = await supabase
      .from('contrato_equipamentos')
      .select('*')
      .eq('contrato_id', usuario.contrato_id);

    if (equipError) {
      return res.status(400).json({ error: equipError.message });
    }

    res.json({
      success: true,
      data: {
        ...contrato,
        equipamentos: equipamentos || [],
      },
    });
  } catch (error) {
    console.error('Erro ao obter contrato:', error);
    res.status(500).json({ error: 'Erro ao obter contrato' });
  }
});

export default router;
