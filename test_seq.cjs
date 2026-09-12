require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  for (let i = 0; i < 3; i++) {
    const { data, error } = await supabase.from('pre_cadastros').insert({
      criado_em: new Date().toISOString(),
      status: 'Aguardando contato',
      tipo_cadastro: 'aluno',
      nome_aluno: 'Teste Seq ' + i,
      nascimento_aluno: '2000-01-01',
      cidade_aluno: 'Teste',
      whats_aluno: '123',
    }).select('id');
    console.log('Inserted:', data, 'Error:', error);
  }
}
test();
