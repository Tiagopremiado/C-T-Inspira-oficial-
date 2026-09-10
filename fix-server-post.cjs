const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(
  /    \/\/ Check if previous registration exists for this ref and remove\/update\n    if \(ref\) \{[\s\S]*?db\.prepare\('DELETE FROM cadastros_completos WHERE ref = \?'\)\.run\(ref\);\n    \}/,
  `    let finalRef = ref;

    if (finalRef) {
      const existing = db.prepare('SELECT laudo_arquivo_path FROM cadastros_completos WHERE ref = ?').get(finalRef) as any;
      if (existing && existing.laudo_arquivo_path && file && fs.existsSync(existing.laudo_arquivo_path)) {
        try {
          fs.unlinkSync(existing.laudo_arquivo_path);
        } catch (err) {
          console.error('Error removing old laudo file:', err);
        }
      }
      db.prepare('DELETE FROM cadastros_completos WHERE ref = ?').run(finalRef);
    } else {
      // Auto-create a pre-cadastro so it shows up in the Comando table
      const insertPreStmt = db.prepare(\`
        INSERT INTO pre_cadastros (
          criado_em, status, tipo_cadastro, nome_aluno, nascimento_aluno, 
          cidade_aluno, whats_aluno, nome_responsavel, parentesco, whats_responsavel
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      \`);
      
      const preInfo = insertPreStmt.run(
        enviadoEm, 
        'Aguardando contato', 
        responsavel ? 'responsavel' : 'aluno',
        nome, 
        nascimento, 
        cidade, 
        whats, 
        responsavel, 
        parentesco, 
        whatsResponsavel
      );
      
      finalRef = String(preInfo.lastInsertRowid);
    }`
);

// We also need to change `ref, enviadoEm` in the insertStmt.run to `finalRef, enviadoEm`
code = code.replace(
  /insertStmt\.run\(\n      ref, enviadoEm, nome, nascimento, whats, cidade, bairro, endereco,/,
  `insertStmt.run(
      finalRef, enviadoEm, nome, nascimento, whats, cidade, bairro, endereco,`
);

fs.writeFileSync('server.ts', code);
