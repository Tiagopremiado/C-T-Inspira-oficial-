const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/app\.patch\('\/api\/pre-cadastros\/:id\/contato', requireAuth, async \(req, res\) => \{/, `app.patch('/api/pre-cadastros/:id/dados', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nomeAluno, nascimentoAluno, cidadeAluno, whatsAluno, nomeResponsavel, parentesco, whatsResponsavel } = req.body;
    
    await dataService.updatePreCadastroDados(id, {
      nomeAluno, nascimentoAluno, cidadeAluno, whatsAluno, nomeResponsavel, parentesco, whatsResponsavel
    });
    
    await dataService.addHistorico(Number(id), 'Atualização', \`Dados básicos atualizados no sistema.\`, (req as any).user.username || 'Comando Geral');
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar dados.' });
  }
});

app.patch('/api/pre-cadastros/:id/contato', requireAuth, async (req, res) => {`);

fs.writeFileSync('server.ts', code);
