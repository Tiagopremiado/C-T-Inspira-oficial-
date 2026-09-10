const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

const lastFormIndex = code.lastIndexOf('<form onSubmit={handleChangePassword}');
if (lastFormIndex !== -1) {
  code = code.substring(0, lastFormIndex) + `<form onSubmit={handleChangePassword} className="space-y-4">
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
fs.writeFileSync('src/components/ComandoGeral.tsx', code);
