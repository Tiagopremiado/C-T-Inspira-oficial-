const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

// 1. Add import
if (!code.includes('import { NovoAlunoModal }')) {
  code = code.replace(
    /import \{ FichaCompleta \} from '\.\/FichaCompleta\.js';/,
    "import { FichaCompleta } from './FichaCompleta.js';\nimport { NovoAlunoModal } from './NovoAlunoModal.js';"
  );
  // Also we might need to add it if FichaCompleta is not imported there
  if (!code.includes("from './NovoAlunoModal.js'")) {
     code = code.replace(
       /import \{ PreCadastro, CadastroCompleto \} from '\.\.\/types\.js';/,
       "import { PreCadastro, CadastroCompleto } from '../types.js';\nimport { NovoAlunoModal } from './NovoAlunoModal.js';"
     );
  }
}

// 2. Add state for modal
if (!code.includes('showNovoAlunoModal')) {
  code = code.replace(
    /const \[showPasswordModal, setShowPasswordModal\] = useState\(false\);/,
    "const [showPasswordModal, setShowPasswordModal] = useState(false);\n  const [showNovoAlunoModal, setShowNovoAlunoModal] = useState(false);\n  const [token, setToken] = useState('');"
  );
}

// 3. Save token on login
if (code.includes('loadCadastros(data.token);')) {
  code = code.replace(
    /loadCadastros\(data\.token\);/,
    "setToken(data.token);\n      loadCadastros(data.token);"
  );
} else {
    // maybe it is in checkAuth
  code = code.replace(
    /loadCadastros\(data\.token\);/g,
    "setToken(data.token);\n        loadCadastros(data.token);"
  );
}

// 4. Also save token in useEffect checkAuth
code = code.replace(
  /setIsAuthenticated\(true\);\n\s+loadCadastros\(data\.token\);/,
  "setIsAuthenticated(true);\n          setToken(data.token);\n          loadCadastros(data.token);"
);

// 5. Add "Cadastrar Novo Aluno" button
code = code.replace(
  /<button\n\s+onClick=\{handleExportCsv\}\n\s+className="btn-inspira-gold px-4 py-2\.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shrink-0"\n\s+>/,
  `<button
              onClick={() => setShowNovoAlunoModal(true)}
              className="btn-inspira-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Cadastrar Novo Aluno</span>
            </button>
            <button
              onClick={handleExportCsv}
              className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.045)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition flex items-center gap-2 cursor-pointer shrink-0"`
);

// 6. Render Modal
code = code.replace(
  /\{showPasswordModal && \([\s\S]*?\}\)/,
  `{showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0a1620] border border-[rgba(255,255,255,0.1)] rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-4">Alterar Senha do Comando</h2>
            {pwdError && (
              <div className="p-3 mb-4 rounded-xl bg-red-900/40 border border-red-500/40 text-red-200 text-sm">
                {pwdError}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-[#dce5ea] mb-1">Senha Atual</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#dce5ea] mb-1">Nova Senha</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.11)] text-white font-bold hover:bg-[rgba(255,255,255,0.045)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingPwd}
                  className="flex-1 btn-inspira-gold px-4 py-2.5 rounded-xl text-black font-bold flex justify-center items-center cursor-pointer"
                >
                  {savingPwd ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNovoAlunoModal && (
        <NovoAlunoModal 
          token={token}
          onClose={() => setShowNovoAlunoModal(false)}
          onSuccess={() => {
            loadCadastros(token);
          }}
        />
      )}`
);

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
