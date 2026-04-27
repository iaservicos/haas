import express from 'express';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import componentesRoutes from './routes/componentes.js';
import fotosRoutes from './routes/fotos.js';
import usuarioRoutes from './routes/usuarioroutes.js';
import gptmakerRoutes from './routes/gptmakerRoutes.js';
import clientesRoutes from './routes/clientesroutes.js';
import confirmacoeRoutes from './routes/confirmacoes.js';
import inspecaoRoutes from './routes/inspecao.js';

const app = express();

app.use(corsOptions);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.options('*', corsOptions);

app.use('/api/auth', authRoutes);
app.use('/api/componentes', componentesRoutes);
app.use('/api/fotos', fotosRoutes);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/gptmaker', gptmakerRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/confirmacoes', confirmacoeRoutes);
app.use('/api/inspecao', inspecaoRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

testConnection().then(() => {
  app.listen(env.PORT, () => {
    console.log(`✓ Servidor rodando em http://localhost:${env.PORT}`);
    console.log(`✓ Ambiente: ${env.NODE_ENV}`);
  });
});
