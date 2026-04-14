import axios from 'axios';
import { env } from '../config/env';

interface AnaliseGPTMaker {
  status: 'pendente' | 'analisando' | 'concluido' | 'erro';
  resultado: 'ok' | 'problema' | null;
  descricao: string;
  timestamp: string;
}

/**
 * Enviar foto para análise do GPTMaker
 */
export async function analisarFotoGPTMaker(
  fotoBase64: string,
  fotoNome: string,
  confirmacaoId: string
): Promise<AnaliseGPTMaker> {
  try {
    console.log(`[GPTMaker] Iniciando análise da foto: ${fotoNome}`);

    // Preparar payload para GPTMaker
    const payload = {
      agentId: env.GPTMAKER_AGENT_ID,
      message: `Analise esta foto de equipamento: ${fotoNome}. Verifique se há danos visíveis, se o equipamento está funcionando e descreva o estado geral.`,
      image: fotoBase64,
      confirmacaoId: confirmacaoId,
    };

    // Enviar para GPTMaker
    const response = await axios.post(
      `${env.GPTMAKER_API_URL}/chat/analyze`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${env.GPTMAKER_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    console.log(`[GPTMaker] Resposta recebida para ${fotoNome}`);

    // Processar resposta
    const analise: AnaliseGPTMaker = {
      status: 'concluido',
      resultado: response.data.hasDamage ? 'problema' : 'ok',
      descricao: response.data.analysis || 'Análise concluída',
      timestamp: new Date().toISOString(),
    };

    return analise;
  } catch (error) {
    console.error('[GPTMaker] Erro na análise:', error);

    return {
      status: 'erro',
      resultado: null,
      descricao: `Erro ao analisar foto: ${error instanceof Error ? error.message : 'Desconhecido'}`,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Validar credenciais do GPTMaker
 */
export async function validarCredenciaisGPTMaker(): Promise<boolean> {
  try {
    console.log('[GPTMaker] Validando credenciais...');

    const response = await axios.get(
      `${env.GPTMAKER_API_URL}/agent/${env.GPTMAKER_AGENT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${env.GPTMAKER_API_TOKEN}`,
        },
        timeout: 10000,
      }
    );

    console.log('[GPTMaker] ✅ Credenciais válidas');
    return true;
  } catch (error) {
    console.error('[GPTMaker] ❌ Credenciais inválidas:', error);
    return false;
  }
}
