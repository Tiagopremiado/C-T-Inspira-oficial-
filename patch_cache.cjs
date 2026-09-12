const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const middleware = `
// Anti-caching for API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

// Configure Multer
`;

code = code.replace(/\/\/ Configure Multer/g, middleware);

fs.writeFileSync('server.ts', code);
