const fs = require('fs');
let code = fs.readFileSync('src/components/NovoAlunoModal.tsx', 'utf-8');

// Replace imports and interface
code = code.replace(
  /interface FichaCompletaProps \{\n  onNavigate: \(route: string\) => void;\n\}/,
  `interface NovoAlunoModalProps {\n  onClose: () => void;\n  onSuccess: () => void;\n  token: string;\n}`
);

code = code.replace(
  /export const NovoAlunoModal: React\.FC<FichaCompletaProps> = \(\{ onNavigate \}\) => \{/,
  `export const NovoAlunoModal: React.FC<NovoAlunoModalProps> = ({ onClose, onSuccess, token }) => {`
);

// Remove URL params useEffect
code = code.replace(
  /  \/\/ Read URL params on mount[\s\S]*?  \}, \[\]\);\n/,
  ''
);

// Update fetch URL and add headers
code = code.replace(
  /const response = await fetch\('\/api\/cadastros-completos', \{/,
  `const response = await fetch('/api/comando/novo-aluno', {
        headers: {
          'Authorization': \`Bearer \${token}\`
        },`
);

// Update layout wrappers (remove top header and adjust main container)
code = code.replace(
  /  return \([\s\S]*?\{.*?Top Header.*?\}[\s\S]*?<\/header>/,
  `  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0a1620] border border-[rgba(255,255,255,0.1)] rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
        <header className="sticky top-0 z-10 flex justify-between items-center p-5 border-b border-[rgba(255,255,255,0.05)] bg-[#0a1620]/95 backdrop-blur">
          <h2 className="text-xl font-bold text-white">Cadastrar Novo Aluno</h2>
          <button onClick={onClose} className="text-[#9dafb9] hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </header>
        <div className="p-5">`
);

// Fix end of layout wrappers
code = code.replace(
  /        <\/div>\n      <\/main>\n    <\/div>\n  \);\n\}/,
  `        </div>\n      </div>\n    </div>\n  );\n}`
);

// Remove the Success View and replace with calling onSuccess
code = code.replace(
  /      setSubmitted\(true\);[\s\S]*?\}, 100\);/,
  `      onSuccess();\n      onClose();`
);

// Remove the `if (submitted)` block
code = code.replace(
  /  if \(submitted\) \{[\s\S]*?Voltar ao site.*?<\/button>.*?<\/div>.*?<\/div>.*?<\/main>.*?<\/div>.*?  \}/g,
  ``
);

// Make sure to add X to imports if missing
if (!code.includes('X,')) {
  code = code.replace(/import \{ /, 'import { X, ');
}

fs.writeFileSync('src/components/NovoAlunoModal.tsx', code);
