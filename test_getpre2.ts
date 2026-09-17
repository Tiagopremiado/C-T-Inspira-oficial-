import { dataService } from './server/dataService.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const list = await dataService.getPreCadastros();
    console.log(JSON.stringify(list, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}
run();
