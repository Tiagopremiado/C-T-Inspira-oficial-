import { getSupabase } from './server/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const supabase = getSupabase();
    const { data: users, error } = await supabase.auth.admin.listUsers();
    if (error) console.error("Error fetching users:", error);
    else console.log("Users:", users.users.map(u => ({ email: u.email, confirmed: !!u.email_confirmed_at })));
  } catch (e) {
    console.error("Exception:", e);
  }
}
run();
