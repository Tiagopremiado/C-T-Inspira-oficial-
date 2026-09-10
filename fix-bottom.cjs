const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

const lastFormIndex = code.lastIndexOf('<form onSubmit={handleChangePassword}');
if (lastFormIndex !== -1) {
  let formStr = code.substring(lastFormIndex);
  formStr = formStr.replace(/\{showNovoAlunoModal && \([\s\S]*?\}\)\n    <\/div>/g, '');
  code = code.substring(0, lastFormIndex) + formStr;
  
  // Re-add the valid one at the end
  code = code.replace(/      \}\)\n  \);\n\};/, `      )}
      
      {showNovoAlunoModal && (
        <NovoAlunoModal 
          token={token}
          onClose={() => setShowNovoAlunoModal(false)}
          onSuccess={() => loadCadastros(token)}
        />
      )}
    </div>
  );
};`);
}

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
