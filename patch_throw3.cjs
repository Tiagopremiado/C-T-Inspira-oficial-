const fs = require('fs');
let code = fs.readFileSync('server/dataService.ts', 'utf8');

code = code.replace(/if \(error\) \{\s*console\.warn\('Supabase createCadastroCompleto error:', error\.message\);\s*\}/s, 
`if (error) {
          console.error('Supabase createCadastroCompleto error:', error);
          throw new Error('Database Error: ' + error.message);
        }`);

code = code.replace(/\} catch \(err\) \{\s*console\.warn\('Supabase createCadastroCompleto failed, storing in SQLite:', err\);\s*\}/s, 
`} catch (err) {
        console.error('Supabase createCadastroCompleto failed:', err);
        throw err;
      }`);

fs.writeFileSync('server/dataService.ts', code);
