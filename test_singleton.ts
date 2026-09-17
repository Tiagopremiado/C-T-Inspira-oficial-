import { getSupabase } from './server/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = getSupabase();
  const res1 = await supabase.from('pre_cadastros').select('id');
  console.log("Before login:", res1.data?.length);
  
  await supabase.auth.signInWithPassword({ email: 'comando@inspira.com', password: 'inspira2026' });
  
  const res2 = await supabase.from('pre_cadastros').select('id');
  console.log("After login:", res2.data?.length);
  
  await supabase.auth.signOut();
  
  const res3 = await supabase.from('pre_cadastros').select('id');
  console.log("After logout:", res3.data?.length);
}
run();
