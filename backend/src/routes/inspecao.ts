import express, { RequestHandler } from 'express';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// ✅ Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// ✅ Configuração do Multer
const upload = multer({ storage: multer.memoryStorage() });

/**
 * ✅ POST /api/inspecao/upload-foto
 * Cliente faz upload da foto (retorna imediatamente)
 * Análise é feita em background por um cron job externo
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

    // ✅ Criar registro na tabela analises_fotos com status "pendente"
    const { error: analiseError } = await supabase
      .from('analises_fotos')
      .insert({
        foto_id: fotoId,
        vistoria_id,
        numero_serie,
        status: 'pendente',
        prompt_enviado: null,
        resultado_gptmaker: null,
      });

    if (analiseError) {
      console.error('[inspecao.ts] Erro ao criar análise:', analiseError);
      return res.status(500).json({ erro: 'Erro ao criar análise' });
    }

    console.log('[inspecao.ts] Análise criada com status "pendente"');

    // ✅ Retornar imediatamente (sem esperar análise)
    res.status(200).json({
      id: fotoId,
      foto_url: fotoUrl,
      foto_nome: file.originalname,
      mensagem: 'Foto enviada com sucesso. Análise em progresso.',
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro:', error);
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
      .eq('vistoria_id', vistoriaId)
      .order('created_at', { ascending: false });

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

/**
 * ✅ POST /api/inspecao/analises/resultado
 * Webhook para receber resultado da análise do Gemini (cron job externo)
 */
const salvarResultadoHandler: RequestHandler = async (req, res) => {
  try {
    const { foto_id, vistoria_id, resultado, status } = req.body;

    if (!foto_id || !resultado || !status) {
      return res.status(400).json({ erro: 'Dados incompletos' });
    }

    console.log('[inspecao.ts] Salvando resultado da análise:', { foto_id, status });

    // ✅ Atualizar análise com resultado
    const { error } = await supabase
      .from('analises_fotos')
      .update({
        status,
        resultado_gptmaker: JSON.stringify(resultado),
      })
      .eq('foto_id', foto_id);

    if (error) {
      console.error('[inspecao.ts] Erro ao salvar resultado:', error);
      return res.status(500).json({ erro: 'Erro ao salvar resultado' });
    }

    console.log('[inspecao.ts] Resultado salvo com sucesso');
    res.status(200).json({ mensagem: 'Resultado salvo com sucesso' });
  } catch (error) {
    console.error('[inspecao.ts] Erro:', error);
    res.status(500).json({ erro: 'Erro ao salvar resultado' });
  }
};

router.post('/analises/resultado', salvarResultadoHandler);

export default router;
