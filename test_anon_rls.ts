import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
  const { data, error } = await supabase.from('pre_cadastros').select('*');
  console.log("Anon data length:", data ? data.length : "null", "Error:", error);
}
run();
