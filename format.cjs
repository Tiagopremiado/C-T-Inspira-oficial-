const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');
code = code.replace(/<span>Exportar CSV<\/span>\s*<\/button>\s*<\/div>\s*\{\/\* Stats Bar \*\//, `<span>Exportar CSV</span>\n            </button>\n            </div>\n          </div>\n\n          {/* Stats Bar */`);
fs.writeFileSync('src/components/ComandoGeral.tsx', code);
