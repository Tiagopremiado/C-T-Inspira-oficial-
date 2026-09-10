export interface PreCadastro {
  id: number;
  criadoEm: string;
  status: 'Aguardando contato' | 'Em atendimento' | 'Confirmado' | string;
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
