import { dataService } from './server/dataService.js';
import dotenv from 'dotenv';
dotenv.config();

console.log("Direct SUPABASE_URL:", process.env.SUPABASE_URL);

async function run() {
  const list = await dataService.getPreCadastros();
  console.log("Direct length:", list.length);
}
run();
