import axios from 'axios';

const GPTMAKER_API_URL = 'https://api.gptmaker.ai/v2';
const GPTMAKER_TOKEN = process.env.GPTMAKER_API_TOKEN;
const GPTMAKER_AGENT_ID = process.env.GPTMAKER_AGENT_ID;

/**
 * Chama o agente do GPTMaker para analisar uma foto
 */
export async function analyzePhotoWithGPTMaker(
  photoUrl: string,
  vistoriaId: string,
  equipamentoId: number,
  numeroSerie: string,
  callbackUrl: string
 ): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[GPTMaker] Iniciando análise de foto:', {
      vistoriaId,
      equipamentoId,
      numeroSerie,
      photoUrl,
    });

    if (!GPTMAKER_TOKEN || !GPTMAKER_AGENT_ID) {
      console.error('[GPTMaker] ❌ Credenciais não configuradas');
      return {
        success: false,
        message: 'Credenciais do GPTMaker não configuradas',
      };
    }

    const prompt = `Analise esta foto de equipamento e responda em JSON:
{
  "status": "OK" ou "AVARIA",
  "danos": ["lista de danos encontrados"],
  "descricao": "descrição detalhada do estado",
  "recomendacao": "recomendação de ação"
}

Foto do equipamento: ${photoUrl}

Número de série: ${numeroSerie}

Por favor, analise se o equipamento está em bom estado ou possui danos/avarias.`;

    const response = await axios.post(
      `${GPTMAKER_API_URL}/agent/${GPTMAKER_AGENT_ID}/conversation`,
      {
        contextId: vistoriaId,
        prompt: prompt,
        callbackUrl: callbackUrl,
        chatName: `Análise ${numeroSerie}`,
      },
      {
        headers: {
          'Authorization': `Bearer ${GPTMAKER_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('[GPTMaker] ✅ Requisição enviada com sucesso');

    return {
      success: true,
      message: 'Análise iniciada com sucesso',
    };
  } catch (error) {
    console.error('[GPTMaker] ❌ Erro ao chamar GPTMaker:', error);

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
    };
  }
}
