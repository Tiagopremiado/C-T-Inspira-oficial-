const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf8');

code = code.replace(/fetch\(`\/api\/comando\/ficha\/\$\{id\}`,\s*\{/g, 'fetch(`/api/comando/ficha/${id}?t=${Date.now()}`, {');

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
