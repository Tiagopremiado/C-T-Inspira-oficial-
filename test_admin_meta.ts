import { getSupabase } from './server/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = getSupabase();
  const { data: usersData } = await supabase.auth.admin.listUsers();
  if (usersData?.users?.length) {
    const user = usersData.users[0];
    console.log("Current metadata:", user.user_metadata);
    
    // Update metadata
    const { data: updateData, error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        ...user.user_metadata,
        funcao: 'Administrador',
        status: 'Ativo'
      }
    });
    console.log("Updated:", updateData?.user?.user_metadata, error);
  }
}
run();
