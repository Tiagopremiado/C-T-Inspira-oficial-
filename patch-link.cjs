const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

code = code.replace(
  /    const link = new URL\('\/ficha-completa', base\);\n    link\.searchParams\.set\('ref', String\(item\.id\)\);\n    link\.searchParams\.set\('aluno', item\.nomeAluno \|\| ''\);\n    link\.searchParams\.set\('cidade', item\.cidadeAluno \|\| ''\);\n    if \(item\.nomeResponsavel\) link\.searchParams\.set\('responsavel', item\.nomeResponsavel\);/g,
  `    const link = new URL('/ficha-completa', base);\n    link.searchParams.set('ref', String(item.id));`
);

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
