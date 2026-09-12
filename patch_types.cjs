const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code += `
// Fase 2: Preparação para Gerenciamento de Equipe (Níveis de Acesso)
export interface UsuarioComando {
  id: number;
  nome: string;
  email: string;
  papel: 'Administrador Geral' | 'Instrutor' | 'Secretaria';
  ativo: boolean;
}
`;

fs.writeFileSync('src/types.ts', code);
