import express, { RequestHandler } from 'express';
import multer from 'multer';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// ✅ Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ Configuração do Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// ✅ Configuração do Multer
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Fila de processamento (em memória)
interface QueueItem {
  fotoId: number;
  vistoriaId: string;
  numeroSerie: string;
  fotoUrl: string;
  timestamp: number;
}

const processingQueue: QueueItem[] = [];
let isProcessing = false;

/**
 * ✅ Função para processar a fila de análises
 */
async function processQueue() {
  if (isProcessing || processingQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (processingQueue.length > 0) {
    const item = processingQueue.shift();
    if (!item) break;

    try {
      console.log(`[Fila] Processando foto ${item.fotoId}...`);
      await analisarFotoComGemini(item);
      console.log(`[Fila] Foto ${item.fotoId} processada com sucesso`);
    } catch (error) {
      console.error(`[Fila] Erro ao processar foto ${item.fotoId}:`, error);
      // Registrar erro no banco
      await supabase
        .from('analises_fotos')
        .insert({
          foto_id: item.fotoId,
          vistoria_id: item.vistoriaId,
          numero_serie: item.numeroSerie,
          status: 'erro',
          resultado_gptmaker: JSON.stringify({ erro: 'Falha ao processar' }),
        });
    }

    // Aguardar 3 segundos entre requisições para evitar rate limit
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  isProcessing = false;
}

/**
 * ✅ Função para converter imagem para base64
 */
async function imagemParaBase64(fotoUrl: string): Promise<string> {
  try {
    console.log('[Gemini] Baixando imagem para base64...');

    const response = await axios.get(fotoUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      maxContentLength: 10 * 1024 * 1024,
    });

    console.log('[Gemini] Imagem baixada:', response.data.length, 'bytes');

    const base64 = Buffer.from(response.data).toString('base64');
    console.log('[Gemini] Imagem convertida para base64:', base64.length, 'caracteres');

    // Limitar tamanho do base64 a 5MB
    if (base64.length > 5 * 1024 * 1024) {
      console.warn('[Gemini] Base64 muito grande, truncando...');
      return base64.substring(0, 5 * 1024 * 1024);
    }

    return base64;
  } catch (error) {
    console.error('[Gemini] Erro ao converter imagem para base64:', error);
    throw error;
  }
}

/**
 * ✅ Função para analisar foto com Gemini (ASSÍNCRONA)
 */
async function analisarFotoComGemini(item: QueueItem): Promise<void> {
  try {
    // ✅ Converter imagem para base64
    const base64 = await imagemParaBase64(item.fotoUrl);

    const prompt = `Você é um especialista em análise de equipamentos para vistorias técnicas.

Analise a foto do equipamento e forneça:
1. Status: "OK" se o equipamento está em bom estado, "AVARIA" se há problemas
2. Danos: Lista de danos identificados (se houver)
3. Descrição: Descrição detalhada do estado do equipamento
4. Recomendação: Recomendação de ação (reparo, substituição, etc.)

Responda APENAS com JSON válido, sem explicações:
{
  "status": "OK" ou "AVARIA",
  "danos": ["lista", "de", "danos"],
  "descricao": "descrição detalhada",
  "recomendacao": "recomendação de ação"
}`;

    console.log('[Gemini] Enviando para API do Gemini...');

    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: base64,
                },
              },
            ],
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000,
        maxContentLength: 10 * 1024 * 1024,
        maxBodyLength: 10 * 1024 * 1024,
      }
    );

    console.log('[Gemini] Resposta recebida do Gemini');

    // ✅ Processar resposta do Gemini
    const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('Nenhuma resposta do Gemini');
    }

    console.log('[Gemini] Resposta:', responseText);

    // ✅ Parse JSON
    const resultado = JSON.parse(responseText);

    // ✅ Salvar resultado no Supabase
    const { error } = await supabase
      .from('analises_fotos')
      .insert({
        foto_id: item.fotoId,
        vistoria_id: item.vistoriaId,
        numero_serie: item.numeroSerie,
        status: resultado.status === 'OK' ? 'ok' : 'avaria',
        resultado_gptmaker: JSON.stringify(resultado),
      });

    if (error) {
      console.error('[Supabase] Erro ao salvar resultado:', error);
      throw error;
    }

    console.log('[Supabase] Resultado salvo com sucesso');
  } catch (error) {
    console.error('[Gemini] Erro na análise:', error);
    throw error;
  }
}

/**
 * ✅ POST /api/inspecao/upload-foto
 * Cliente faz upload da foto (retorna imediatamente)
 */
const uploadFotoHandler: RequestHandler = async (req, res) => {
  try {
    console.log('[inspecao.ts] Iniciando upload de foto...');

    const { vistoria_id, numero_serie, foto_tipo } = req.body;
    const file = req.file;

    if (!file || !vistoria_id || !numero_serie) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    console.log('[inspecao.ts] vistoria_id:', vistoria_id);
    console.log('[inspecao.ts] foto_nome:', file.originalname);
    console.log('[inspecao.ts] numero_serie:', numero_serie);
    console.log('[inspecao.ts] tamanho_bytes:', file.size);

    // ✅ Salvar foto no Supabase Storage
    const fileName = `${vistoria_id}/${Date.now()}-${file.originalname}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('fotos')
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
      });

    if (uploadError) {
      console.error('[inspecao.ts] Erro ao salvar no storage:', uploadError);
      return res.status(500).json({ erro: 'Erro ao salvar foto' });
    }

    console.log('[inspecao.ts] Foto salva no storage:', uploadData);

    // ✅ Gerar URL pública
    const { data: urlData } = supabase.storage
      .from('fotos')
      .getPublicUrl(uploadData.path);

    const fotoUrl = urlData.publicUrl;
    console.log('[inspecao.ts] URL pública:', fotoUrl);

    // ✅ Salvar foto no banco de dados
    const { data: fotoData, error: fotoError } = await supabase
      .from('fotos_vistoria')
      .insert({
        vistoria_id,
        foto_nome: file.originalname,
        foto_tipo: foto_tipo || 'equipamento',
        tamanho_bytes: file.size,
        foto_url: fotoUrl,
      })
      .select();

    if (fotoError || !fotoData || fotoData.length === 0) {
      console.error('[inspecao.ts] Erro ao salvar no banco:', fotoError);
      return res.status(500).json({ erro: 'Erro ao salvar foto' });
    }

    const fotoId = fotoData[0].id;
    console.log('[inspecao.ts] Foto salva no banco com sucesso:', fotoData[0]);

    // ✅ Adicionar à fila de processamento
    processingQueue.push({
      fotoId,
      vistoriaId: vistoria_id,
      numeroSerie: numero_serie,
      fotoUrl,
      timestamp: Date.now(),
    });

    console.log('[Fila] Foto adicionada à fila. Tamanho da fila:', processingQueue.length);

    // ✅ Iniciar processamento da fila (em background)
    setImmediate(() => processQueue());

    // ✅ Retornar imediatamente (sem esperar análise)
    res.status(200).json({
      id: fotoId,
      foto_url: fotoUrl,
      foto_nome: file.originalname,
      mensagem: 'Foto enviada com sucesso. Análise em progresso.',
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro na análise, mas continuando:', error);
    res.status(500).json({ erro: 'Erro ao processar foto' });
  }
};

router.post('/upload-foto', upload.single('foto'), uploadFotoHandler);

/**
 * ✅ GET /api/inspecao/analises/:vistoriaId
 * Analista consulta resultados das análises
 */
const getAnalisesHandler: RequestHandler = async (req, res) => {
  try {
    const { vistoriaId } = req.params;

    const { data, error } = await supabase
      .from('analises_fotos')
      .select('*')
      .eq('vistoria_id', vistoriaId);

    if (error) {
      console.error('[inspecao.ts] Erro ao buscar análises:', error);
      return res.status(500).json({ erro: 'Erro ao buscar análises' });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('[inspecao.ts] Erro:', error);
    res.status(500).json({ erro: 'Erro ao buscar análises' });
  }
};

router.get('/analises/:vistoriaId', getAnalisesHandler);

export default router;
