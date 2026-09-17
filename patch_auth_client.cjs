const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

if (!code.includes('createClient')) {
  code = code.replace("import express from 'express';", "import express from 'express';\nimport { createClient } from '@supabase/supabase-js';");
}

code = code.replace(
  "const supabase = getSupabase();\n      let finalEmail = username;",
  `// Create a fresh client for auth to avoid mutating the global singleton's session
      const authSupabase = createClient(process.env.SUPABASE_URL || '', (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY) || '', { auth: { persistSession: false, autoRefreshToken: false } });
      let finalEmail = username;`
);

code = code.replace(/await supabase\.auth\.signInWithPassword/g, "await authSupabase.auth.signInWithPassword");
code = code.replace(/await supabase\.auth\.signUp/g, "await authSupabase.auth.signUp");

fs.writeFileSync('server.ts', code);
