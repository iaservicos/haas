import express from 'express';
import multer from 'multer';
import axios from 'axios';
import type { EquipmentType } from '../config/equipmentQuestions.js';
import { supabase } from '../config/database.js';
import { getQuestionsByEquipmentType } from '../config/equipmentQuestions.js';

const router = express.Router();

// ✅ Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

// ✅ Configuração do Gemini (substituindo GPTMaker)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ✅ Configuração do Supabase Storage
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const STORAGE_BUCKET = 'fotos';

/**
 * GET /api/inspecao/equipamento/:equipamentoId
 * Retorna o tipo de equipamento pelo ID
 */
router.get('/equipamento/:equipamentoId', async (req, res ) => {
  try {
    const { equipamentoId } = req.params;

    const { data, error } = await supabase
      .from('contrato_equipamentos')
      .select('tipo_material, numero_serie, modelo')
      .eq('id', equipamentoId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Equipamento não encontrado' });
    }

    res.json({
      success: true,
      data: {
        id: equipamentoId,
        tipo_material: data.tipo_material,
        numero_serie: data.numero_serie,
        modelo: data.modelo,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar equipamento:', error);
    res.status(500).json({ error: 'Erro ao buscar equipamento' });
  }
});

/**
 * GET /api/inspecao/perguntas/:equipmentType
 * Retorna as perguntas para um tipo de equipamento específico
 */
router.get('/perguntas/:equipmentType', async (req, res) => {
  try {
    const { equipmentType } = req.params;
    
    // Validar tipo de equipamento
    const validTypes = [
      'Desktop', 'Monitor', 'Notebook', 'MiniPro', 'All in One',
      'Duo', 'Tablet', 'Chromebook', 'Máquina de pagamento', 'Diversos', 'Celular'
    ];
    
    if (!validTypes.includes(equipmentType)) {
      return res.status(400).json({ 
        error: 'Tipo de equipamento inválido',
        validTypes 
      });
    }

    const questions = getQuestionsByEquipmentType(equipmentType as EquipmentType);

    res.json({
      equipmentType,
      questions,
      totalQuestions: questions.length,
    });
  } catch (error) {
    console.error('Erro ao buscar perguntas:', error);
    res.status(500).json({ error: 'Erro ao buscar perguntas' });
  }
});

/**
 * POST /api/inspecao/salvar
 * Salva as respostas da inspeção com equipamento_id
 */
router.post('/salvar', async (req, res) => {
  try {
    const { vistoriaId, equipmentType, answers, observacoes, equipamento_id } = req.body;

    if (!vistoriaId || !equipmentType || !answers) {
      return res.status(400).json({ 
        error: 'Dados incompletos: vistoriaId, equipmentType e answers são obrigatórios' 
      });
    }

    // Construir objeto de inserção
    const insertData: any = {
      vistoria_id: vistoriaId,
      equipment_type: equipmentType,
      respostas: answers,
      observacoes: observacoes || null,
      data_inspecao: new Date().toISOString(),
    };

    // Adicionar equipamento_id se fornecido
    if (equipamento_id) {
      insertData.equipamento_id = equipamento_id;
      console.log(`[inspecao.ts] Salvando inspeção com equipamento_id: ${equipamento_id}`);
    }

    // Salvar respostas no banco de dados
    const { data, error } = await supabase
      .from('inspecao_respostas')
      .insert(insertData)
      .select();

    if (error) {
      console.error('Erro ao salvar respostas:', error);
      return res.status(500).json({ 
        error: 'Erro ao salvar respostas',
        details: error.message 
      });
    }

    console.log('[inspecao.ts] Inspeção salva com sucesso:', data[0]);

    // Atualizar status da vistoria (se existir)
    try {
      await supabase
        .from('vistorias')
        .update({ status: 'inspecionada' })
        .eq('id', vistoriaId);
    } catch (updateError) {
      console.log('[inspecao.ts] Aviso: Não foi possível atualizar status da vistoria', updateError);
    }

    res.json({
      success: true,
      message: 'Inspeção salva com sucesso',
      data: data[0],
    });
  } catch (error) {
    console.error('Erro ao salvar inspeção:', error);
    res.status(500).json({ 
      error: 'Erro ao salvar inspeção',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * ✅ Função para converter imagem para base64
 */
async function imagemParaBase64(fotoUrl: string): Promise<string> {
  try {
    console.log('[Gemini] Baixando imagem para base64...');
    const response = await axios.get(fotoUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });
    
    const base64 = Buffer.from(response.data).toString('base64');
    console.log('[Gemini] Imagem convertida para base64:', base64.length, 'caracteres');
    
    return base64;
  } catch (error) {
    console.error('[Gemini] Erro ao converter imagem para base64:', error);
    throw error;
  }
}

/**
 * ✅ Função para analisar foto com Gemini (usando inline_data com base64)
 */
async function analisarFotoComGemini(
  fotoId: number,
  numeroSerie: string,
  vistoriaId: string,
  fotoUrl: string,
  fotoNome: string
) {
  try {
    console.log(`[Gemini] Iniciando análise da foto ${fotoId}...`);

    if (!GEMINI_API_KEY) {
      console.error('[Gemini] GEMINI_API_KEY não configurada');
      return;
    }

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

    console.log('[Supabase] Análise salva com sucesso');
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

/**
 * ✅ POST /api/inspecao/upload-foto
 * 1. Salva foto no Supabase Storage (bucket 'fotos')
 * 2. Obtém URL pública
 * 3. Envia para Gemini analisar em background
 */
router.post('/upload-foto', (upload.single('file') as any), async (req: any, res: any) => {
  try {
    console.log('[inspecao.ts] Iniciando upload de foto...');

    const { vistoria_id, foto_nome, foto_tipo, numero_serie } = req.body;
    const file = req.file;

    // Validar dados obrigatórios
    if (!vistoria_id || !file) {
      return res.status(400).json({
        error: 'Dados incompletos: vistoria_id e arquivo são obrigatórios'
      });
    }

    console.log('[inspecao.ts] vistoria_id:', vistoria_id);
    console.log('[inspecao.ts] foto_nome:', foto_nome);
    console.log('[inspecao.ts] numero_serie:', numero_serie);
    console.log('[inspecao.ts] tamanho_bytes:', file.size);

    // ✅ Salvar foto no Supabase Storage
    const fileName = `${vistoria_id}/${Date.now()}-${foto_nome || file.originalname}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(STORAGE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('[inspecao.ts] Erro ao fazer upload no storage:', uploadError);
      return res.status(500).json({
        error: 'Erro ao fazer upload da foto',
        details: uploadError.message
      });
    }

    console.log('[inspecao.ts] Foto salva no storage:', uploadData);

    // ✅ Obter URL pública da foto
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`;

    console.log('[inspecao.ts] URL pública:', publicUrl);

    // ✅ Salvar registro no banco de dados com URL pública
    const { data, error } = await supabase
      .from('fotos_vistoria')
      .insert({
        vistoria_id: vistoria_id,
        foto_url: publicUrl,
        foto_nome: foto_nome || file.originalname,
        foto_tipo: foto_tipo || file.mimetype,
        tamanho_bytes: file.size,
      })
      .select();

    if (error) {
      console.error('[inspecao.ts] Erro ao salvar foto no banco:', error);
      return res.status(500).json({
        error: 'Erro ao salvar foto',
        details: error.message
      });
    }

    console.log('[inspecao.ts] Foto salva no banco com sucesso:', data[0]);

    // ✅ Enviar para Gemini analisar em background
    if (numero_serie) {
      setImmediate(() => {
        analisarFotoComGemini(
          data[0].id,
          numero_serie,
          vistoria_id,
          publicUrl,
          foto_nome || file.originalname
        ).catch(err => console.error('[inspecao.ts] Erro em background:', err));
      });
    }

    // ✅ Responder ao cliente imediatamente (SEM mostrar análise)
    res.json({
      success: true,
      message: 'Foto enviada com sucesso',
      id: data[0].id,
      data: {
        id: data[0].id,
        foto_url: publicUrl,
        foto_nome: data[0].foto_nome,
      },
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro ao fazer upload de foto:', error);
    res.status(500).json({
      error: 'Erro ao fazer upload de foto',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/inspecao/:vistoriaId
 * Retorna as respostas de uma inspeção específica
 */
router.get('/:vistoriaId', async (req, res) => {
  try {
    const { vistoriaId } = req.params;

    const { data, error } = await supabase
      .from('inspecao_respostas')
      .select('*')
      .eq('vistoria_id', vistoriaId)
      .single();

    if (error) {
      console.error('Erro ao buscar inspeção:', error);
      return res.status(404).json({ error: 'Inspeção não encontrada' });
    }

    res.json(data);
  } catch (error) {
    console.error('Erro ao buscar inspeção:', error);
    res.status(500).json({ error: 'Erro ao buscar inspeção' });
  }
});

export default router;
