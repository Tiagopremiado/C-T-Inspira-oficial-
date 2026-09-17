const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/app\.get\('\/api\/pre-cadastros', /g, 
`app.get('/api/pre-cadastros', (req, res, next) => { console.log("API pre-cadastros HIT"); next(); }, `);

fs.writeFileSync('server.ts', code);
