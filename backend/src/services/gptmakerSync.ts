/**
 * Serviço de Sincronização de Análises do GPTMaker
 * 
 * Fluxo:
 * 1. Conecta na API do GPTMaker com o token JWT
 * 2. Lista todos os chats do agente
 * 3. Para cada chat, lista as mensagens (que contêm as análises)
 * 4. Extrai os resultados das análises
 * 5. Salva os resultados na tabela analises_fotos do Supabase
 */

import axios from 'axios';
import cron from 'node-cron';
import { supabase } from './supabaseClient'; // Ajuste o caminho conforme necessário

interface GPTMakerChat {
  id: string;
  visitorId?: string;
  metadata?: {
    vistoria_id?: string;
    foto_id?: string;
    numero_serie?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface GPTMakerMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  imageUrl?: string;
  documentUrl?: string;
  audioUrl?: string;
  createdAt: string;
}

interface AnalisisData {
  numero_serie: string;
  foto_id: number;
  vistoria_id: string;
  prompt_enviado: string;
  resultado_gptmaker: string;
  status: 'concluído';
}

const GPTMAKER_API_BASE = 'https://api.gptmaker.ai/v2';
const GPTMAKER_TOKEN = process.env.GPTMAKER_API_TOKEN;
const GPTMAKER_AGENT_ID = process.env.GPTMAKER_AGENT_ID;
const GPTMAKER_WORKSPACE_ID = process.env.GPTMAKER_WORKSPACE_ID;

/**
 * Busca todos os chats do agente
 */
async function getChatsFromGPTMaker(): Promise<GPTMakerChat[]> {
  try {
    console.log(`[GPTMaker] Buscando chats do agente: ${GPTMAKER_AGENT_ID}`);

    const response = await axios.get(
      `${GPTMAKER_API_BASE}/workspace/${GPTMAKER_WORKSPACE_ID}/chats`,
      {
        params: {
          agentId: GPTMAKER_AGENT_ID,
        },
        headers: {
          Authorization: `Bearer ${GPTMAKER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const chats = response.data.data || [];
    console.log(`[GPTMaker] ${chats.length} chats encontrados`);
    return chats;
  } catch (error) {
    console.error('[GPTMaker] Erro ao buscar chats:', error);
    return [];
  }
}

/**
 * Busca as mensagens de um chat específico
 */
async function getMessagesFromChat(chatId: string): Promise<GPTMakerMessage[]> {
  try {
    const response = await axios.get(
      `${GPTMAKER_API_BASE}/chat/${chatId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${GPTMAKER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const messages = response.data.data || [];
    console.log(`[GPTMaker] Chat ${chatId}: ${messages.length} mensagens`);
    return messages;
  } catch (error) {
    console.error(`[GPTMaker] Erro ao buscar mensagens do chat ${chatId}:`, error);
    return [];
  }
}

/**
 * Extrai as análises das mensagens
 */
function extractAnalisisFromMessages(
  messages: GPTMakerMessage[],
  chatMetadata?: any
): AnalisisData[] {
  const analises: AnalisisData[] = [];

  for (const message of messages) {
    // Se a mensagem é do assistente (GPTMaker), é uma análise
    if (message.role === 'assistant' && message.content) {
      const analise: AnalisisData = {
        numero_serie: chatMetadata?.numero_serie || 'desconhecido',
        foto_id: chatMetadata?.foto_id || 0,
        vistoria_id: chatMetadata?.vistoria_id || '',
        prompt_enviado: '', // Será preenchido depois
        resultado_gptmaker: message.content,
        status: 'concluído',
      };

      if (analise.vistoria_id) {
        analises.push(analise);
      }
    }
  }

  return analises;
}

/**
 * Salva as análises no Supabase
 */
async function saveAnalisesToSupabase(analises: AnalisisData[]): Promise<boolean> {
  if (analises.length === 0) {
    console.log('[Supabase] Nenhuma análise para salvar');
    return true;
  }

  try {
    console.log(`[Supabase] Salvando ${analises.length} análises...`);

    // Inserir cada análise na tabela analises_fotos
    for (const analise of analises) {
      const { data, error } = await supabase
        .from('analises_fotos')
        .insert([
          {
            numero_serie: analise.numero_serie,
            foto_id: analise.foto_id,
            vistoria_id: analise.vistoria_id,
            prompt_enviado: analise.prompt_enviado,
            resultado_gptmaker: analise.resultado_gptmaker,
            status: analise.status,
          },
        ]);

      if (error) {
        console.error(`[Supabase] Erro ao salvar análise: ${error.message}`);
        return false;
      }

      console.log(`[Supabase] ✅ Análise salva: vistoria_id=${analise.vistoria_id}`);
    }

    console.log(`[Supabase] ✅ ${analises.length} análises salvas com sucesso`);
    return true;
  } catch (error) {
    console.error('[Supabase] Erro ao salvar análises:', error);
    return false;
  }
}

/**
 * Sincroniza todas as análises do GPTMaker para o Supabase
 */
export async function syncAnalisisFromGPTMaker(): Promise<{
  success: boolean;
  analisesCount: number;
  message: string;
}> {
  try {
    console.log('\n=== INICIANDO SINCRONIZAÇÃO DE ANÁLISES ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // 1. Buscar chats
    const chats = await getChatsFromGPTMaker();
    if (chats.length === 0) {
      console.log('Nenhum chat encontrado');
      return {
        success: true,
        analisesCount: 0,
        message: 'Nenhum chat encontrado',
      };
    }

    // 2. Para cada chat, buscar mensagens e extrair análises
    let allAnalises: AnalisisData[] = [];

    for (const chat of chats) {
      const messages = await getMessagesFromChat(chat.id);
      const analises = extractAnalisisFromMessages(messages, chat.metadata);
      allAnalises = allAnalises.concat(analises);
    }

    console.log(`Total de análises encontradas: ${allAnalises.length}`);

    // 3. Salvar no Supabase
    if (allAnalises.length > 0) {
      const saved = await saveAnalisesToSupabase(allAnalises);
      if (!saved) {
        return {
          success: false,
          analisesCount: allAnalises.length,
          message: 'Erro ao salvar análises no Supabase',
        };
      }
    }

    console.log('=== SINCRONIZAÇÃO CONCLUÍDA ===\n');

    return {
      success: true,
      analisesCount: allAnalises.length,
      message: `${allAnalises.length} análises sincronizadas com sucesso`,
    };
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return {
      success: false,
      analisesCount: 0,
      message: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Inicia o job automático de sincronização (a cada 5 minutos)
 */
export function startAnalisisSyncScheduler(): void {
  // Executar a cada 5 minutos
  const task = cron.schedule('*/5 * * * *', async () => {
    console.log('[Scheduler] Executando sincronização de análises...');
    await syncAnalisisFromGPTMaker();
  });

  console.log('[Scheduler] ✅ Job de sincronização iniciado (a cada 5 minutos)');

  // Executar uma vez ao iniciar
  syncAnalisisFromGPTMaker().catch((error) => {
    console.error('[Scheduler] Erro na primeira execução:', error);
  });
}
