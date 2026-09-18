import { getSupabase } from './server/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const supabase = getSupabase();
  const { data, error } = await supabase.from('historico_aluno').insert({
    aluno_id: 0,
    tipo_evento: 'Usuário',
    descricao: 'Administrador criou usuário João',
    data_evento: new Date().toISOString(),
    usuario: 'Comando'
  }).select();
  console.log(data, error);
}
run();
