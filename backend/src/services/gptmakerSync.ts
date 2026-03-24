/**
 * Serviço de Sincronização de Fotos do GPTMaker
 * 
 * Fluxo:
 * 1. Conecta na API do GPTMaker com o token JWT
 * 2. Lista todos os chats do agente
 * 3. Para cada chat, lista as mensagens (que contêm as fotos)
 * 4. Extrai as URLs das fotos
 * 5. Envia para o Power Automate via webhook
 * 6. Power Automate salva as fotos no SharePoint
 */

import axios from 'axios';
import cron from 'node-cron';


interface GPTMakerChat {
  id: string;
  visitorId?: string;
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

interface PhotoData {
  messageId: string;
  imageUrl: string;
  fileName: string;
  time: number;
  whatsappPhone?: string;
  chatId: string;
  agentId: string;
}

const GPTMAKER_API_BASE = 'https://api.gptmaker.ai/v2';
const GPTMAKER_TOKEN = process.env.GPTMAKER_API_TOKEN;
const GPTMAKER_AGENT_ID = process.env.GPTMAKER_AGENT_ID;
const GPTMAKER_WORKSPACE_ID = process.env.GPTMAKER_WORKSPACE_ID;
const POWER_AUTOMATE_WEBHOOK_URL = process.env.POWER_AUTOMATE_WEBHOOK_URL;

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
 * Extrai as fotos das mensagens
 */
function extractPhotosFromMessages(
  messages: GPTMakerMessage[],
  chatId: string
): PhotoData[] {
  const photos: PhotoData[] = [];

  for (const message of messages) {
    if (message.imageUrl) {
      const fileName = `photo_${message.id}_${Date.now()}.jpg`;
      photos.push({
        messageId: message.id,
        imageUrl: message.imageUrl,
        fileName,
        time: new Date(message.createdAt).getTime(),
        chatId,
        agentId: GPTMAKER_AGENT_ID || '',
      });
    }
  }

  return photos;
}

/**
 * Envia as fotos para o Power Automate
 */
async function sendPhotosToPowerAutomate(photos: PhotoData[]): Promise<boolean> {
  if (photos.length === 0) {
    console.log('[PowerAutomate] Nenhuma foto para enviar');
    return true;
  }

  if (!POWER_AUTOMATE_WEBHOOK_URL) {
    console.error('[PowerAutomate] POWER_AUTOMATE_WEBHOOK_URL não configurada');
    return false;
  }

  try {
    console.log(`[PowerAutomate] Enviando ${photos.length} fotos...`);

    const payload = {
      action: 'store_photos',
      photos,
      timestamp: new Date().toISOString(),
    };

    const response = await axios.post(POWER_AUTOMATE_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    if (response.status === 200 || response.status === 202) {
      console.log(`[PowerAutomate] ✅ ${photos.length} fotos enviadas com sucesso`);
      return true;
    } else {
      console.error(`[PowerAutomate] Erro na resposta: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('[PowerAutomate] Erro ao enviar fotos:', error);
    return false;
  }
}

/**
 * Sincroniza todas as fotos do GPTMaker para o Power Automate
 */
export async function syncPhotosFromGPTMaker(): Promise<{
  success: boolean;
  photosCount: number;
  message: string;
}> {
  try {
    console.log('\n=== INICIANDO SINCRONIZAÇÃO DE FOTOS ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);

    // 1. Buscar chats
    const chats = await getChatsFromGPTMaker();
    if (chats.length === 0) {
      console.log('Nenhum chat encontrado');
      return {
        success: true,
        photosCount: 0,
        message: 'Nenhum chat encontrado',
      };
    }

    // 2. Para cada chat, buscar mensagens e extrair fotos
    let allPhotos: PhotoData[] = [];

    for (const chat of chats) {
      const messages = await getMessagesFromChat(chat.id);
      const photos = extractPhotosFromMessages(messages, chat.id);
      allPhotos = allPhotos.concat(photos);
    }

    console.log(`Total de fotos encontradas: ${allPhotos.length}`);

    // 3. Enviar para Power Automate
    if (allPhotos.length > 0) {
      const sent = await sendPhotosToPowerAutomate(allPhotos);
      if (!sent) {
        return {
          success: false,
          photosCount: allPhotos.length,
          message: 'Erro ao enviar fotos para Power Automate',
        };
      }
    }

    console.log('=== SINCRONIZAÇÃO CONCLUÍDA ===\n');

    return {
      success: true,
      photosCount: allPhotos.length,
      message: `${allPhotos.length} fotos sincronizadas com sucesso`,
    };
  } catch (error) {
    console.error('Erro na sincronização:', error);
    return {
      success: false,
      photosCount: 0,
      message: `Erro: ${error instanceof Error ? error.message : 'Desconhecido'}`,
    };
  }
}

/**
 * Inicia o job automático de sincronização (a cada 5 minutos)
 */
export function startPhotoSyncScheduler(): void {
  // Importar node-cron apenas quando necessário


  // Executar a cada 5 minutos
  const task = cron.schedule('*/5 * * * *', async () => {
    console.log('[Scheduler] Executando sincronização de fotos...');
    await syncPhotosFromGPTMaker();
  });

  console.log('[Scheduler] ✅ Job de sincronização iniciado (a cada 5 minutos)');

  // Executar uma vez ao iniciar
  syncPhotosFromGPTMaker().catch((error) => {
    console.error('[Scheduler] Erro na primeira execução:', error);
  });
}
