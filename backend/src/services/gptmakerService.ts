import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

interface AnaliseGPTMaker {
  status: 'pendente' | 'analisando' | 'concluido' | 'erro';
  resultado: 'ok' | 'problema' | null;
  descricao: string;
  timestamp: string;
}

// Configurações
const GPTMAKER_API_URL = 'https://api.gptmaker.ai';
const GPTMAKER_AGENT_ID = '3F2148420AFE70123E86F2A655C371D2';
const GPTMAKER_API_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJncHRtYWtlciIsImlkIjoiM0REQjMyN0E5RkM5RDFFMjk3M0FGQTUyOTE1RDk2RDQiLCJ0ZW5hbnQiOiIzRERCMzI3QTlGQzlEMUUyOTczQUZBNTI5MTVEOTZENCIsInV1aWQiOiJjZTZjOGIyNi01ZThlLTQyNTctYjE3MS0yOWRhZjAyYmY4ODYifQ.bXuxgEwTQnkdQHNCW7MQnpToq4VMj1Kjhnq_kZz2krc';

// Supabase (configure com suas credenciais)
const supabaseUrl = process.env.SUPABASE_URL || 'https://seu-projeto.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sua-chave-publica';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Envia foto para análise do GPTMaker via API correta
 * 
 * Fluxo:
 * 1. Recebe foto em base64
 * 2. Salva em Supabase (gera URL pública)
 * 3. Envia URL para GPTMaker via /conversation
 * 4. GPTMaker analisa e retorna resultado
 */
export async function analisarFotoGPTMaker(
  fotoBase64: string,
  fotoNome: string,
  confirmacaoId: string,
  numeroSerie?: string,
  equipmentType?: string,
  nomeCliente?: string
): Promise<AnaliseGPTMaker> {
  try {
    console.log(`[GPTMaker] Iniciando análise da foto: ${fotoNome} (Serial: ${numeroSerie})`);

    // 1. Converter base64 para buffer
    const fotoBuffer = Buffer.from(fotoBase64, 'base64');

    // 2. Salvar em Supabase (gera URL pública)
    const fotoUrl = await salvarFotoSupabase(fotoBuffer, fotoNome);
    console.log(`[GPTMaker] Foto salva em: ${fotoUrl}`);

    // 3. Preparar prompt com contexto
    const contextoEquipamento = numeroSerie ? `\nNúmero de Série: ${numeroSerie}` : '';
    const contextoTipo = equipmentType ? `\nTipo de Equipamento: ${equipmentType}` : '';
    const contextoCliente = nomeCliente ? `\nCliente: ${nomeCliente}` : '';

    const prompt = `Analise esta foto de equipamento${contextoEquipamento}${contextoTipo}${contextoCliente}.

Verifique:
1. Estado geral do equipamento
2. Presença de danos físicos ou avarias
3. Componentes faltando ou danificados
4. Condição de funcionamento aparente

Forneça uma análise concisa e objetiva.`;

    // 4. Enviar para GPTMaker via API correta
    console.log(`[GPTMaker] Enviando para agente: ${GPTMAKER_AGENT_ID}`);
    
    const response = await axios.post(
      `${GPTMAKER_API_URL}/v2/agent/${GPTMAKER_AGENT_ID}/conversation`,
      {
        contextId: confirmacaoId,
        prompt: prompt,
        chatPicture: fotoUrl, // ← URL da foto
        chatName: nomeCliente || 'Cliente',
      },
      {
        headers: {
          Authorization: `Bearer ${GPTMAKER_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    console.log(`[GPTMaker] Resposta recebida para ${fotoNome}`);
    console.log(`[GPTMaker] Mensagem: ${response.data.message}`);

    // 5. Processar resposta
    const mensagem = response.data.message || '';
    const temProblema = 
      mensagem.toLowerCase().includes('problema') ||
      mensagem.toLowerCase().includes('dano') ||
      mensagem.toLowerCase().includes('danificado') ||
      mensagem.toLowerCase().includes('faltando') ||
      mensagem.toLowerCase().includes('quebrado') ||
      mensagem.toLowerCase().includes('avaria');

    const analise: AnaliseGPTMaker = {
      status: 'concluido',
      resultado: temProblema ? 'problema' : 'ok',
      descricao: mensagem,
      timestamp: new Date().toISOString(),
    };

    return analise;
  } catch (error) {
    console.error('[GPTMaker] Erro na análise:', error);

    const errorMessage = error instanceof Error ? error.message : 'Desconhecido';
    
    return {
      status: 'erro',
      resultado: null,
      descricao: `Erro ao analisar foto: ${errorMessage}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Salva foto em Supabase e retorna URL pública
 */
async function salvarFotoSupabase(
  fotoBuffer: Buffer,
  fotoNome: string
): Promise<string> {
  try {
    const nomeUnico = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${fotoNome}`;
    
    console.log(`[Supabase] Salvando foto: ${nomeUnico}`);

    // Upload para Supabase Storage
    const { data, error } = await supabase.storage
      .from('fotos')
      .upload(nomeUnico, fotoBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('[Supabase] Erro ao fazer upload:', error);
      throw error;
    }

    // Obter URL pública
    const { data: publicUrl } = supabase.storage
      .from('fotos')
      .getPublicUrl(nomeUnico);

    console.log(`[Supabase] ✅ Foto salva: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (error) {
    console.error('[Supabase] Erro ao salvar foto:', error);
    throw error;
  }
}

/**
 * Validar credenciais do GPTMaker
 */
export async function validarCredenciaisGPTMaker(): Promise<boolean> {
  try {
    console.log('[GPTMaker] Validando credenciais...');

    const response = await axios.get(
      `${GPTMAKER_API_URL}/v2/agent/${GPTMAKER_AGENT_ID}/settings`,
      {
        headers: {
          Authorization: `Bearer ${GPTMAKER_API_TOKEN}`,
        },
        timeout: 10000,
      }
    );

    console.log('[GPTMaker] ✅ Credenciais válidas');
    console.log('[GPTMaker] Configurações do agente:', response.data);
    return true;
  } catch (error) {
    console.error('[GPTMaker] ❌ Credenciais inválidas:', error);
    return false;
  }
}
