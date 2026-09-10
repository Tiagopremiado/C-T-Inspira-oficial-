const fs = require('fs');
let code = fs.readFileSync('src/components/ComandoGeral.tsx', 'utf-8');

// 1. Add Copy to lucide-react import
code = code.replace(/ExternalLink \} from 'lucide-react';/, "ExternalLink, Copy } from 'lucide-react';");

// 2. Add handleCopyLink function next to handleSendWhatsApp
code = code.replace(
  /  const handleSendWhatsApp = \(item: PreCadastro\) => \{/,
  `  const handleCopyLink = (item: PreCadastro) => {
    const base = appBaseUrl || window.location.origin;
    const link = new URL('/ficha-completa', base);
    link.searchParams.set('ref', String(item.id));
    link.searchParams.set('aluno', item.nomeAluno || '');
    link.searchParams.set('cidade', item.cidadeAluno || '');
    if (item.nomeResponsavel) link.searchParams.set('responsavel', item.nomeResponsavel);
    
    navigator.clipboard.writeText(link.toString())
      .then(() => alert('Link da ficha copiado com sucesso!'))
      .catch((err) => {
        console.error('Erro ao copiar link', err);
        alert('Falha ao copiar link.');
      });
  };

  const handleSendWhatsApp = (item: PreCadastro) => {`
);

// 3. Add the Copy button next to "Enviar ficha completa"
code = code.replace(
  /                          <button\n                            onClick=\{\(\) => handleSendWhatsApp\(r\)\}/,
  `                          <button
                            onClick={() => handleCopyLink(r)}
                            className="min-h-[32px] px-2.5 rounded-lg border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.05)] text-xs font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition flex items-center gap-1 cursor-pointer"
                            title="Copiar link da ficha"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar link</span>
                          </button>

                          <button
                            onClick={() => handleSendWhatsApp(r)}`
);

fs.writeFileSync('src/components/ComandoGeral.tsx', code);
