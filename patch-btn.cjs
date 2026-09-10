const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

// The "Cadastrar Novo Aluno" button is roughly:
// <button
//   onClick={() => setShowNovoAlunoModal(true)}
//   className="btn-inspira-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shrink-0"
// >
//   <FileText className="w-4 h-4" />
//   <span>Cadastrar Novo Aluno</span>
// </button>

// Let's add "Copiar Link de Inscrição" next to it.
code = code.replace(
  /<button\n\s+onClick=\{\(\) => setShowNovoAlunoModal\(true\)\}\n\s+className="btn-inspira-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shrink-0"\n\s+>\n\s+<FileText className="w-4 h-4" \/>\n\s+<span>Cadastrar Novo Aluno<\/span>\n\s+<\/button>/,
  `<button
              onClick={() => {
                const base = appBaseUrl || window.location.origin;
                const link = new URL('/ficha-completa', base);
                navigator.clipboard.writeText(link.toString())
                  .then(() => alert('Link de nova inscrição copiado!'))
                  .catch(() => alert('Falha ao copiar link.'));
              }}
              className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.045)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar link de inscrição</span>
            </button>
            <button
              onClick={() => setShowNovoAlunoModal(true)}
              className="btn-inspira-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Cadastrar Novo Aluno</span>
            </button>`
);

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
