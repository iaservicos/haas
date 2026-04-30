import express from 'express';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { testConnection } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import componentesRoutes from './routes/componentes.js';
import fotosRoutes from './routes/fotos.js';
import usuarioRoutes from './routes/usuarioroutes.js';
import clientesRoutes from './routes/clientesroutes.js';
import confirmacoes from './routes/confirmacoes.js';
import inspecaoRoutes from './routes/inspecao.js';
import cronAnaliseRouter from './routes/cron-analise.js';
import vistoriasRoutes from './routes/vistorias.js';

const app = express();

app.use(corsOptions);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.options('*', corsOptions);

app.use('/api/auth', authRoutes);
app.use('/api/componentes', componentesRoutes);
app.use('/api/fotos', fotosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/confirmacoes', confirmacoes);
app.use('/api/inspecao', inspecaoRoutes);
app.use('/api/cron', cronAnaliseRouter);
app.use('/api/usuario', usuarioRoutes);
app.use('/api/vistorias', vistoriasRoutes);



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

