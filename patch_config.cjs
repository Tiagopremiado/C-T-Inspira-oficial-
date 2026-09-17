const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/isSupabase: isSupabaseConfigured\(\),/g, 
`isSupabase: isSupabaseConfigured(), supabaseUrl: process.env.SUPABASE_URL,`);

fs.writeFileSync('server.ts', code);
