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

// Módulo 6: Avaliação e Evolução do Aluno
export interface CompetenciasAvaliacao {
  disciplina: number; // 1 a 5
  disciplinaComentario?: string;
  responsabilidade: number; // 1 a 5
  responsabilidadeComentario?: string;
  trabalhoEquipe: number; // 1 a 5
  trabalhoEquipeComentario?: string;
  lideranca: number; // 1 a 5
  liderancaComentario?: string;
  comunicacao: number; // 1 a 5
  comunicacaoComentario?: string;
  participacao: number; // 1 a 5
  participacaoComentario?: string;
  superacaoDesafios: number; // 1 a 5
  superacaoDesafiosComentario?: string;
}

export interface AvaliacaoAluno {
  id: number;
  alunoId: number;
  dataAvaliacao: string; // YYYY-MM-DD
  instrutorId?: string;
  instrutorNome: string;
  observacoesGerais?: string;
  competencias: CompetenciasAvaliacao;
  mediaGeral: number; // Média calculada (1 a 5)
  // Preparação futura para metas, missões e certificados
  metas?: string[];
  missoes?: string[];
  criadoEm?: string;
  atualizadoEm?: string;
}

// MÓDULO 7: CONTROLE DE FREQUÊNCIA
export type StatusFrequencia = 'Presente' | 'Ausente' | 'Justificada';

export interface FrequenciaAluno {
  id: number;
  alunoId: number;
  data: string; // YYYY-MM-DD
  atividade: string;
  instrutorId?: string;
  instrutorNome: string;
  status: StatusFrequencia;
  observacao?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface ResumoFrequencia {
  totalTreinamentos: number;
  presentes: number;
  faltas: number;
  justificadas: number;
  percentualPresenca: number;
  ultimosRegistros: {
    id: number;
    data: string;
    atividade: string;
    status: StatusFrequencia;
  }[];
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

// MÓDULO 8: COMUNICAÇÃO
export type TipoComunicado = 'Geral' | 'Alunos' | 'Responsáveis' | 'Individual';
export type StatusComunicado = 'Publicado' | 'Rascunho' | 'Arquivado';

export interface Comunicado {
  id: number;
  titulo: string;
  mensagem: string;
  data: string; // YYYY-MM-DD
  tipo: TipoComunicado;
  alunoId?: number | null;
  alunoNome?: string | null;
  criadoPor: string;
  criadorId?: string | null;
  status: StatusComunicado;
  observacaoInterna?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

// MÓDULO 9: FINANCEIRO
export type StatusFinanceiro = 'Pago' | 'Aguardando' | 'Atrasado';

export type FormaPagamento = 
  | 'PIX'
  | 'Dinheiro'
  | 'Cartão de Crédito'
  | 'Cartão de Débito'
  | 'Boleto'
  | 'Transferência'
  | 'Outro';

export type GatewayPagamento = 'manual' | 'infinitypay' | 'paggpay' | string;
export type StatusGateway = 'ativo' | 'pendente' | 'cancelado' | string;
export type TipoEventoFinanceiro = 'pagamento' | 'cancelamento' | 'alteração_plano' | 'cobrança' | string;

export interface AlunoFinanceiroConfig {
  alunoId: number;
  plano: string;
  valor: number;
  diaVencimento: number;
  status: StatusFinanceiro;
  // Campos preparados para gateway de pagamentos
  gatewayPagamento?: GatewayPagamento;
  idClienteGateway?: string | null;
  idAssinaturaGateway?: string | null;
  statusGateway?: StatusGateway;
  proximaCobranca?: string | null;
  ultimaSincronizacao?: string | null;
  atualizadoEm?: string;
}

export interface FinanceiroEvento {
  id: number;
  alunoId?: number | null;
  tipoEvento: TipoEventoFinanceiro;
  gateway: GatewayPagamento;
  valor?: number;
  status: string;
  descricao?: string;
  criadoEm?: string;
}

export interface Pagamento {
  id: number;
  alunoId: number;
  alunoNome: string;
  valor: number;
  dataPagamento: string; // YYYY-MM-DD
  mesReferencia: string; // Ex: "Setembro/2026"
  formaPagamento: FormaPagamento | string;
  status: StatusFinanceiro;
  observacao?: string;
  responsavelRegistro: string;
  responsavelId?: string | null;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface DashboardFinanceiroStats {
  totalAlunosAtivos: number;
  mensalidadesRecebidasTotal: number;
  mensalidadesRecebidasQtd: number;
  mensalidadesPendentesTotal: number;
  mensalidadesPendentesQtd: number;
  pagamentosAtrasadosTotal: number;
  pagamentosAtrasadosQtd: number;
}

// MÓDULO 10: CRONOGRAMA ANUAL DE TREINAMENTOS
export type StatusCronograma = 'Planejada' | 'Confirmada' | 'Realizada' | 'Cancelada';

export interface CronogramaAula {
  id: number;
  titulo: string;
  data: string; // YYYY-MM-DD
  horaInicio: string; // HH:MM
  horaFim?: string; // HH:MM
  categoria: string;
  local?: string;
  instrutorResponsavelId?: string | number | null;
  instrutorResponsavelNome?: string | null;
  descricao?: string;
  materiais?: string;
  observacoes?: string;
  status: StatusCronograma;
  criadoPor: string;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface FiltrosCronograma {
  ano?: number;
  mes?: number;
  categoria?: string;
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  busca?: string;
}
