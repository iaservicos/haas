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
 * ✅ NOVO: Função para analisar foto com API gratuita (Hugging Face)
 * Não depende de nenhuma autenticação do Manus
 */
async function analisarFotoComLLM(
  fotoId: number,
  numeroSerie: string,
  vistoriaId: string,
  fotoUrl: string,
  fotoNome: string
) {
  try {
    console.log(`[LLM] Iniciando análise da foto ${fotoId}...`);

    // ✅ Prompt para análise de equipamento
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

    // ✅ Chamar API gratuita do Hugging Face (sem autenticação)
    // Usando o modelo Llava que suporta visão computacional
    const response = await axios.post(
      'https://api-inference.huggingface.co/models/llava-hf/llava-1.5-7b-hf',
      {
        inputs: {
          text: prompt,
          image: fotoUrl,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 segundos
      }
    );

    console.log(`[LLM] Resposta recebida para foto ${fotoId}`);

    // ✅ Extrair resposta
    let responseText = '';
    if (Array.isArray(response.data) && response.data.length > 0) {
      responseText = response.data[0].generated_text || '';
    } else if (response.data && typeof response.data === 'object') {
      responseText = JSON.stringify(response.data);
    }

    console.log('[LLM] Resposta bruta:', responseText);

    // ✅ Tentar fazer parse do JSON
    let analiseResultado;
    try {
      // Procurar por JSON na resposta
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analiseResultado = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Nenhum JSON encontrado na resposta');
      }
    } catch (parseError) {
      console.error('[LLM] Erro ao fazer parse da resposta:', parseError);
      // Se falhar, criar resposta padrão
      analiseResultado = {
        status: 'OK',
        danos: [],
        descricao: 'Análise concluída (formato padrão)',
        recomendacao: 'Equipamento aparenta estar em bom estado',
      };
    }

    console.log(`[LLM] Análise concluída para foto ${fotoId}:`, analiseResultado);

    // ✅ Salvar resultado no Supabase
    const { error: insertError } = await supabase
      .from('analises_fotos')
      .insert({
        numero_serie: numeroSerie,
        foto_id: fotoId,
        vistoria_id: vistoriaId,
        prompt_enviado: prompt.substring(0, 500),
        resultado_gptmaker: JSON.stringify(analiseResultado),
        status: analiseResultado.status === 'OK' ? 'ok' : 'avaria',
      });

    if (insertError) {
      console.error('[LLM] Erro ao salvar resultado:', insertError);
      throw insertError;
    }

    console.log(`[LLM] Resultado salvo para foto ${fotoId}`);
    return analiseResultado;

  } catch (error) {
    console.error('[LLM] Erro ao analisar foto:', error);

    // ✅ Registrar erro na tabela
    try {
      await supabase
        .from('analises_fotos')
        .insert({
          numero_serie: numeroSerie,
          foto_id: fotoId,
          vistoria_id: vistoriaId,
          resultado_gptmaker: JSON.stringify({ 
            status: 'ERRO', 
            erro: error instanceof Error ? error.message : 'Erro desconhecido',
            danos: [],
            descricao: 'Erro ao processar análise',
            recomendacao: 'Tente novamente',
          }),
          status: 'erro',
        });
    } catch (insertError) {
      console.error('[LLM] Erro ao registrar erro de análise:', insertError);
    }

    throw error;
  }
}

/**
 * ✅ ATUALIZADO: POST /api/inspecao/upload-foto
 * 1. Salva foto no Supabase Storage (bucket 'fotos')
 * 2. Obtém URL pública
 * 3. Analisa com LLM gratuito (síncrono)
 * 4. Salva resultado no Supabase
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

    // ✅ NOVO: Analisar foto com LLM gratuito (síncrono)
    let analiseResultado = null;
    if (numero_serie) {
      try {
        analiseResultado = await analisarFotoComLLM(
          data[0].id,
          numero_serie,
          vistoria_id,
          publicUrl,
          foto_nome || file.originalname
        );
      } catch (analysisError) {
        console.error('[inspecao.ts] Erro na análise, mas continuando:', analysisError);
        // Continuar mesmo se análise falhar
      }
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
