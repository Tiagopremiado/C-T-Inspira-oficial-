const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf8');

code = code.replace(/setCadastros\(\(prev\) =>\s*prev\.map\(\(item\) => \(item\.id === id \? \{ \.\.\.item, status: newStatus \} : item\)\)\s*\);/s, `setCadastros((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
        setSelectedAluno((prev) => prev && prev.id === id ? { ...prev, status: newStatus } : prev);`);

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
