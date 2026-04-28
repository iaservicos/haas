import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

export const supabase = createClient(supabaseUrl || '', supabaseKey || '');

/**
 * Interface para dados de análise do GPTMaker
 */
export interface AnalisisFoto {
  numero_serie: string;
  foto_id: number;
  vistoria_id: string;
  prompt_enviado?: string;
  resultado_gptmaker: string;
  status: 'pendente' | 'concluído' | 'erro';
}

/**
 * Salva análise de foto no Supabase
 */
export async function saveAnalisisFoto(data: AnalisisFoto): Promise<boolean> {
  try {
    console.log(`[Supabase] Salvando análise para foto_id: ${data.foto_id}`);

    const { error } = await supabase
      .from('analises_fotos')
      .insert([
        {
          numero_serie: data.numero_serie,
          foto_id: data.foto_id,
          vistoria_id: data.vistoria_id,
          prompt_enviado: data.prompt_enviado || null,
          resultado_gptmaker: data.resultado_gptmaker,
          status: data.status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

    if (error) {
      console.error(`[Supabase] Erro ao salvar análise:`, error);
      return false;
    }

    console.log(`[Supabase] ✅ Análise salva com sucesso`);
    return true;
  } catch (error) {
    console.error('[Supabase] Erro ao salvar análise:', error);
    return false;
  }
}

/**
 * Atualiza análise de foto no Supabase
 */
export async function updateAnalisisFoto(
  fotoId: number,
  data: Partial<AnalisisFoto>
): Promise<boolean> {
  try {
    console.log(`[Supabase] Atualizando análise para foto_id: ${fotoId}`);

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (data.resultado_gptmaker) updateData.resultado_gptmaker = data.resultado_gptmaker;
    if (data.status) updateData.status = data.status;
    if (data.prompt_enviado) updateData.prompt_enviado = data.prompt_enviado;

    const { error } = await supabase
      .from('analises_fotos')
      .update(updateData)
      .eq('foto_id', fotoId);

    if (error) {
      console.error(`[Supabase] Erro ao atualizar análise:`, error);
      return false;
    }

    console.log(`[Supabase] ✅ Análise atualizada com sucesso`);
    return true;
  } catch (error) {
    console.error('[Supabase] Erro ao atualizar análise:', error);
    return false;
  }
}

/**
 * Busca análise de foto no Supabase
 */
export async function getAnalisisFoto(fotoId: number): Promise<AnalisisFoto | null> {
  try {
    const { data, error } = await supabase
      .from('analises_fotos')
      .select('*')
      .eq('foto_id', fotoId)
      .single();

    if (error) {
      console.error(`[Supabase] Erro ao buscar análise:`, error);
      return null;
    }

    return data as AnalisisFoto;
  } catch (error) {
    console.error('[Supabase] Erro ao buscar análise:', error);
    return null;
  }
}
