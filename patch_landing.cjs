const fs = require('fs');
let code = fs.readFileSync('src/components/LandingPage.tsx', 'utf8');

const importStr = "import { ArrowRight, Check, X, Shield, Star, Users, Compass, Award, Heart, Lock, Calendar, Phone, MapPin, User, MessageSquare, MessageCircle } from 'lucide-react';";
code = code.replace(/import \{ ArrowRight, Check.*?\} from 'lucide-react';/, importStr);

const originalBtn = `<button
                  onClick={() => setModalOpen(false)}
                  className="mt-5 w-full py-3 rounded-xl bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white font-bold text-sm cursor-pointer transition"
                >
                  Concluir
                </button>`;

const newBtns = `<a
                  href={\`https://wa.me/5553992185203?text=\${encodeURIComponent(\`Olá, Comando! 🫡 Um novo Pré-Cadastro acabou de ser realizado no sistema pelo responsável \${nomeResponsavel} para o aluno \${nomeAluno}. Acesse o painel para conferir!\`)}\`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 w-full py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <MessageCircle className="w-5 h-5" />
                  Avisar Comando pelo WhatsApp
                </a>
                <button
                  onClick={() => setModalOpen(false)}
                  className="mt-3 w-full py-3 rounded-xl bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white font-bold text-sm cursor-pointer transition"
                >
                  Concluir
                </button>`;

code = code.replace(originalBtn, newBtns);
fs.writeFileSync('src/components/LandingPage.tsx', code);
