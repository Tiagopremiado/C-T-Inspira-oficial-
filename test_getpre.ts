import { dataService } from './server/dataService.js';
import { isSupabaseConfigured } from './server/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Supabase configured?", isSupabaseConfigured());
  try {
    const list = await dataService.getPreCadastros();
    console.log("List length:", list.length);
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
