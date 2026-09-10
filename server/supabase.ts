import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Checks if Supabase credentials are configured in the environment.
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();
  return Boolean(url && key);
}

/**
 * Returns the lazily initialized Supabase client.
 * Throws a clear error if credentials are not configured.
 */
export function getSupabase(): SupabaseClient {
  if (!supabaseInstance) {
    const url = process.env.SUPABASE_URL?.trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)?.trim();

    if (!url || !key) {
      throw new Error(
        'Supabase is not configured. Please define SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in your environment variables.'
      );
    }

    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return supabaseInstance;
}

/**
 * Tests connection with Supabase.
 */
export async function testSupabaseConnection(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Variáveis de ambiente do Supabase não configuradas.' };
  }

  try {
    const client = getSupabase();
    const { error } = await client.from('pre_cadastros').select('id').limit(1);
    if (error) {
      return { ok: false, message: `Erro ao consultar tabela no Supabase: ${error.message}` };
    }
    return { ok: true, message: 'Conectado com sucesso ao Supabase!' };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Falha ao conectar com o Supabase.' };
  }
}
