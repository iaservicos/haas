import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { TokenPayload } from '../types/index.js';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  console.log('[authMiddleware] Verificando token...');
  console.log('[authMiddleware] Token existe:', !!token);

  if (!token) {
    console.log('[authMiddleware] ❌ Token não fornecido');
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    console.log('[authMiddleware] ✅ Token válido, decoded:', decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('[authMiddleware] ❌ Token inválido:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
}

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  next();
}
