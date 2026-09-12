const fs = require('fs');
let code = fs.readFileSync('src/components/FichaCompleta.tsx', 'utf8');

const importStr = "import { Check, ArrowLeft, Upload, FileText, AlertCircle, ShieldCheck, MessageCircle } from 'lucide-react';";
code = code.replace(/import \{ Check, ArrowLeft.*?\} from 'lucide-react';/, importStr);

const originalBtn = `<button
                  onClick={() => onNavigate('landing')}
                  className="mt-6 w-full py-3.5 rounded-xl bg-[linear-gradient(135deg,#ffe27a,#f5c33b)] text-[#171100] font-black text-sm cursor-pointer shadow-lg transition hover:opacity-90"
                >
                  Voltar para a página inicial
                </button>`;

const newBtns = `<a
                  href={\`https://wa.me/5553992185203?text=\${encodeURIComponent(\`Olá, Comando! 🫡 A Ficha Completa de matrícula do aluno \${nome} acabou de ser preenchida e enviada no sistema pelo responsável \${responsavel}. Acesse o painel para conferir!\`)}\`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-6 w-full py-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition"
                >
                  <MessageCircle className="w-5 h-5" />
                  Avisar Comando pelo WhatsApp
                </a>
                <button
                  onClick={() => onNavigate('landing')}
                  className="mt-3 w-full py-3.5 rounded-xl bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white font-black text-sm cursor-pointer transition"
                >
                  Voltar para a página inicial
                </button>`;

code = code.replace(originalBtn, newBtns);
fs.writeFileSync('src/components/FichaCompleta.tsx', code);
