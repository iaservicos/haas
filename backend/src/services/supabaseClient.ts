/**
 * Cliente Supabase
 * 
 * Conecta ao banco de dados Supabase usando as credenciais de ambiente
 */

import { createClient } from '@supabase/supabase-js';

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
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // Não persistir sessão no servidor
  },
});

export default supabase;
