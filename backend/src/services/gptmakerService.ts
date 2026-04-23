/**
 * Serviço de análise de fotos com GPTMaker
 * Envia foto para o agente GPTMaker analisar e retorna resultado
 */

const GPTMAKER_AGENT_ID = process.env.GPTMAKER_AGENT_ID || '3F068B1F309632949C12BE5343F615B3';
const GPTMAKER_API_TOKEN = process.env.GPTMAKER_API_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJncHRtYWtlciIsImlkIjoiM0REQjMyN0E5RkM5RDFFMjk3M0FGQTUyOTE1RDk2RDQiLCJ0ZW5hbnQiOiIzRERCMzI3QTlGQzlEMUUyOTczQUZBNTI5MTVEOTZENCIsInV1aWQiOiIwOGQxZTU3Mi0yY2ZhLTQ3MmEtYWU2Mi03NTdlYmJhMWEyMWYifQ.4qgjuwhYM7a9SNRvyTr0rO-kgPD02PMVVFn2E2bY7mk';

export interface AnaliseResultado {
  status: 'OK' | 'NOK';
  resultado: 'ok' | 'problema';
  descricao: string;
  timestamp: string;
}

/**
 * Analisa foto com GPTMaker
 * @param fotoBase64 - Foto em base64
 * @param fotoNome - Nome da foto
 * @param confirmacaoId - ID da confirmação
 * @param numeroSerie - Número de série do equipamento
 * @param equipmentType - Tipo de equipamento
 * @param nomeCliente - Nome do cliente
 * @returns Resultado da análise
 */
export async function analisarFotoGPTMaker(
  fotoBase64: string,
  fotoNome: string,
  confirmacaoId: string,
  numeroSerie?: string,
  equipmentType?: string,
  nomeCliente?: string
): Promise<AnaliseResultado> {
  try {
    console.log(`[gptmakerService] Iniciando análise de foto: ${fotoNome}`);
    console.log(`[gptmakerService] Serial: ${numeroSerie}, Tipo: ${equipmentType}, Cliente: ${nomeCliente}`);

    // Preparar prompt para análise
    const analysisPrompt = `Você é um especialista em inspeção de equipamentos de TI. Analise esta foto de um equipamento e responda:

Informações do equipamento:
- Número de série: ${numeroSerie || 'N/A'}
- Tipo: ${equipmentType || 'N/A'}
- Cliente: ${nomeCliente || 'N/A'}

Análise solicitada:
1. O equipamento está em bom estado (OK) ou tem problemas (NOK)?
2. Descreva o que você vê na imagem
3. Identifique qualquer dano, avaria ou problema visível

Responda APENAS em JSON com a seguinte estrutura (sem texto adicional):
{
  "status": "OK" ou "NOK",
  "resultado": "ok" ou "problema",
  "descricao": "descrição detalhada do que vê",
  "timestamp": "${new Date().toISOString()}"
}`;

    // Chamar GPTMaker API
    console.log(`[gptmakerService] Enviando para GPTMaker Agent: ${GPTMAKER_AGENT_ID}`);

    const response = await fetch(
      `https://api.gptmaker.ai/v2/agent/${GPTMAKER_AGENT_ID}/conversation`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GPTMAKER_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contextId: `vistoria-${confirmacaoId}-${Date.now()}`,
          prompt: analysisPrompt,
          image: `data:image/jpeg;base64,${fotoBase64}`,
        }),
      }
    );

    if (!response.ok) {
      console.error(`[gptmakerService] GPTMaker API error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[gptmakerService] Erro detalhado: ${errorText}`);
      throw new Error(`GPTMaker API error: ${response.statusText}`);
    }

    const result = await response.json() as any;
    console.log(`[gptmakerService] Resposta recebida do GPTMaker`);

    // Tentar parsear JSON da resposta
    let analise: AnaliseResultado;
    try {
      // Procurar por JSON na resposta
      const message = result?.message || '';
      const jsonMatch = message.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analise = JSON.parse(jsonMatch[0]);
        console.log(`[gptmakerService] JSON parseado com sucesso`);
      } else {
        // Se não encontrar JSON, criar resposta padrão
        console.log(`[gptmakerService] JSON não encontrado, usando resposta padrão`);
        analise = {
          status: 'OK',
          resultado: 'ok',
          descricao: message || 'Análise concluída',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (parseError) {
      console.warn(`[gptmakerService] Erro ao parsear JSON, usando resposta padrão`);
      const message = result?.message || '';
      analise = {
        status: 'OK',
        resultado: 'ok',
        descricao: message || 'Análise concluída',
        timestamp: new Date().toISOString(),
      };
    }

    console.log(`[gptmakerService] Análise concluída: ${analise.status}`);

    return analise;
  } catch (error) {
    console.error('[gptmakerService] Erro na análise:', error);
    
    // Retornar resposta de erro padrão
    return {
      status: 'NOK',
      resultado: 'problema',
      descricao: `Erro ao analisar foto: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      timestamp: new Date().toISOString(),
    };
  }
}
