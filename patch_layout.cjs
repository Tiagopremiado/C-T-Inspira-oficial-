const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf8');

// Fix 1: Top bar - the button group flex items-center gap-2 -> flex flex-wrap items-center gap-2 justify-end
code = code.replace(/<div className="flex items-center gap-2">\s*<button\s*onClick=\{.*?setShowPasswordModal/g, '<div className="flex flex-wrap items-center gap-2 justify-end">\n          <button\n            onClick={() => setShowPasswordModal');

// Fix 2: Dashboard head buttons - flex gap-2 -> flex flex-wrap gap-2 w-full sm:w-auto
code = code.replace(/<div className="flex gap-2">\s*<button\s*onClick=\{.*?const base = appBaseUrl/g, '<div className="flex flex-wrap gap-2 w-full sm:w-auto">\n            <button\n              onClick={() => {                const base = appBaseUrl');

// For mobile, make those buttons w-full or flex-1 maybe? Just flex-wrap is enough, they will wrap. But they have shrink-0, let's remove shrink-0 or just let them wrap.
code = code.replace(/cursor-pointer shrink-0/g, 'cursor-pointer');

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
