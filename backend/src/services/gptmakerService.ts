/**
 * Serviço para integração com GPTMaker
 * Responsável por enviar fotos para análise de IA
 */

import axios from 'axios';
import { env } from '../config/env.js';

interface AnaliseFoto {
  fonte_presente: boolean;
  adaptador_presente: boolean;
  teclado_presente: boolean;
  mouse_presente: boolean;
  condicao_visual: string;
  itens_identificados: string[];
  descricao_geral: string;
}

export const gptmakerService = {
  /**
   * Enviar foto para análise com GPTMaker
   */
  async analisarFoto(
    fotoBase64: string,
    tipoEquipamento: string
  ): Promise<AnaliseFoto> {
    try {
      console.log(`🤖 Enviando foto para análise GPTMaker - Tipo: ${tipoEquipamento}`);

      const prompt = `
        Você é um especialista em análise de equipamentos eletrônicos.
        
        Analise esta foto de um equipamento do tipo: ${tipoEquipamento}
        
        Identifique e responda em JSON:
        {
          "fonte_presente": true/false,
          "adaptador_presente": true/false,
          "teclado_presente": true/false,
          "mouse_presente": true/false,
          "condicao_visual": "descrição breve do estado visual",
          "itens_identificados": ["lista", "de", "itens", "vistos"],
          "descricao_geral": "descrição geral do equipamento"
        }
        
        Seja preciso e objetivo. Retorne APENAS o JSON válido.
      `;

      const response = await axios.post(
        `${env.GPTMAKER_API_URL}/chat`,
        {
          message: prompt,
          image: fotoBase64,
          model: 'gpt-4-vision',
        },
        {
          headers: {
            'Authorization': `Bearer ${env.GPTMAKER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 segundos de timeout
        }
      );

      console.log('✅ Análise recebida do GPTMaker');

      // Extrair JSON da resposta
      const conteudo = response.data.choices?.[0]?.message?.content || response.data.content;
      const jsonMatch = conteudo.match(/\{[\s\S]*\}/);
      
      if (!jsonMatch) {
        throw new Error('Resposta do GPTMaker não contém JSON válido');
      }

      const analise: AnaliseFoto = JSON.parse(jsonMatch[0]);
      return analise;
    } catch (error) {
      console.error('❌ Erro ao analisar foto com GPTMaker:', error);
      throw error;
    }
  },

  /**
   * Validar se a análise tem todos os campos obrigatórios
   */
  validarAnalise(analise: any): { valido: boolean; erro?: string } {
    const camposObrigatorios = [
      'fonte_presente',
      'adaptador_presente',
      'teclado_presente',
      'mouse_presente',
      'condicao_visual',
      'itens_identificados',
    ];

    for (const campo of camposObrigatorios) {
      if (!(campo in analise)) {
        return {
          valido: false,
          erro: `Campo obrigatório faltando: ${campo}`,
        };
      }
    }

    return { valido: true };
  },

  /**
   * Processar resultado da análise para salvar no banco
   */
  processarResultado(analiseGPT: AnaliseFoto) {
    return {
      fonte_presente: analiseGPT.fonte_presente,
      teclado_presente: analiseGPT.teclado_presente,
      mouse_presente: analiseGPT.mouse_presente,
      adaptador_presente: analiseGPT.adaptador_presente,
      condicao_visual: analiseGPT.condicao_visual,
      itens_identificados: analiseGPT.itens_identificados,
      descricao_geral: analiseGPT.descricao_geral,
    };
  },
};
