// backend/src/routes/confirmacoes.ts - NOVO

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { supabase } from '../config/database.js';
import { invokeLLM } from '../_core/llm.js';  // Seu helper de LLM

const router = Router();

// Configurar multer para upload de fotos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  },
});

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

// Upload de foto
router.post('/upload-foto', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { equipamento_id } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma foto foi enviada' });
    }

    if (!equipamento_id) {
      return res.status(400).json({ error: 'ID do equipamento é obrigatório' });
    }

    // Aqui você pode usar o seu serviço de storage (S3, etc)
    // Por enquanto, vou simular um URL
    const url = `https://storage.example.com/fotos/${Date.now()}-${req.file.originalname}`;

    res.json({
      success: true,
      data: {
        url,
        nome_arquivo: req.file.originalname,
      },
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    res.status(500).json({ error: 'Erro ao fazer upload' });
  }
});

// Enviar confirmação com foto
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
          status_analise: 'analisando',
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
        .insert([{
          equipamento_id,
          usuario_id: userId,
          equipamento_ligado,
          sem_problemas_visuais,
          funcionando_normalmente,
          fonte_presente,
          teclado_presente,
          mouse_presente,
          url_foto,
          status_analise: 'analisando',
          data_envio: new Date().toISOString(),
        }])
        .select();

      if (error) {
        return res.status(400).json({ error: error.message });
      }
      confirmacao = data[0];
    }

    // 3. Enviar para GPT-Maker analisar a foto (async)
    analisarFotoComGPTMaker(confirmacao.id, url_foto).catch(console.error);

    res.json({
      success: true,
      data: confirmacao,
      message: 'Confirmação enviada! Analisando foto...',
    });
  } catch (error) {
    console.error('Erro ao enviar confirmação:', error);
    res.status(500).json({ error: 'Erro ao enviar confirmação' });
  }
});

// ============ FUNÇÃO AUXILIAR: ANALISAR COM GPT-MAKER ============

async function analisarFotoComGPTMaker(confirmacaoId: string, urlFoto: string) {
  try {
    console.log(`Analisando foto para confirmação ${confirmacaoId}`);

    // Chamar GPT-Maker para analisar a foto
    const response = await invokeLLM({
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em análise de equipamentos de TI. Analise a foto do equipamento e responda se está funcionando corretamente ou se há problemas.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analise esta foto do equipamento ligado e me diga: 1) Se o equipamento está funcionando corretamente (OK) ou há problemas (PROBLEMA). 2) Descreva brevemente o que você vê.',
            },
            {
              type: 'image_url',
              image_url: {
                url: urlFoto,
                detail: 'auto',
              },
            },
          ],
        },
      ],
    });

    const analise = response.choices[0].message.content;
    const resultado = analise.toLowerCase().includes('ok') || analise.toLowerCase().includes('funcionando') ? 'ok' : 'problema';

    // Atualizar confirmação com resultado
    await supabase
      .from('cliente_confirmacoes')
      .update({
        status_analise: 'concluido',
        resultado_analise: resultado,
        analise_gptmaker: analise,
      })
      .eq('id', confirmacaoId);

    console.log(`Análise concluída para confirmação ${confirmacaoId}: ${resultado}`);
  } catch (error) {
    console.error('Erro ao analisar foto com GPT-Maker:', error);

    // Atualizar status para erro
    await supabase
      .from('cliente_confirmacoes')
      .update({
        status_analise: 'erro',
      })
      .eq('id', confirmacaoId);
  }
}

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
      .select(`
        *,
        equipamento:contrato_equipamentos(numero_serie, modelo, tipo_equipamento),
        usuario:usuarios(email, nome)
      `)
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
      .select(`
        *,
        equipamento:contrato_equipamentos(numero_serie, modelo, tipo_equipamento),
        usuario:usuarios(email, nome)
      `)
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