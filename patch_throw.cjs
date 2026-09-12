const fs = require('fs');
let code = fs.readFileSync('server/dataService.ts', 'utf8');

code = code.replace(/if \(error\) \{\s*console\.warn\('Supabase createPreCadastro error:', error\.message\);\s*\} else if \(inserted\) \{/s, 
`if (error) {
          console.error('Supabase createPreCadastro error:', error);
          throw new Error('Database Error: ' + error.message);
        } else if (inserted) {`);

fs.writeFileSync('server/dataService.ts', code);
