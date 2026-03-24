import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_KEY);

export async function testConnection() {
  try {
    const { data, error } = await supabase.from('usuarios').select('id').limit(1);
    if (error) throw error;
    console.log('✓ Conexão com Supabase estabelecida');
  } catch (error) {
    console.error('✗ Erro ao conectar ao Supabase:', error);
    process.exit(1);
  }
}
