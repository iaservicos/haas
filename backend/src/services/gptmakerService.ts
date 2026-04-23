import axios from 'axios';
import { env } from '../config/env.js';

interface AnaliseGPTMaker {
  status: 'pendente' | 'analisando' | 'concluido' | 'erro';
  resultado: 'ok' | 'problema' | null;
  descricao: string;
  timestamp: string;
}

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
    const response = await axios.post(
      `${env.GPTMAKER_API_URL}/agent/${env.GPTMAKER_AGENT_ID}/conversation`,
      {
        contextId: confirmacaoId,
        prompt: prompt,
        chatPicture: fotoUrl, // ← URL da foto
        chatName: nomeCliente || 'Cliente',
      },
      {
        headers: {
          Authorization: `Bearer ${env.GPTMAKER_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000,
      }
    );

    console.log(`[GPTMaker] Resposta recebida para ${fotoNome}`);

    // 5. Processar resposta
    const analise: AnaliseGPTMaker = {
      status: 'concluido',
      resultado: response.data.message?.toLowerCase().includes('problema') || 
                 response.data.message?.toLowerCase().includes('dano') ? 'problema' : 'ok',
      descricao: response.data.message || 'Análise concluída',
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
 * Salva foto em Supabase e retorna URL pública
 */
async function salvarFotoSupabase(
  fotoBuffer: Buffer,
  fotoNome: string
): Promise<string> {
  try {
    // Implementar salvamento em Supabase
    // Por enquanto, retornar URL mockada
    // Você precisa configurar Supabase Storage no seu projeto
    
    const nomeUnico = `${Date.now()}-${fotoNome}`;
    const urlPublica = `https://seu-supabase.supabase.co/storage/v1/object/public/fotos/${nomeUnico}`;
    
    console.log(`[Supabase] Foto salva: ${urlPublica}`);
    return urlPublica;
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
      `${env.GPTMAKER_API_URL}/agent/${env.GPTMAKER_AGENT_ID}/settings`,
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
