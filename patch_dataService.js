const fs = require('fs');
let code = fs.readFileSync('server/dataService.ts', 'utf8');

// Replace mapping inside getPreCadastros (Supabase branch)
code = code.replace(/fichaId: full \? full\.id : null,\s*\};\s*\}\);/g, `fichaId: full ? full.id : null,
              documentacaoStatus: r.documentacao_status || 'Pendente',
              ultimoContatoEm: r.ultimo_contato_em,
              responsavelContato: r.responsavel_contato,
              proximoPasso: r.proximo_passo,
              observacaoContato: r.observacao_contato,
            };
          });`);

// Replace mapping inside getPreCadastros (SQLite branch)
code = code.replace(/fichaId: row\.ficha_id \? Number\(row\.ficha_id\) : undefined,\s*\};\s*\}\);/g, `fichaId: row.ficha_id ? Number(row.ficha_id) : undefined,
      documentacaoStatus: row.documentacao_status || 'Pendente',
      ultimoContatoEm: row.ultimo_contato_em,
      responsavelContato: row.responsavel_contato,
      proximoPasso: row.proximo_passo,
      observacaoContato: row.observacao_contato,
    };
  });`);

fs.writeFileSync('server/dataService.ts', code);
