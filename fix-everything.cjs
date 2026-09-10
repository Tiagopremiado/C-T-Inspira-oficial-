const fs = require('fs');

// Fix ComandoGeral.tsx
let cg = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

// The pattern inserted was roughly:
// {showNovoAlunoModal && (
//   <NovoAlunoModal
//     token={token}
//     onClose={() => setShowNovoAlunoModal(false)}
//     onSuccess={() => {
//       loadCadastros(token);
//     }}
//   />
// )}
// </div>

cg = cg.replace(/\{\s*showNovoAlunoModal && \(\s*<NovoAlunoModal[\s\S]*?\/>\s*\)\s*\}/g, '');
cg = cg.replace(/<button\s*onClick=\{handleExportCsv\}[\s\S]*?shrink-0"\s*<Download className="w-4 h-4" \/>/g, 
  `<button
    onClick={handleExportCsv}
    className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.045)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition flex items-center gap-2 cursor-pointer shrink-0"
  >
    <Download className="w-4 h-4" />`);

// Remove extra stray `    </div>` that were left behind
cg = cg.replace(/<\/p>\s*<\/div>\s*<button/g, '</p>\n            </div>\n            <div className="flex gap-2">\n            <button');
cg = cg.replace(/<span>Exportar CSV<\/span>\s*<\/button>\s*<\/div>\s*<\/div>/g, '<span>Exportar CSV</span>\n            </button>\n            </div>\n          </div>');

// Re-add modal at the end
const lastFormIndex = cg.lastIndexOf('<form onSubmit={handleChangePassword}');
if (lastFormIndex !== -1) {
  cg = cg.substring(0, lastFormIndex) + `<form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">Senha atual</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">Nova senha (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl btn-inspira-gold text-sm font-black cursor-pointer"
              >
                Salvar nova senha
              </button>
            </form>
          </div>
        </div>
      )}

      {showNovoAlunoModal && (
        <NovoAlunoModal 
          token={token}
          onClose={() => setShowNovoAlunoModal(false)}
          onSuccess={() => loadCadastros(token)}
        />
      )}
    </div>
  );
};`;
}
fs.writeFileSync('src/components/ComandoGeral.tsx', cg);
