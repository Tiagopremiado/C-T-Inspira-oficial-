require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function test() {
  const { data, error } = await supabase.from('pre_cadastros').insert({
    criado_em: new Date().toISOString(),
    status: 'Aguardando contato',
    tipo_cadastro: 'aluno',
    nome_aluno: 'Teste Date',
    nascimento_aluno: '', // testing empty date
    cidade_aluno: 'Teste',
    whats_aluno: '123',
    nome_responsavel: '',
    parentesco: '',
    whats_responsavel: '',
    contato_preferido: '',
    observacao: '',
  });
  console.log(error);
}
test();
