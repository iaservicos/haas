import express from 'express';
import multer from 'multer';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import type { EquipmentType } from '../config/equipmentQuestions.js';
import { supabase } from '../config/database.js';
import { getQuestionsByEquipmentType } from '../config/equipmentQuestions.js';
import { env } from '../config/env.js';
import { TokenPayload } from '../types/index.js';
import inspecaoService from '../services/inspecaoService.js';

const router = express.Router();

// Middleware de autenticação OPCIONAL (não força erro se faltar token)
const optionalAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
      req.user = decoded;
    } catch (error) {
      // Ignora erro de token, prossegue sem autenticação
    }
  }
  next();
};

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

router.get('/equipamento/:equipamentoId', optionalAuth, async (req, res) => {
  try {
    const { equipamentoId } = req.params;
    const data = await inspecaoService.buscarEquipamento(equipamentoId);

    res.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Erro ao buscar equipamento:', error);
    res.status(404).json({ error: error.message || 'Equipamento não encontrado' });
  }
});

router.get('/perguntas/:equipmentType', optionalAuth, async (req, res) => {
  try {
    const { equipmentType } = req.params;
    const data = inspecaoService.getQuestionsByEquipmentType(equipmentType);

    res.json(data);
  } catch (error: any) {
    console.error('Erro ao buscar perguntas:', error);
    res.status(400).json({ error: error.message || 'Erro ao buscar perguntas' });
  }
});

router.post('/salvar', optionalAuth, async (req, res) => {
  try {
    const { vistoriaId, equipmentType, answers, observacoes, equipamento_id } = req.body;

    if (!vistoriaId || !equipmentType || !answers) {
      return res.status(400).json({
        error: 'Dados incompletos: vistoriaId, equipmentType e answers são obrigatórios'
      });
    }

    const data = await inspecaoService.salvarRespostas({
      vistoriaId,
      equipmentType,
      answers,
      observacoes,
      equipamento_id
    });

    res.json({
      success: true,
      message: 'Inspeção salva com sucesso',
      data,
    });
  } catch (error: any) {
    console.error('Erro ao salvar inspeção:', error);
    res.status(500).json({
      error: 'Erro ao salvar inspeção',
      details: error.message || 'Erro desconhecido'
    });
  }
});

/**
 * ✅ POST /api/inspecao/upload-foto
 * 1. Calcula hash MD5 da foto
 * 2. Verifica se foto idêntica já foi enviada
 * 3. Salva foto no Supabase Storage (bucket 'fotos')
 * 4. Obtém URL pública
 * 5. Cria registro com status "pendente" e foto_hash
 * 6. Vincula via numero_serie (equipamento)
 * 7. Retorna imediatamente (SEM fazer análise)
 */
router.post('/upload-foto', optionalAuth, (upload.single('file') as any), async (req: any, res: any) => {
  try {
    console.log('[inspecao.ts] Iniciando upload de foto...');

    const { vistoria_id, foto_nome, foto_tipo, numero_serie } = req.body;
    const file = req.file;

    // Validar dados obrigatórios
    if (!file || !numero_serie) {
      return res.status(400).json({
        error: 'Dados incompletos: arquivo e numero_serie são obrigatórios'
      });
    }

    console.log('[inspecao.ts] vistoria_id:', vistoria_id);
    console.log('[inspecao.ts] foto_nome:', foto_nome);
    console.log('[inspecao.ts] numero_serie:', numero_serie);
    console.log('[inspecao.ts] tamanho_bytes:', file.size);

    // ✅ Gerar hash MD5 da foto
    const fotoHash = crypto.createHash('md5').update(file.buffer).digest('hex');
    console.log('[inspecao.ts] Hash da foto:', fotoHash);

    // ✅ Verificar se foto idêntica já existe
    console.log('[inspecao.ts] 🔍 Verificando duplicata com hash:', fotoHash);
    try {
      const { data: fotosComHash } = await supabase
        .from('fotos_vistoria')
        .select('id, foto_nome, created_at')
        .eq('foto_hash', fotoHash);

      if (fotosComHash && fotosComHash.length > 0) {
        console.log('[inspecao.ts] ⚠️ Foto duplicada encontrada!');
        return res.status(409).json({
          error: 'Foto duplicada',
          message: 'Esta foto já foi enviada anteriormente',
          detalhes: {
            foto_anterior: fotosComHash[0].foto_nome,
            enviada_em: fotosComHash[0].created_at
          }
        });
      }
    } catch (err) {
      console.log('[inspecao.ts] ℹ️ Coluna foto_hash pode não existir ainda, continuando...');
    }

    // ✅ Salvar foto no Supabase Storage
    const fileName = `${vistoria_id || 'sem-vistoria'}/${Date.now()}-${foto_nome || file.originalname}`;

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

    // ✅ Salvar registro no banco de dados com URL pública e hash
    console.log('[inspecao.ts] Tentando inserir foto com hash:', fotoHash);
    console.log('[inspecao.ts] - vistoria_id:', vistoria_id);
    console.log('[inspecao.ts] - foto_nome:', foto_nome || file.originalname);

    // ✅ Salvar foto no banco
    const insertPayload: any = {
      vistoria_id: vistoria_id || null,
      foto_url: publicUrl,
      foto_nome: foto_nome || file.originalname,
      foto_tipo: foto_tipo || file.mimetype,
      tamanho_bytes: file.size,
    };

    // Tentar adicionar foto_hash se a coluna existir
    if (fotoHash) {
      insertPayload.foto_hash = fotoHash;
    }

    const { data, error } = await supabase
      .from('fotos_vistoria')
      .insert(insertPayload)
      .select();

    if (error) {
      console.error('[inspecao.ts] ❌ ERRO CRÍTICO ao salvar foto no banco:');
      console.error('[inspecao.ts] - Código:', error.code);
      console.error('[inspecao.ts] - Mensagem:', error.message);

      // Se for erro de unique constraint, pode ser duplicata que não foi detectada
      if (error.code === '23505' || error.message?.includes('unique')) {
        console.log('[inspecao.ts] 🔔 Parece ser erro de UNIQUE - foto duplicada!');
        return res.status(409).json({
          error: 'Foto duplicada',
          message: 'Esta foto já foi enviada anteriormente',
          code: 'DUPLICATE_PHOTO'
        });
      }

      return res.status(500).json({
        error: 'Erro ao salvar foto',
        code: error.code,
        message: error.message,
        details: error.message
      });
    }

    console.log('[inspecao.ts] Foto salva no banco com sucesso:', data[0]);

    // ✅ Criar registro na tabela analises_fotos com status "pendente"
    // Vinculado via numero_serie (equipamento) + foto_id
    // vistoria_id é opcional agora (pode ser null)
    const { error: analiseError } = await supabase
      .from('analises_fotos')
      .insert({
        numero_serie: numero_serie,
        foto_id: data[0].id,
        vistoria_id: vistoria_id || null,
        status: 'pendente',
        prompt_enviado: null,
        resultado_gptmaker: JSON.stringify({ 
          status: 'pendente', 
          descricao: 'Análise em progresso...' 
        }),
      });

    if (analiseError) {
      console.error('[inspecao.ts] Erro ao criar análise:', analiseError);
      // Não bloqueia o upload se análise falhar
      console.log('[inspecao.ts] Aviso: Análise não foi criada, mas foto foi salva com sucesso');
    } else {
      console.log(`[inspecao.ts] Análise criada com status "pendente" para foto ${data[0].id}`);
    }

    // ✅ Responder ao cliente imediatamente (SEM fazer análise)
    res.json({
      success: true,
      message: 'Foto enviada com sucesso. Análise em progresso.',
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
 * ✅ POST /api/inspecao/analises/resultado
 * Webhook para receber resultado da análise (de um cron job externo)
 * Atualiza a análise com o resultado do Gemini
 */
router.post('/analises/resultado', async (req: any, res: any) => {
  try {
    const { foto_id, numero_serie, resultado, status } = req.body;

    if (!foto_id || !resultado || !status) {
      return res.status(400).json({ 
        error: 'Dados incompletos: foto_id, resultado e status são obrigatórios' 
      });
    }

    console.log('[inspecao.ts] Recebendo resultado da análise para foto:', foto_id);

    // ✅ Atualizar análise com resultado
    const { error } = await supabase
      .from('analises_fotos')
      .update({
        status: status,
        resultado_gptmaker: JSON.stringify(resultado),
      })
      .eq('foto_id', foto_id);

    if (error) {
      console.error('[inspecao.ts] Erro ao salvar resultado:', error);
      return res.status(500).json({
        error: 'Erro ao salvar resultado',
        details: error.message
      });
    }

    console.log('[inspecao.ts] Resultado salvo com sucesso para foto:', foto_id);

    res.json({
      success: true,
      message: 'Resultado salvo com sucesso',
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro ao processar resultado:', error);
    res.status(500).json({
      error: 'Erro ao processar resultado',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * ✅ GET /api/inspecao/analises/:numeroSerie
 * Retorna as análises de um equipamento (via numero_serie)
 * Apenas para analista consultar
 */
router.get('/analises/:numeroSerie', async (req: any, res: any) => {
  try {
    const { numeroSerie } = req.params;

    const { data, error } = await supabase
      .from('analises_fotos')
      .select('*')
      .eq('numero_serie', numeroSerie)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[inspecao.ts] Erro ao buscar análises:', error);
      return res.status(500).json({
        error: 'Erro ao buscar análises',
        details: error.message
      });
    }

    res.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro ao buscar análises:', error);
    res.status(500).json({
      error: 'Erro ao buscar análises',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 /**
 * ✅ GET /api/inspecao/portal/listar
 * Retorna todas as inspeções (respostas) do portal com dados relacionados
 * Enriquecido com: equipamento, contrato e cliente
 */
router.get('/portal/listar', async (req: any, res: any) => {
  try {
    console.log('[inspecao.ts] Carregando inspeções do portal...');

    // 1. Buscar todas as inspeções com equipamento
    const { data, error } = await supabase
      .from('inspecao_respostas')
      .select(`
        *,
        contrato_equipamentos (
          id,
          numero_serie,
          tipo_material,
          modelo,
          contrato_id
        )
      `)
      .order('data_inspecao', { ascending: false });

    if (error) {
      console.error('[inspecao.ts] Erro ao buscar inspeções do portal:', error);
      return res.status(500).json({ 
        error: 'Erro ao buscar inspeções do portal',
        details: error.message
      });
    }

    // 2. Enriquecer com dados do contrato E ANÁLISE DA IA
    const enrichedData = await Promise.all(
      (data || []).map(async (inspecao: any) => {
        try {
          if (!inspecao.contrato_equipamentos || !inspecao.contrato_equipamentos.contrato_id) {
            return {
              ...inspecao,
              analise_ia: null,
            };
          }

          // Buscar dados do contrato
          const { data: contrato, error: contratoError } = await supabase
            .from('contratos')
            .select('id, numero_contrato, nome_cliente')
            .eq('id', inspecao.contrato_equipamentos.contrato_id)
            .single();

          if (contratoError) {
            console.warn(`[inspecao.ts] Contrato não encontrado para equipamento:`, contratoError);
            return {
              ...inspecao,
              contrato_equipamentos: {
                ...inspecao.contrato_equipamentos,
                contratos: null,
              },
              analise_ia: null,
            };
          }

          // 3. Buscar análise da IA da tabela analises_fotos
          const { data: analiseData, error: analiseError } = await supabase
            .from('analises_fotos')
            .select('resultado_gptmaker')
            .eq('vistoria_id', inspecao.vistoria_id)
            .order('id', { ascending: false })
            .limit(1)
            .single();

          let analise_ia = null;
          if (!analiseError && analiseData) {
            try {
              analise_ia = typeof analiseData.resultado_gptmaker === 'string' 
                ? JSON.parse(analiseData.resultado_gptmaker) 
                : analiseData.resultado_gptmaker;
            } catch (parseError) {
              console.warn(`[inspecao.ts] Erro ao fazer parse da análise:`, parseError);
              analise_ia = null;
            }
          }

          // Adicionar contrato e análise aos dados do equipamento
          return {
            ...inspecao,
            contrato_equipamentos: {
              ...inspecao.contrato_equipamentos,
              contratos: contrato,
            },
            analise_ia: analise_ia,
          };
        } catch (enrichError) {
          console.error(`[inspecao.ts] Erro ao enriquecer inspeção:`, enrichError);
          return {
            ...inspecao,
            analise_ia: null,
          };
        }
      })
    );

    console.log(`[inspecao.ts] Inspeções do portal carregadas: ${enrichedData?.length || 0}`);

    res.json({
      success: true,
      data: enrichedData || [],
      total: enrichedData?.length || 0,
    });
  } catch (error) {
    console.error('[inspecao.ts] Erro ao buscar inspeções do portal:', error);
    res.status(500).json({
      error: 'Erro ao buscar inspeções do portal',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * GET /api/inspecao/fotos/:vistoriaId
 * Retorna fotos enviadas para uma vistoria (usado pelo polling do QR code)
 */
router.get('/fotos/:vistoriaId', optionalAuth, async (req: any, res: any) => {
  try {
    const { vistoriaId } = req.params;

    const { data, error } = await supabase
      .from('fotos_vistoria')
      .select('id, foto_url, foto_nome')
      .eq('vistoria_id', vistoriaId)
      .order('id', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar fotos' });
  }
});

router.get('/:vistoriaId', optionalAuth, async (req, res) => {
  try {
    const { vistoriaId } = req.params;
    const data = await inspecaoService.buscarRespostas(vistoriaId);

    res.json(data);
  } catch (error: any) {
    console.error('Erro ao buscar inspeção:', error);
    res.status(404).json({ error: error.message || 'Inspeção não encontrada' });
  }
});

export default router;
