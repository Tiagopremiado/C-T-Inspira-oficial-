require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.from('pre_cadastros').select('id, nome_aluno').eq('nome_aluno', 'Teste Date');
  console.log(data, error);
}
test();
