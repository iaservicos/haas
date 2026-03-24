import cors from 'cors';

export const corsOptions = cors({
  origin: [
    // Desenvolvimento
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    // Produção
    'https://haas-5vgy.vercel.app',
    'https://haas-mu.vercel.app',
    'https://portalhaas.iaservicos.online',

  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
} );
