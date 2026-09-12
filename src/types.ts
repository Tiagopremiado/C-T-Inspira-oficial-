export interface PreCadastro {
  id: number;
  criadoEm: string;
  status: 'Novo cadastro' | 'Primeiro contato realizado' | 'Aguardando retorno' | 'Documentação pendente' | 'Matrícula confirmada' | 'Finalizado' | 'Pré-cadastro' | 'Em análise' | 'Aprovado' | 'Ativo' | 'Inativo' | string;
  tipoCadastro: 'aluno' | 'responsavel' | string;
  nomeAluno: string;
  nascimentoAluno: string;
  cidadeAluno: string;
  whatsAluno?: string;
  nomeResponsavel?: string;
  parentesco?: string;
  whatsResponsavel?: string;
  contatoPreferido?: 'aluno' | 'responsavel' | 'ambos' | string;
  observacao?: string;
  hasFullRegistration?: boolean;
  fichaId?: number;
  
  // Phase 2 additions
  documentacaoStatus?: 'Pendente' | 'Em análise' | 'Completo' | string;
  ultimoContatoEm?: string;
  responsavelContato?: string;
  proximoPasso?: string;
  observacaoContato?: string;
}

export interface HistoricoAluno {
  id: number;
  alunoId: number;
  tipoEvento: 'Sistema' | 'Contato' | 'Documentacao' | 'Status' | 'Outro';
  descricao: string;
  dataEvento: string;
  usuario: string; // "Sistema", "Admin", etc.
}

export interface CadastroCompleto {
  id?: number;
  ref?: string;
  enviadoEm: string;
  nome: string;
  nascimento: string;
  whats?: string;
  cidade: string;
  bairro?: string;
  endereco?: string;
  escola?: string;
  curso?: string;
  objetivos?: string;
  responsavel?: string;
  parentesco?: string;
  whatsResponsavel?: string;
  possuiLaudo?: string;
  cid?: string;
  laudoArquivoNome?: string;
  laudoDownloadUrl?: string | null;
  temAlergia?: string;
  alergias?: string;
  usaMedicamento?: string;
  medicamentos?: string;
  restricoes?: string;
  condicoesSaude?: string;
  emergenciaNome?: string;
  emergenciaFone?: string;
  orientacaoEmergencia?: string;
  seguranca?: string;
  autorizaImagem?: boolean;
}

// Fase 2: Preparação para Gerenciamento de Equipe (Níveis de Acesso)
export interface UsuarioComando {
  id: number;
  nome: string;
  email: string;
  papel: 'Administrador Geral' | 'Instrutor' | 'Secretaria';
  ativo: boolean;
}
