const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

code = code.replace(
  /      \}\)\n    <\/div>\n  \);\n\};/,
  `      )}

      {showNovoAlunoModal && (
        <NovoAlunoModal 
          token={token}
          onClose={() => setShowNovoAlunoModal(false)}
          onSuccess={() => {
            loadCadastros(token);
          }}
        />
      )}
    </div>
  );
};`
);

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
