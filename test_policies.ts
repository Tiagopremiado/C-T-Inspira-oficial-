import { getSupabase } from './server/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('get_policies', {});
  if (error) {
    const { data: d2, error: e2 } = await supabase.from('pg_policies').select('*').eq('tablename', 'pre_cadastros');
    console.log(d2 || e2);
  } else {
    console.log(data);
  }
}
run();
