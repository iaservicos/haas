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

    const senhaValida = await bcrypt.compare(password, usuario.senha_hash);
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
      user_type: usuario.user_type, // ✅ Adicionado user_type
    };

    // ⚡ MUDANÇA: Token expira em 40 minutos (em vez de 24h)
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '40m' });

    res.json({
      token,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        role: usuario.role,
        user_type: usuario.user_type, // ✅ Adicionado user_type
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

router.post('/logout', (req: Request, res: Response) => {
  res.json({ message: 'Logout realizado' });
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .select('id, email, nome, role, user_type') // ✅ Adicionado user_type
      .eq('id', decoded.userId)
      .single();

    if (error || !usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    res.json({ usuario });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});

export default router;

