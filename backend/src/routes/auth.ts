// backend/src/routes/auth.ts - VERSÃO ATUALIZADA

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';
import { env } from '../config/env.js';
import { TokenPayload } from '../types/index.js';

const router = Router();

// Login unificado - detecta tipo de usuário (analyst ou client)
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Buscar usuário no banco
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Validar senha (usar bcrypt em produção)
    const senhaValida = usuario.senha_hash === password;
    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Verificar se usuário está ativo
    if (!usuario.ativo) {
      return res.status(403).json({ error: 'Usuário inativo' });
    }

    // Buscar contrato se for cliente
    let contrato = null;
    if (usuario.user_type === 'client' && usuario.contrato_id) {
      const { data: contratoData } = await supabase
        .from('contratos')
        .select('*')
        .eq('id', usuario.contrato_id)
        .single();
      contrato = contratoData;
    }

    // Criar token JWT com informações do usuário
    const payload: TokenPayload = {
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
      user_type: usuario.user_type,  // NOVO: tipo de usuário
      contrato_id: usuario.contrato_id,  // NOVO: contrato do cliente
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

    // Retornar resposta com tipo de usuário
    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
        user_type: usuario.user_type,  // NOVO
        contrato_id: usuario.contrato_id,  // NOVO
      },
      contrato: contrato,  // NOVO: dados do contrato para cliente
      portal: usuario.user_type === 'analyst' ? 'analista' : 'cliente',  // NOVO: qual portal mostrar
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logout realizado' });
});

export default router;
