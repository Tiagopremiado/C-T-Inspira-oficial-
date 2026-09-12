const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf8');

// Add calculateAge
if (!code.includes('calculateAge')) {
  code = code.replace(/const formatDate = /, `const calculateAge = (dob: string | undefined) => {
    if (!dob) return '';
    try {
      const d = new Date(dob.includes('T') ? dob : dob + 'T00:00:00');
      if (isNaN(d.getTime())) return '';
      const ageDifMs = Date.now() - d.getTime();
      const ageDate = new Date(ageDifMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970) + ' anos';
    } catch { return ''; }
  };
  const formatDate = `);
}

// Replace table header
code = code.replace(/<th className="p-3.5 text-left text-xs uppercase tracking-wider text-\[#8fa2ad\] font-bold">Aluno<\/th>.*?<th className="p-3.5 text-left text-xs uppercase tracking-wider text-\[#8fa2ad\] font-bold">Ações<\/th>/s, `<th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Aluno</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Data de Cadastro</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Responsável / WhatsApp</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Cidade</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Última Atualização</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Status</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold text-right">Ações</th>`);

// Replace table body row
code = code.replace(/<tr key=\{r\.id\} className="hover:bg-\[rgba\(255,255,255,0\.02\)\] transition">.*?<\/tr>/s, `<tr key={r.id} className="hover:bg-[rgba(255,255,255,0.02)] transition group">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-[#8fa2ad]" />
                          </div>
                          <div>
                            <strong className="block text-white group-hover:text-[#f5c33b] transition-colors">{r.nomeAluno}</strong>
                            <span className="text-[#84949d] text-xs block">{calculateAge(r.nascimentoAluno)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-[#8fa2ad]">
                        {formatDate(r.criadoEm)}
                      </td>
                      <td className="p-3.5">
                        <span className="block text-white text-sm">{r.nomeResponsavel || 'Não informado'}</span>
                        <span className="block font-mono text-xs text-[#8fa2ad] mt-0.5">{r.whatsResponsavel || r.whatsAluno || 'Sem número'}</span>
                      </td>
                      <td className="p-3.5 text-sm">
                        {r.cidadeAluno || '—'}
                      </td>
                      <td className="p-3.5 text-xs text-[#8fa2ad]">
                        {r.ultimoContatoEm ? new Date(r.ultimoContatoEm).toLocaleDateString('pt-BR') : 'Sem registro'}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={\`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border \${
                            r.status === 'Ativo' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                            r.status === 'Em análise' ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' :
                            r.status === 'Inativo' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                            r.status.includes('Documentação') ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' :
                            'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/30'
                          }\`}>
                            {r.status}
                          </span>
                          {r.hasFullRegistration && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              <CheckCircle className="w-3 h-3" /> Ficha Enviada
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleOpenFicha(r)}
                            className={\`min-h-[32px] px-2.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer \${
                              r.hasFullRegistration
                                ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-300 hover:bg-emerald-900/40'
                                : 'border-[#f5c33b]/40 bg-[#f5c33b]/10 text-[#f5c33b] hover:bg-[#f5c33b]/20'
                            }\`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Abrir Ficha</span>
                          </button>

                          <button
                            onClick={() => handleSendWhatsApp(r)}
                            className="w-8 h-8 rounded-lg border border-[rgba(245,195,59,0.25)] bg-[rgba(245,195,59,0.08)] text-[#ffe27a] hover:bg-[rgba(245,195,59,0.15)] transition flex items-center justify-center cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleCopyLink(r)}
                            className="w-8 h-8 rounded-lg border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)] transition flex items-center justify-center cursor-pointer"
                            title="Copiar link da ficha"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(r.id)}
                            className="w-8 h-8 rounded-lg border border-red-500/20 bg-red-950/20 text-red-300 hover:bg-red-900/40 transition flex items-center justify-center cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>`);

// We need to use `g` flag logic, so `replace` might not replace all table body rows if there's a map.
// Actually, `filtered.map` generates one block of JSX. Wait, my regex matches everything from `<tr` to `</tr>`.
// Is there only one `tr` block inside `tbody`? Yes.
fs.writeFileSync('src/components/ComandoGeral.tsx', code);
