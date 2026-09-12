const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf8');

code = code.replace(/fetch\('\/api\/pre-cadastros', \{ headers \}\)/g, 'fetch(`/api/pre-cadastros?t=${Date.now()}`, { headers })');

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
