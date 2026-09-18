import { getSupabase } from './server/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('historico_aluno').select('*').limit(5);
  console.log(data, error);
}
run();
