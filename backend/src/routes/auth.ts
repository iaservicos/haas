import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/database.js';
import { env } from '../config/env.js';
import { TokenPayload } from '../types/index.js';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !usuario) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const senhaValida = usuario.senha_hash === password;
if (!senhaValida) {
  return res.status(401).json({ error: 'Credenciais inválidas' });
}

    if (!usuario.ativo) {
      return res.status(403).json({ error: 'Usuário inativo' });
    }

    const payload: TokenPayload = {
      userId: usuario.id,
      email: usuario.email,
      role: usuario.role,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logout realizado' });
});

export default router;
