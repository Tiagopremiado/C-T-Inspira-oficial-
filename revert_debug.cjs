const fs = require('fs');
let serverCode = fs.readFileSync('server.ts', 'utf8');

// Remove the debug logging from /api/pre-cadastros
serverCode = serverCode.replace(/app\.get\('\/api\/pre-cadastros', \(req, res, next\) => \{ console\.log\("API pre-cadastros HIT"\); next\(\); \}, async \(req, res\) => \{/g, 
"app.get('/api/pre-cadastros', requireAuth, async (req, res) => {");

serverCode = serverCode.replace(/  fs\.appendFileSync\('api_log\.txt'.*\n/g, "");

fs.writeFileSync('server.ts', serverCode);

let dataCode = fs.readFileSync('server/dataService.ts', 'utf8');
dataCode = dataCode.replace(/console\.log\("Fetching from Supabase\.\.\."\);\n/g, "");
dataCode = dataCode.replace(/console\.log\("Supabase returned", preList \? preList\.length : 0, "items"\);\n/g, "");
fs.writeFileSync('server/dataService.ts', dataCode);
