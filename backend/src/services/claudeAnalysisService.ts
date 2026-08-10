import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';

// Configuração
const CLAUDE_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-5',
  'claude-opus-4-1',
];

const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY = 1000;

const ANALYSIS_PROMPT = `Você é especialista em inspeção de equipamentos TI - Positivo Tecnologia.

AVALIAR APENAS O QUE A FOTO MOSTRA - não assume componentes não visíveis.

AVARIAS A DETECTAR:

TELA/DISPLAY:
- Trincas (pequenas, médias, grandes)
- Quebras (vidro quebrado)
- Manchas (pixel morto, mancha de tinta)
- Linhas horizontais/verticais
- Vidro solto

CARCAÇA:
- Amassados
- Trincas bem visíveis
- Corrosão
- Deformação
- Peças faltando

TECLADO:
- Teclas faltando
- Teclas soltas
- Derramamento de líquido

TOUCHPAD:
- Trincado
- Solto
- Molhado

CONECTORES:
- USB danificado
- HDMI danificado
- Carregador danificado
- Conectores soltos
- Conectores quebrados

BATERIA (Notebooks):
- Inchada
- Danificada
- Vazando

OUTROS:
- Sinais de líquido
- Oxidação

DESGASTE NORMAL (NÃO é avaria):
- Sujeira, pó, marcas de uso
- Fios desorganizados
- Cabos emaranhados
- Desbotamento leve

Responda em JSON: {"status":"OK ou AVARIA","categoria":"TELA/DISPLAY|CARCAÇA|TECLADO|TOUCHPAD|CONECTORES|BATERIA|OUTROS","tipo_dano":"tipo específico se houver avaria","descricao":"descrição breve (máximo 1 linha)"}`;

// Types
export interface AnalysisResult {
  status: 'OK' | 'AVARIA';
  categoria?: string;
  tipo_dano?: string;
  descricao?: string;
}

// Utils
function getRetryDelay(attempt: number): number {
  return INITIAL_RETRY_DELAY * Math.pow(2, attempt - 1);
}

function isValidAnalysisResponse(response: any): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }

  if (response.status === 'OPERACIONAL') {
    response.status = 'OK';
  }

  return (
    (response.status === 'OK' || response.status === 'AVARIA') &&
    typeof response.descricao === 'string'
  );
}

function parseJsonResponse(claudeResponse: string): AnalysisResult {
  let jsonContent = claudeResponse.trim();

  if (jsonContent.includes('```')) {
    jsonContent = jsonContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
  }

  jsonContent = jsonContent
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/  +/g, ' ');

  jsonContent = jsonContent.replace(/": '/g, '": "').replace(/', "/g, '", "').replace(/',/g, '",');

  return JSON.parse(jsonContent);
}

// Main Service
export class ClaudeAnalysisService {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  /**
   * Baixa imagem de URL e converte para base64
   */
  async downloadImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const base64 = Buffer.from(response.data).toString('base64');
    const fileName = imageUrl.split('/').pop() || '';
    const extension = fileName.split('.').pop()?.toLowerCase() || 'png';
    const mimeType =
      extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' : 'image/png';

    return { base64, mimeType };
  }

  /**
   * Baixa imagem de URL e analisa com Claude
   */
  async analyzeImageFromUrl(
    imageUrl: string,
    numeroSerie: string = 'N/A'
  ): Promise<AnalysisResult> {
    console.log(`[ClaudeAnalysis] Baixando imagem de: ${imageUrl}`);
    const { base64, mimeType } = await this.downloadImageAsBase64(imageUrl);

    const fileName = imageUrl.split('/').pop() || 'unknown';
    console.log(`[ClaudeAnalysis] Imagem convertida para base64: ${base64.length} caracteres`);

    const claudeResponse = await this.analyzeImage(base64, mimeType, numeroSerie, fileName);
    return this.parseAndValidateResponse(claudeResponse);
  }

  /**
   * Analisa imagem com Claude (com fallback automático de modelos)
   */
  async analyzeImage(
    base64: string,
    mimeType: string,
    numeroSerie: string = 'N/A',
    fileName: string = 'unknown'
  ): Promise<string> {
    let lastError: any;

    for (const model of CLAUDE_MODELS) {
      let modelLastError: any;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(
            `[ClaudeAnalysis] Tentativa ${attempt}/${MAX_RETRIES} com ${model}...`
          );

          const response = await this.client.messages.create({
            model: model,
            max_tokens: 300,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: mimeType as
                        | 'image/jpeg'
                        | 'image/png'
                        | 'image/gif'
                        | 'image/webp',
                      data: base64,
                    },
                  },
                  {
                    type: 'text',
                    text: `${ANALYSIS_PROMPT}\n\nNúmero de série: ${numeroSerie}\nFoto: ${fileName}`,
                  },
                ],
              },
            ],
          });

          const content = response.content[0];
          if (content.type !== 'text') {
            throw new Error('Resposta do Claude não é texto');
          }

          console.log(`[ClaudeAnalysis] ✅ Sucesso com ${model}!`);
          return content.text;
        } catch (error: any) {
          modelLastError = error;
          const message = error.message || 'Erro desconhecido';

          console.log(
            `[ClaudeAnalysis] ❌ Tentativa ${attempt} com ${model} falhou: ${message}`
          );

          if (attempt < MAX_RETRIES) {
            const delay = getRetryDelay(attempt);
            console.log(`[ClaudeAnalysis] ⏳ Aguardando ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      lastError = modelLastError;
      console.log(
        `[ClaudeAnalysis] 🔄 Modelo ${model} não funcionou, tentando próximo...`
      );
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw lastError;
  }

  /**
   * Processa resposta do Claude e valida
   */
  parseAndValidateResponse(claudeResponse: string): AnalysisResult {
    const resultado = parseJsonResponse(claudeResponse);

    if (!isValidAnalysisResponse(resultado)) {
      throw new Error('Resposta não tem formato esperado');
    }

    console.log(
      `[ClaudeAnalysis] ✅ Análise válida: status=${resultado.status}, categoria=${resultado.categoria}`
    );

    return resultado;
  }
}

export default ClaudeAnalysisService;
