const fs = require('fs');
let code = fs.readFileSync('src/components/NovoAlunoModal.tsx', 'utf-8');

// Replace the start of the layout wrapper
code = code.replace(
  /        <div className="p-5">\n      \{\/\* Main Card \*\/\}\n      <main className="pt-8 px-3">\n        <div className="w-\[min\(780px,calc\(100%-24px\)\)\] mx-auto">\n          <div className="p-6 sm:p-8 rounded-3xl bg-\[linear-gradient\(180deg,rgba\(12,27,39,0\.97\),rgba\(8,18,26,0\.98\)\)\] border border-\[rgba\(84,160,212,0\.14\)\] shadow-\[0_28px_80px_rgba\(0,0,0,0\.32\)\]">/,
  `        <div className="p-5">\n          <div className="p-6 sm:p-8 rounded-3xl bg-[linear-gradient(180deg,rgba(12,27,39,0.97),rgba(8,18,26,0.98))] border border-[rgba(84,160,212,0.14)] shadow-[0_28px_80px_rgba(0,0,0,0.32)]">`
);

// Replace the end
code = code.replace(
  /              <\/form>\n            \}\)\n          <\/div>\n        <\/div>\n      <\/div>\n    <\/div>\n  \);\n\};/g,
  `              </form>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};`
);

fs.writeFileSync('src/components/NovoAlunoModal.tsx', code);
