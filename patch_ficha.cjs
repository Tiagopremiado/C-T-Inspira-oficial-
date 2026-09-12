const fs = require('fs');
let code = fs.readFileSync('src/components/FichaAluno.tsx', 'utf8');

// Add imports
code = code.replace(/import \{ CadastroCompleto, PreCadastro \} from '\.\.\/types\.js';/, `import { CadastroCompleto, PreCadastro, HistoricoAluno } from '../types.js';
import { Clock, Plus } from 'lucide-react';`);

// Add state to component
code = code.replace(/const \[editData, setEditData\] = useState<any>\(\{\}\);/, `const [editData, setEditData] = useState<any>({});
  const [historico, setHistorico] = useState<HistoricoAluno[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [docStatus, setDocStatus] = useState(preCadastro.documentacaoStatus || 'Pendente');
  
  // Controle de atendimento state
  const [responsavelContato, setResponsavelContato] = useState(preCadastro.responsavelContato || '');
  const [proximoPasso, setProximoPasso] = useState(preCadastro.proximoPasso || '');
  const [observacaoContato, setObservacaoContato] = useState(preCadastro.observacaoContato || '');

  React.useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistorico();
    }
  }, [activeTab]);

  const fetchHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(\`/api/historico/\${preCadastro.id}\`, {
        headers: token ? { Authorization: \`Bearer \${token}\` } : {}
      });
      if (res.ok) setHistorico(await res.json());
    } catch (e) {} finally { setLoadingHistorico(false); }
  };

  const handleSaveContato = async () => {
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(\`/api/pre-cadastros/\${preCadastro.id}/contato\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: \`Bearer \${token}\` } : {}) },
        body: JSON.stringify({ responsavelContato, proximoPasso, observacaoContato })
      });
      if (res.ok) {
        alert('Contato registrado com sucesso!');
        if (activeTab === 'historico') fetchHistorico();
      }
    } catch (e) { alert('Erro ao salvar contato'); }
  };

  const handleSaveDocStatus = async (status: string) => {
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(\`/api/pre-cadastros/\${preCadastro.id}/documentacao\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: \`Bearer \${token}\` } : {}) },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setDocStatus(status);
        if (activeTab === 'historico') fetchHistorico();
      }
    } catch (e) {}
  };
`);

// Replace Documentos content
const docsReplacement = `
          {/* Aba: Documentos */}
          {(activeTab === 'documentos' || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
            <div className="animate-in fade-in duration-300 print:mb-8">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2 hidden print:flex"><FileText className="w-5 h-5"/> Documentos</h3>
              
              <div className="mb-6 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <strong className="text-white block mb-1">Status da Documentação</strong>
                  <span className="text-xs text-[#8fa2ad]">Gerencie o andamento da entrega de documentos</span>
                </div>
                <select 
                  value={docStatus}
                  onChange={(e) => handleSaveDocStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0d1a23] text-white text-xs font-semibold focus:border-[#f5c33b] focus:outline-none cursor-pointer"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em análise">Em análise</option>
                  <option value="Completo">Completo</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
`;
code = code.replace(/\{\/\* Aba: Documentos \*\/\}.*?(?=<div className="grid grid-cols-1 gap-4">)/s, docsReplacement);

// Replace Historico Content
const historicoReplacement = `
          {/* Aba: Histórico Inspira */}
          {(activeTab === 'historico' || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
            <div className="animate-in fade-in duration-300 print:mb-8">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2 hidden print:flex"><Shield className="w-5 h-5"/> Histórico Inspira</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Timeline */}
                <div className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-[#f5c33b]"/> Linha do Tempo</h4>
                  
                  {loadingHistorico ? (
                     <div className="text-center text-[#8fa2ad] text-sm py-4">Carregando...</div>
                  ) : historico.length === 0 ? (
                     <div className="text-center text-[#8fa2ad] text-sm py-4">Nenhum evento registrado.</div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[rgba(255,255,255,0.1)] before:to-transparent">
                      {historico.map((h, i) => (
                        <div key={i} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[rgba(11,23,33,1)] bg-[#f5c33b] text-[#0b1721] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <div className="w-2 h-2 rounded-full bg-[#0b1721]"></div>
                          </div>
                          <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] shadow">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[#f5c33b] text-[10px] uppercase font-bold">{h.tipoEvento}</span>
                              <span className="text-[#8fa2ad] text-[10px]">{new Date(h.dataEvento).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="text-sm text-white mb-1">{h.descricao}</p>
                            <span className="text-[10px] text-[#8fa2ad]">Usuário: {h.usuario}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Controle de Atendimento */}
                <div className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-400"/> Registrar Atendimento</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[#8fa2ad] text-xs font-bold mb-1">Responsável pelo Contato</label>
                      <input 
                        type="text" 
                        value={responsavelContato}
                        onChange={(e) => setResponsavelContato(e.target.value)}
                        className="w-full px-3 py-2 bg-[#060c12] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white focus:border-[#f5c33b] focus:outline-none transition"
                        placeholder="Nome do membro do Comando"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8fa2ad] text-xs font-bold mb-1">Próximo Passo / Ação</label>
                      <input 
                        type="text" 
                        value={proximoPasso}
                        onChange={(e) => setProximoPasso(e.target.value)}
                        className="w-full px-3 py-2 bg-[#060c12] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white focus:border-[#f5c33b] focus:outline-none transition"
                        placeholder="Ex: Ligar na sexta-feira"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8fa2ad] text-xs font-bold mb-1">Observações do Contato</label>
                      <textarea 
                        value={observacaoContato}
                        onChange={(e) => setObservacaoContato(e.target.value)}
                        className="w-full px-3 py-2 bg-[#060c12] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white focus:border-[#f5c33b] focus:outline-none transition min-h-[80px]"
                        placeholder="Resumo da conversa..."
                      />
                    </div>
                    <button 
                      onClick={handleSaveContato}
                      className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-sm border border-emerald-500/30 hover:bg-emerald-500/30 transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Salvar Atendimento
                    </button>
                  </div>
                  
                  <div className="mt-6 flex flex-col items-center justify-center p-4 text-center rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                    <Shield className="w-6 h-6 text-[#f5c33b] opacity-50 mb-2" />
                    <h5 className="text-white text-sm font-bold mb-1">Área do Aluno (Em Breve)</h5>
                    <p className="text-xs text-[#8fa2ad]">Esta aba integrará as avaliações, missões e desempenho na Fase 3.</p>
                  </div>
                </div>

              </div>
            </div>
          )}
`;

code = code.replace(/\{\/\* Aba: Histórico Inspira \*\/}.*?(?=<div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-\[rgba\(255,255,255,0\.1\)\] bg-\[rgba\(255,255,255,0\.01\)\]">)/s, historicoReplacement);
// Remove the rest of the old placeholder
code = code.replace(/<div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-\[rgba\(255,255,255,0\.1\)\] bg-\[rgba\(255,255,255,0\.01\)\]">.*?<\/div>\s*<\/div>\s*\)}/s, "");

fs.writeFileSync('src/components/FichaAluno.tsx', code);
