const fs = require('fs');
let code = fs.readFileSync('src/components/FichaAluno.tsx', 'utf8');

code = code.replace(/const getFieldValue = \(\(keyPre: keyof PreCadastro, keyFull\?: keyof CadastroCompleto\) => \{.*?\n  \};\n/s, `  // Setup editData state correctly
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
        }
      } catch (e) {
        alert('Erro ao salvar dados.');
      }
    }
    setIsEditing(!isEditing);
  };
`);

fs.writeFileSync('src/components/FichaAluno.tsx', code);
