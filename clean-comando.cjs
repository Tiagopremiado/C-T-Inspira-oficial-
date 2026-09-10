const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

// Remove the incorrect inserts
code = code.replace(/                \{showNovoAlunoModal && \([\s\S]*?\}\)\n    <\/div>\n/g, '');

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
