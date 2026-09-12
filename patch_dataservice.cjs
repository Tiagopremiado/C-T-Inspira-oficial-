const fs = require('fs');
let code = fs.readFileSync('server/dataService.ts', 'utf8');

code = code.replace(/async updatePreCadastroDados\(id: number \| string, data: any\) \{[\s\S]*?\.run\(.*?id\);\n  \},/s, `async updatePreCadastroDados(id: number | string, data: any) {
    if (isSupabaseConfigured()) {
      try {
        await getSupabase().from('pre_cadastros').update({
          nome_aluno: data.nomeAluno,
          nascimento_aluno: data.nascimentoAluno,
          cidade_aluno: data.cidadeAluno,
          whats_aluno: data.whatsAluno,
          nome_responsavel: data.nomeResponsavel,
          parentesco: data.parentesco,
          whats_responsavel: data.whatsResponsavel
        }).eq('id', id);
        
        await getSupabase().from('cadastros_completos').update({
          nome: data.nomeAluno,
          nascimento: data.nascimentoAluno,
          cidade: data.cidadeAluno,
          whats: data.whatsAluno,
          responsavel: data.nomeResponsavel,
          parentesco: data.parentesco,
          whats_responsavel: data.whatsResponsavel
        }).eq('ref', id);
      } catch (e) {}
    }
    db.prepare(\`UPDATE pre_cadastros SET 
      nome_aluno = ?, nascimento_aluno = ?, cidade_aluno = ?, whats_aluno = ?, 
      nome_responsavel = ?, parentesco = ?, whats_responsavel = ? 
      WHERE id = ?\`)
      .run(data.nomeAluno, data.nascimentoAluno, data.cidadeAluno, data.whatsAluno, data.nomeResponsavel, data.parentesco, data.whatsResponsavel, id);
      
    try {
      db.prepare(\`UPDATE cadastros_completos SET 
        nome = ?, nascimento = ?, cidade = ?, whats = ?, 
        responsavel = ?, parentesco = ?, whats_responsavel = ? 
        WHERE ref = ?\`)
        .run(data.nomeAluno, data.nascimentoAluno, data.cidadeAluno, data.whatsAluno, data.nomeResponsavel, data.parentesco, data.whatsResponsavel, id);
    } catch(e) {}
  },`);

fs.writeFileSync('server/dataService.ts', code);
