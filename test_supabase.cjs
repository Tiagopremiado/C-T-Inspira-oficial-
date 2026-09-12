require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
          .from('pre_cadastros')
          .insert({
            criado_em: new Date().toISOString(),
            status: 'Aguardando contato',
            tipo_cadastro: 'aluno',
            nome_aluno: 'Teste Supabase',
            nascimento_aluno: '2000-01-01',
            cidade_aluno: 'Teste',
            whats_aluno: '12345678',
            nome_responsavel: '',
            parentesco: '',
            whats_responsavel: '',
            contato_preferido: '',
            observacao: 'Teste',
          })
          .select('id')
          .single();
          
  console.log('Result:', data);
  console.log('Error:', error);
}

test();
