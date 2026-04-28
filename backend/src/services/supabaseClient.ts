/**
 * Cliente Supabase - Versão Simplificada com TypeScript Correto
 * 
 * Conecta ao banco de dados Supabase usando fetch nativo
 */

interface SupabaseError {
  message: string;
  code?: string;
}

interface SupabaseResponse<T> {
  data?: T;
  error?: SupabaseError;
}

class SupabaseClient {
  private url: string;
  private key: string;

  constructor(url: string, key: string) {
    this.url = url;
    this.key = key;
  }

  /**
   * Insere dados em uma tabela
   */
  async insert<T extends Record<string, any>>(
    table: string,
    data: T[]
  ): Promise<SupabaseResponse<T[]>> {
    try {
      const response = await fetch(`${this.url}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.key,
          'Authorization': `Bearer ${this.key}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let errorMessage = 'Erro ao inserir dados';
        try {
          const errorData = await response.json() as Record<string, any>;
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Se não conseguir parsear JSON, usa a mensagem padrão
        }
        
        return {
          error: {
            message: errorMessage,
            code: response.status.toString(),
          },
        };
      }

      const result = (await response.json()) as T[];
      return { data: result };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return {
        error: {
          message,
        },
      };
    }
  }

  /**
   * Retorna um objeto com método from() para compatibilidade
   */
  from(table: string) {
    return {
      insert: async (data: Record<string, any>[]) => {
        return this.insert(table, data);
      },
    };
  }
}

// Credenciais do Supabase (devem estar nas variáveis de ambiente)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Erro: SUPABASE_URL ou SUPABASE_ANON_KEY não configuradas!');
  console.error('[Supabase] Certifique-se de que as variáveis de ambiente estão definidas no Vercel');
}

/**
 * Cria e exporta a instância do cliente Supabase
 */
export const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default supabase;
