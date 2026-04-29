import express from 'express';
import multer from 'multer';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// ✅ Configuração do Supabase
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ Configuração do Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ✅ Configuração do Multer
const upload = multer({ storage: multer.memoryStorage() });

// ✅ Fila para evitar requisições simultâneas
const analysisQueue: Array<() => Promise<void>> = [];
let isProcessing = false;

async function processQueue() {
  if (isProcessing || analysisQueue.length === 0) return;
  
  isProcessing = true;
  const task = analysisQueue.shift();
  if (task) {
    try {
      await task();
    } catch (error) {
      console.error('[Queue] Erro ao processar tarefa:', error);
    }
  }
  isProcessing = false;
  
  // Processar próxima tarefa após 2 segundos
  setTimeout(processQueue, 2000);
}

// ✅ Função para converter imagem para base64
async function imagemParaBase64(fotoUrl: string): Promise<string> {
  try {
    console.log('[Base64] Baixando imagem:', fotoUrl);
    const response = await axios.get(fotoUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    console.log('[Base64] Imagem convertida:', base64.length, 'caracteres');
    
    return base64;
  } catch (error) {
    console.error('[Base64] Erro ao converter imagem:', error);
    throw error;
  }
}

// ✅ Função para analisar foto com Gemini (usando inline_data com base64)
async function analisarFotoComGemini(
  fotoUrl: string,
  numeroSerie: string,
  fotoNome: string,
  fotoId: number,
  vistoriaId: string
): Promise<void> {
  try {
    console.log('[Gemini] Iniciando análise da foto', fotoId);
    
    // ✅ Converter imagem para base64
    const base64 = await imagemParaBase64(fotoUrl);
    
    // ✅ Prompt para análise
    const prompt = `Você é um especialista em inspeção de equipamentos de TI. Analise a foto do equipamento e forneça uma avaliação detalhada.

Número de série: ${numeroSerie}
Nome da foto: ${fotoNome}

Analise o estado do equipamento na imagem e responda em JSON com a seguinte estrutura exata:
{
  "status": "OK" ou "AVARIA",
  "danos": ["lista de danos encontrados, ou [] se nenhum"],
  "descricao": "descrição detalhada do estado do equipamento",
  "recomendacao": "recomendação de ação"
}

Seja preciso, objetivo e detalhado. Responda APENAS com o JSON, sem explicações adicionais.`;

    // ✅ Chamar Gemini Pro com inline_data (base64)
    console.log('[Gemini] Enviando para API do Gemini (usando inline_data com base64)...');
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
                  data: base64, // ✅ CORRETO: base64 em inline_data
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
        timeout: 120000, // 2 minutos
      }
    );

    // ✅ Processar resposta do Gemini
    const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) {
      throw new Error('Resposta vazia do Gemini');
    }

    console.log('[Gemini] Resposta recebida:', responseText.substring(0, 100));

    // ✅ Parsear JSON da resposta
    let resultado;
    try {
      resultado = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Gemini] Erro ao parsear JSON:', parseError);
      resultado = {
        status: 'ERRO',
        danos: [],
        descricao: 'Erro ao processar resposta do Gemini',
        recomendacao: 'Tente novamente',
      };
    }

    // ✅ Salvar resultado no Supabase
    console.log('[Supabase] Salvando resultado da análise...');
    
    const { data, error } = await supabase
      .from('analises_fotos')
      .insert({
        numero_serie: numeroSerie,
        foto_id: fotoId,
        vistoria_id: vistoriaId,
        prompt_enviado: prompt,
        resultado_gptmaker: JSON.stringify(resultado),
        status: resultado.status || 'pendente',
      });

    if (error) {
      console.error('[Supabase] Erro ao salvar análise:', error);
      throw error;
    }

    console.log('[Supabase] Análise salva com sucesso:', data);
  } catch (error) {
    console.error('[Gemini] Erro na análise:', error);
    
    // ✅ Salvar erro no Supabase
    try {
      await supabase
        .from('analises_fotos')
        .insert({
          numero_serie: numeroSerie,
          foto_id: fotoId,
          vistoria_id: vistoriaId,
          prompt_enviado: '',
          resultado_gptmaker: JSON.stringify({
            status: 'ERRO',
            danos: [],
            descricao: String(error),
            recomendacao: 'Tente novamente',
          }),
          status: 'erro',
        });
    } catch (dbError) {
      console.error('[Supabase] Erro ao salvar erro:', dbError);
    }
  }
}

// ✅ Rota para upload de foto
router.post('/upload-foto', upload.single('foto'), async (req, res) => {
  try {
    console.log('[inspecao.ts] Iniciando upload de foto...');
    
    const { vistoria_id, numero_serie } = req.body;
    const file = req.file;

    if (!file || !vistoria_id || !numero_serie) {
      return res.status(400).json({
        error: 'Faltam dados obrigatórios: foto, vistoria_id, numero_serie',
      });
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
      console.error('[inspecao.ts] Erro ao salvar foto:', uploadError);
      return res.status(500).json({ error: 'Erro ao salvar foto' });
    }

    console.log('[inspecao.ts] Foto salva no storage:', uploadData);

    // ✅ Gerar URL pública
    const { data: publicData } = supabase.storage
      .from('fotos')
      .getPublicUrl(fileName);

    const fotoUrl = publicData.publicUrl;
    console.log('[inspecao.ts] URL pública:', fotoUrl);

    // ✅ Salvar foto no banco de dados
    const { data: fotoData, error: fotoError } = await supabase
      .from('fotos_vistoria')
      .insert({
        vistoria_id,
        foto_nome: file.originalname,
        foto_tipo: 'equipamento',
        tamanho_bytes: file.size,
        foto_url: fotoUrl,
      })
      .select();

    if (fotoError) {
      console.error('[inspecao.ts] Erro ao salvar foto no banco:', fotoError);
      return res.status(500).json({ error: 'Erro ao salvar foto no banco' });
    }

    console.log('[inspecao.ts] Foto salva no banco com sucesso:', fotoData);

    const fotoId = fotoData[0].id;

    // ✅ Adicionar análise à fila
    analysisQueue.push(() =>
      analisarFotoComGemini(fotoUrl, numero_serie, file.originalname, fotoId, vistoria_id)
    );
    
    processQueue();

    // ✅ Responder ao cliente imediatamente
    res.json({
      success: true,
      id: fotoId,
      foto_url: fotoUrl,
      foto_nome: file.originalname,
      message: 'Foto enviada com sucesso. Análise em progresso...',
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro geral:', error);
    res.status(500).json({ error: 'Erro ao processar upload' });
  }
});

// ✅ Rota para salvar inspeção
router.post('/salvar', async (req, res) => {
  try {
    const { vistoria_id, equipamento_id, status, observacoes } = req.body;

    const { data, error } = await supabase
      .from('vistorias')
      .update({
        status,
        observacoes,
        updated_at: new Date(),
      })
      .eq('id', vistoria_id);

    if (error) {
      return res.status(500).json({ error: 'Erro ao salvar inspeção' });
    }

    console.log('[inspecao.ts] Inspeção salva com sucesso:', data);
    res.json({ success: true, data });
  } catch (error) {
    console.error('[inspecao.ts] Erro ao salvar inspeção:', error);
    res.status(500).json({ error: 'Erro ao salvar inspeção' });
  }
});

// ✅ Rota para obter equipamento
router.get('/equipamento/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('contrato_equipamentos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json(data);
  } catch (error) {
    console.error('[inspecao.ts] Erro ao obter equipamento:', error);
    res.status(500).json({ error: 'Erro ao obter equipamento' });
  }
});

// ✅ Rota para obter perguntas
router.get('/perguntas/:tipo', async (req, res) => {
  try {
    const { tipo } = req.params;

    const { data, error } = await supabase
      .from('perguntas_inspecao')
      .select('*')
      .eq('tipo_equipamento', tipo);

    if (error) {
      return res.status(500).json({ error: 'Erro ao obter perguntas' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('[inspecao.ts] Erro ao obter perguntas:', error);
    res.status(500).json({ error: 'Erro ao obter perguntas' });
  }
});

export default router;
