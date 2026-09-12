const fs = require('fs');
let code = fs.readFileSync('src/components/FichaCompleta.tsx', 'utf8');

code = code.replace(/fetch\(`\/api\/comando\/ficha\/\$\{refId\}`\)/g, 'fetch(`/api/comando/ficha/${refId}?t=${Date.now()}`)');

fs.writeFileSync('src/components/FichaCompleta.tsx', code);
