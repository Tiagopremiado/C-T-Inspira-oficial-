const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

// There are rogue blocks like:
// {showNovoAlunoModal && (
//   <NovoAlunoModal ...
//   />
// )}
// </div>

code = code.replace(/\{showNovoAlunoModal && \([\s\S]*?\}\)\n    <\/div>/g, '');

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
