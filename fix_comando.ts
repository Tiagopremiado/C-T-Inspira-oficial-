import { getSupabase } from './server/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const supabase = getSupabase();
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (users && users.users) {
      const comando = users.users.find(u => u.email === 'comando@inspira.com');
      if (comando && !comando.email_confirmed_at) {
        console.log("Confirming comando user...");
        await supabase.auth.admin.updateUserById(comando.id, { email_confirm: true });
        console.log("Confirmed!");
      } else {
        console.log("Comando user not found or already confirmed.");
      }
    }
  } catch (e) {
    console.error("Exception:", e);
  }
}
run();
