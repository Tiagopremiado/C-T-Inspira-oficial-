const fs = require('fs');
let code = fs.readFileSync('src/components/FichaAluno.tsx', 'utf8');

// Update Field component definition at the bottom
code = code.replace(/const Field = \(\{ label, value, colSpan = false \}: \{ label: string; value: any; colSpan\?: boolean \}\) => \{.*?<\/div>\s*\);\s*\};/s, `const Field = ({ label, value, colSpan = false, isEditing = false, onChange = undefined }: { label: string; value: any; colSpan?: boolean; isEditing?: boolean; onChange?: (val: string) => void }) => {
  if (!value && !isEditing) value = 'Não informado';
  return (
    <div className={\`p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] \${colSpan ? 'sm:col-span-2' : ''}\`}>
      <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">{label}</span>
      {isEditing && onChange ? (
        <input 
          type="text" 
          value={value || ''} 
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0b1721] border border-[#f5c33b]/50 rounded-lg px-2 py-1 text-white text-sm focus:outline-none focus:border-[#f5c33b]"
        />
      ) : (
        <strong className="text-white text-sm">{String(value)}</strong>
      )}
    </div>
  );
};`);

// Remove old getFieldValue as it's not optimal
code = code.replace(/const getFieldValue = \(\(keyPre:.*?\}\);/s, `
  // Setup editData state correctly
  useEffect(() => {
    if (isEditing && Object.keys(editData).length === 0) {
      setEditData({ ...preCadastro });
    }
  }, [isEditing, preCadastro]);

  const handleToggleEdit = async () => {
    if (isEditing) {
      // Save changes
      try {
        const token = localStorage.getItem('inspira_auth_token');
        const res = await fetch(\`/api/pre-cadastros/\${preCadastro.id}/dados\`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: \`Bearer \${token}\` } : {}) },
          body: JSON.stringify(editData)
        });
        if (res.ok) {
          alert('Dados atualizados com sucesso!');
          // update the parent list ideally, but we can just let it be updated on reload or via status
        }
      } catch (e) {
        alert('Erro ao salvar dados.');
      }
    }
    setIsEditing(!isEditing);
  };
`);

// Replace toggle edit button
code = code.replace(/onClick=\{() => setIsEditing\(!isEditing\)\}/, `onClick={handleToggleEdit}`);

// Fix up the Field usages in Dados Pessoais
code = code.replace(/<Field label="Nome Completo" value=\{hasFull \? cadastroCompleto!\.nome : preCadastro\.nomeAluno\} \/>/g, 
  `<Field label="Nome Completo" value={isEditing ? editData.nomeAluno : (hasFull ? cadastroCompleto!.nome : preCadastro.nomeAluno)} isEditing={isEditing} onChange={(v) => setEditData({...editData, nomeAluno: v})} />`);

code = code.replace(/<Field label="Data de Nascimento" value=\{hasFull \? cadastroCompleto!\.nascimento : preCadastro\.nascimentoAluno\} \/>/g, 
  `<Field label="Data de Nascimento" value={isEditing ? editData.nascimentoAluno : (hasFull ? cadastroCompleto!.nascimento : preCadastro.nascimentoAluno)} isEditing={isEditing} onChange={(v) => setEditData({...editData, nascimentoAluno: v})} />`);

code = code.replace(/<Field label="WhatsApp" value=\{hasFull \? cadastroCompleto!\.whats : preCadastro\.whatsAluno\} \/>/g, 
  `<Field label="WhatsApp" value={isEditing ? editData.whatsAluno : (hasFull ? cadastroCompleto!.whats : preCadastro.whatsAluno)} isEditing={isEditing} onChange={(v) => setEditData({...editData, whatsAluno: v})} />`);

code = code.replace(/<Field label="Cidade" value=\{hasFull \? cadastroCompleto!\.cidade : preCadastro\.cidadeAluno\} \/>/g, 
  `<Field label="Cidade" value={isEditing ? editData.cidadeAluno : (hasFull ? cadastroCompleto!.cidade : preCadastro.cidadeAluno)} isEditing={isEditing} onChange={(v) => setEditData({...editData, cidadeAluno: v})} />`);

// Responsaveis
code = code.replace(/<Field label="Nome Responsável" value=\{hasFull \? cadastroCompleto!\.responsavel : preCadastro\.nomeResponsavel\} \/>/g, 
  `<Field label="Nome Responsável" value={isEditing ? editData.nomeResponsavel : (hasFull ? cadastroCompleto!.responsavel : preCadastro.nomeResponsavel)} isEditing={isEditing} onChange={(v) => setEditData({...editData, nomeResponsavel: v})} />`);

code = code.replace(/<Field label="Parentesco" value=\{hasFull \? cadastroCompleto!\.parentesco : preCadastro\.parentesco\} \/>/g, 
  `<Field label="Parentesco" value={isEditing ? editData.parentesco : (hasFull ? cadastroCompleto!.parentesco : preCadastro.parentesco)} isEditing={isEditing} onChange={(v) => setEditData({...editData, parentesco: v})} />`);

code = code.replace(/<Field label="WhatsApp Responsável" value=\{hasFull \? cadastroCompleto!\.whatsResponsavel : preCadastro\.whatsResponsavel\} \/>/g, 
  `<Field label="WhatsApp Responsável" value={isEditing ? editData.whatsResponsavel : (hasFull ? cadastroCompleto!.whatsResponsavel : preCadastro.whatsResponsavel)} isEditing={isEditing} onChange={(v) => setEditData({...editData, whatsResponsavel: v})} />`);


fs.writeFileSync('src/components/FichaAluno.tsx', code);
