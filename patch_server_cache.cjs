const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/const app = express\(\);/g, 
`const app = express();
// Anti-caching for all API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});
`);

fs.writeFileSync('server.ts', code);
