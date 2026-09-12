const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf8');

code = code.replace(/} else if \(statusFilter !== 'todos'\) \{/, `} else if (statusFilter === 'Doc: Pendente') {
        matchesFilter = r.documentacaoStatus === 'Pendente';
      } else if (statusFilter === 'Doc: Em análise') {
        matchesFilter = r.documentacaoStatus === 'Em análise';
      } else if (statusFilter === 'Doc: Completo') {
        matchesFilter = r.documentacaoStatus === 'Completo';
      } else if (statusFilter !== 'todos') {`);

code = code.replace(/<option value="Documentação pendente">Doc\. pendente<\/option>/, `<option value="Documentação pendente">Status: Doc. pendente</option>
              <option value="Doc: Pendente">Apenas Docs Pendentes</option>
              <option value="Doc: Em análise">Apenas Docs Em análise</option>
              <option value="Doc: Completo">Apenas Docs Completos</option>`);

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
