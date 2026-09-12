const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/async function startServer\(\) \{/, `// Global API Error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/')) {
    console.error('API Error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  } else {
    next(err);
  }
});

async function startServer() {`);

fs.writeFileSync('server.ts', code);
