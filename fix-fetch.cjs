const fs = require('fs');
let code = fs.readFileSync('src/components/NovoAlunoModal.tsx', 'utf-8');

code = code.replace(
  /const res = await fetch\('\/api\/cadastros-completos', \{[\s\S]*?method: 'POST',[\s\S]*?body: formData,[\s\S]*?\}\);/,
  `const res = await fetch('/api/comando/novo-aluno', {
        method: 'POST',
        headers: { 'Authorization': \`Bearer \${token}\` },
        body: formData,
      });`
);

fs.writeFileSync('src/components/NovoAlunoModal.tsx', code);
