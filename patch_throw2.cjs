const fs = require('fs');
let code = fs.readFileSync('server/dataService.ts', 'utf8');

code = code.replace(/\} catch \(err\) \{\s*console\.warn\('Supabase createPreCadastro failed, using SQLite:', err\);\s*\}/s, 
`} catch (err) {
        console.error('Supabase createPreCadastro failed:', err);
        throw err;
      }`);

fs.writeFileSync('server/dataService.ts', code);
