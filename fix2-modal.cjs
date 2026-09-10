const fs = require('fs');
let code = fs.readFileSync('src/components/NovoAlunoModal.tsx', 'utf-8');

code = code.replace(
  /        <div className="p-5">\n      \{\/\* Main Card \*\/\}\n      <main className="pt-8 px-3">\n        <div className="w-\[min\(780px,calc\(100%-24px\)\)\] mx-auto">/,
  `        <div className="p-5">`
);

// We removed two divs (`main` and `w-min`), so we need to remove two closing divs at the end.
const endPattern = /              <\/form>\n            \}\)\n          <\/div>\n        <\/div>\n      <\/div>\n    <\/div>\n  \);\n\};/;
if (endPattern.test(code)) {
  code = code.replace(endPattern, 
  `              </form>\n            )}\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};`);
}

fs.writeFileSync('src/components/NovoAlunoModal.tsx', code);
