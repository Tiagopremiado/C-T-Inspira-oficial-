import React, { useState, useEffect } from 'react';
import { X, Send, Download, FileText, User, Users, Shield, HeartPulse, Edit2, Save, Printer, Clock, Plus } from 'lucide-react';
import { CadastroCompleto, PreCadastro, HistoricoAluno } from '../types.js';

interface FichaAlunoProps {
  preCadastro: PreCadastro;
  cadastroCompleto: CadastroCompleto | null;
  onClose: () => void;
  onStatusChange: (status: string) => void;
  onSendWhatsApp: (phone: string, isResponsavel: boolean) => void;
}

type TabType = 'pessoais' | 'responsaveis' | 'saude' | 'documentos' | 'historico';

export const FichaAluno: React.FC<FichaAlunoProps> = ({
  preCadastro,
  cadastroCompleto,
  onClose,
  onStatusChange,
  onSendWhatsApp
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('pessoais');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [historico, setHistorico] = useState<HistoricoAluno[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [docStatus, setDocStatus] = useState(preCadastro.documentacaoStatus || 'Pendente');
  
  // Controle de atendimento state
  const [responsavelContato, setResponsavelContato] = useState(preCadastro.responsavelContato || '');
  const [proximoPasso, setProximoPasso] = useState(preCadastro.proximoPasso || '');
  const [observacaoContato, setObservacaoContato] = useState(preCadastro.observacaoContato || '');

  const hasFull = !!cadastroCompleto;

  useEffect(() => {
    if (activeTab === 'historico') {
      fetchHistorico();
    }
  }, [activeTab]);

  const fetchHistorico = async () => {
    setLoadingHistorico(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/historico/${preCadastro.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) setHistorico(await res.json());
    } catch (e) {} finally { setLoadingHistorico(false); }
  };

  const handleSaveContato = async () => {
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/pre-cadastros/${preCadastro.id}/contato`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ responsavelContato, proximoPasso, observacaoContato })
      });
      if (res.ok) {
        alert('Contato registrado com sucesso!');
        if (activeTab === 'historico') fetchHistorico();
      }
    } catch (e) { alert('Erro ao salvar contato'); }
  };

  const handleSaveDocStatus = async (status: string) => {
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/pre-cadastros/${preCadastro.id}/documentacao`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setDocStatus(status);
        if (activeTab === 'historico') fetchHistorico();
      }
    } catch (e) {}
  };

  const handlePrint = () => {
    window.print();
  };

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
        const res = await fetch(`/api/pre-cadastros/${preCadastro.id}/dados`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify(editData)
        });
        if (res.ok) {
          // Re-fetch or update local state
          Object.assign(preCadastro, editData);
          alert('Dados atualizados com sucesso!');
        }
      } catch (e) {
        alert('Erro ao salvar dados.');
      }
    } else {
      // populate editData before opening
      setEditData({ ...preCadastro });
    }
    setIsEditing(!isEditing);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-[850px] max-h-[90vh] flex flex-col rounded-3xl bg-[#0b1721] border border-[rgba(255,255,255,0.10)] shadow-2xl relative my-auto overflow-hidden">
        
        {/* Header Actions */}
        <div className="p-4 sm:p-6 border-b border-[rgba(255,255,255,0.08)] bg-[rgba(6,13,20,0.5)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-wider">Ficha do Aluno</span>
            <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">{hasFull ? cadastroCompleto.nome : preCadastro.nomeAluno}</h2>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={preCadastro.status}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0d1a23] text-white text-xs font-semibold focus:border-[#f5c33b] focus:outline-none cursor-pointer"
            >
              <optgroup label="Fluxo de Contato">
                <option value="Novo cadastro">Novo cadastro</option>
                <option value="Primeiro contato realizado">Primeiro contato realizado</option>
                <option value="Aguardando retorno">Aguardando retorno</option>
                <option value="Documentação pendente">Documentação pendente</option>
                <option value="Matrícula confirmada">Matrícula confirmada</option>
                <option value="Finalizado">Finalizado</option>
              </optgroup>
              <optgroup label="Status do Aluno">
                <option value="Pré-cadastro">Pré-cadastro</option>
                <option value="Em análise">Em análise</option>
                <option value="Aprovado">Aprovado</option>
                <option value="Ativo">Ativo</option>
                <option value="Inativo">Inativo</option>
              </optgroup>
            </select>
            
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.045)] text-xs font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition flex items-center gap-1.5 cursor-pointer"
            >
              {isEditing ? <Save className="w-4 h-4 text-emerald-400" /> : <Edit2 className="w-4 h-4 text-[#8fa2ad]" />}
              <span>{isEditing ? 'Salvar Edição' : 'Editar'}</span>
            </button>
            
            <button
              onClick={handlePrint}
              className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.045)] text-xs font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition flex items-center gap-1.5 cursor-pointer print:hidden"
            >
              <Printer className="w-4 h-4 text-[#8fa2ad]" />
              <span>Gerar PDF</span>
            </button>
            
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer transition print:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons for WhatsApp */}
        <div className="px-4 sm:px-6 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.01)] flex flex-wrap gap-2 print:hidden">
          {preCadastro.whatsAluno && (
            <button onClick={() => onSendWhatsApp(preCadastro.whatsAluno!, false)} className="px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/20 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 transition flex items-center gap-1.5 cursor-pointer">
              <Send className="w-3.5 h-3.5" /> Falar com Aluno
            </button>
          )}
          {preCadastro.whatsResponsavel && (
            <button onClick={() => onSendWhatsApp(preCadastro.whatsResponsavel!, true)} className="px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-950/20 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 transition flex items-center gap-1.5 cursor-pointer">
              <Send className="w-3.5 h-3.5" /> Falar com Responsável
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex items-center overflow-x-auto border-b border-[rgba(255,255,255,0.08)] print:hidden">
          <button onClick={() => setActiveTab('pessoais')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition border-b-2 flex items-center gap-2 ${activeTab === 'pessoais' ? 'border-[#f5c33b] text-[#f5c33b] bg-[rgba(245,195,59,0.05)]' : 'border-transparent text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.02)]'}`}>
            <User className="w-4 h-4" /> Dados pessoais
          </button>
          <button onClick={() => setActiveTab('responsaveis')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition border-b-2 flex items-center gap-2 ${activeTab === 'responsaveis' ? 'border-[#f5c33b] text-[#f5c33b] bg-[rgba(245,195,59,0.05)]' : 'border-transparent text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.02)]'}`}>
            <Users className="w-4 h-4" /> Responsáveis
          </button>
          <button onClick={() => setActiveTab('saude')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition border-b-2 flex items-center gap-2 ${activeTab === 'saude' ? 'border-[#f5c33b] text-[#f5c33b] bg-[rgba(245,195,59,0.05)]' : 'border-transparent text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.02)]'}`}>
            <HeartPulse className="w-4 h-4" /> Saúde e segurança
          </button>
          <button onClick={() => setActiveTab('documentos')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition border-b-2 flex items-center gap-2 ${activeTab === 'documentos' ? 'border-[#f5c33b] text-[#f5c33b] bg-[rgba(245,195,59,0.05)]' : 'border-transparent text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.02)]'}`}>
            <FileText className="w-4 h-4" /> Documentos
          </button>
          <button onClick={() => setActiveTab('historico')} className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition border-b-2 flex items-center gap-2 ${activeTab === 'historico' ? 'border-[#f5c33b] text-[#f5c33b] bg-[rgba(245,195,59,0.05)]' : 'border-transparent text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.02)]'}`}>
            <Shield className="w-4 h-4" /> Histórico Inspira
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 print:overflow-visible print:block">
          
          {/* Aba: Dados Pessoais */}
          {(activeTab === 'pessoais' || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
            <div className="animate-in fade-in duration-300 print:mb-8">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2 hidden print:flex"><User className="w-5 h-5"/> Dados Pessoais</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nome Completo" value={isEditing ? editData.nomeAluno : (hasFull ? cadastroCompleto!.nome : preCadastro.nomeAluno)} isEditing={isEditing} onChange={(v) => setEditData({...editData, nomeAluno: v})} />
                <Field label="Data de Nascimento" value={isEditing ? editData.nascimentoAluno : (hasFull ? cadastroCompleto!.nascimento : preCadastro.nascimentoAluno)} isEditing={isEditing} onChange={(v) => setEditData({...editData, nascimentoAluno: v})} />
                <Field label="WhatsApp" value={isEditing ? editData.whatsAluno : (hasFull ? cadastroCompleto!.whats : preCadastro.whatsAluno)} isEditing={isEditing} onChange={(v) => setEditData({...editData, whatsAluno: v})} />
                <Field label="E-mail" value="Não coletado no formulário atual" />
                <Field label="Cidade" value={isEditing ? editData.cidadeAluno : (hasFull ? cadastroCompleto!.cidade : preCadastro.cidadeAluno)} isEditing={isEditing} onChange={(v) => setEditData({...editData, cidadeAluno: v})} />
                <Field label="Endereço" value={hasFull ? cadastroCompleto!.endereco : ''} />
                <Field label="Bairro" value={hasFull ? cadastroCompleto!.bairro : ''} />
                <Field label="Escola" value={hasFull ? cadastroCompleto!.escola : ''} />
                <Field label="Série/Curso" value={hasFull ? cadastroCompleto!.curso : ''} />
              </div>
            </div>
          )}

          {/* Aba: Responsáveis */}
          {(activeTab === 'responsaveis' || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
            <div className="animate-in fade-in duration-300 print:mb-8">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2 hidden print:flex"><Users className="w-5 h-5"/> Responsáveis</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Nome Responsável" value={isEditing ? editData.nomeResponsavel : (hasFull ? cadastroCompleto!.responsavel : preCadastro.nomeResponsavel)} isEditing={isEditing} onChange={(v) => setEditData({...editData, nomeResponsavel: v})} />
                <Field label="Parentesco" value={isEditing ? editData.parentesco : (hasFull ? cadastroCompleto!.parentesco : preCadastro.parentesco)} isEditing={isEditing} onChange={(v) => setEditData({...editData, parentesco: v})} />
                <Field label="WhatsApp Responsável" value={isEditing ? editData.whatsResponsavel : (hasFull ? cadastroCompleto!.whatsResponsavel : preCadastro.whatsResponsavel)} isEditing={isEditing} onChange={(v) => setEditData({...editData, whatsResponsavel: v})} />
                <Field label="E-mail Responsável" value="Não coletado" />
                <Field label="Contato Preferido" value={preCadastro.contatoPreferido} />
              </div>
            </div>
          )}

          {/* Aba: Saúde e Segurança */}
          {(activeTab === 'saude' || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
            <div className="animate-in fade-in duration-300 print:mb-8">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2 hidden print:flex"><HeartPulse className="w-5 h-5"/> Saúde e Segurança</h3>
              
              {!hasFull ? (
                <div className="p-4 rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] text-center text-[#8fa2ad] text-sm">
                  O aluno ainda não enviou a ficha completa de saúde.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Possui Laudo?" value={cadastroCompleto!.possuiLaudo} />
                  <Field label="CID" value={cadastroCompleto!.cid} />
                  <Field label="Tem alergia?" value={cadastroCompleto!.temAlergia} />
                  <Field label="Alergias" value={cadastroCompleto!.alergias} colSpan />
                  <Field label="Usa Medicamento?" value={cadastroCompleto!.usaMedicamento} />
                  <Field label="Medicamentos em Uso" value={cadastroCompleto!.medicamentos} colSpan />
                  <Field label="Restrições" value={cadastroCompleto!.restricoes} colSpan />
                  <Field label="Informações Importantes / Condições" value={cadastroCompleto!.condicoesSaude} colSpan />
                  
                  <div className="col-span-full border-t border-[rgba(255,255,255,0.08)] my-2"></div>
                  
                  <Field label="Contato de Emergência (Nome)" value={cadastroCompleto!.emergenciaNome} />
                  <Field label="Contato de Emergência (Fone)" value={cadastroCompleto!.emergenciaFone} />
                  <Field label="Orientação em Emergência" value={cadastroCompleto!.orientacaoEmergencia} colSpan />
                  <Field label="Outras Info Segurança" value={cadastroCompleto!.seguranca} colSpan />
                </div>
              )}
            </div>
          )}

          {/* Aba: Documentos */}
          {(activeTab === 'documentos' || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
            <div className="animate-in fade-in duration-300 print:mb-8">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2 hidden print:flex"><FileText className="w-5 h-5"/> Documentos</h3>
              
              <div className="mb-6 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <strong className="text-white block mb-1">Status da Documentação</strong>
                  <span className="text-xs text-[#8fa2ad]">Gerencie o andamento da entrega de documentos</span>
                </div>
                <select 
                  value={docStatus}
                  onChange={(e) => handleSaveDocStatus(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.12)] bg-[#0d1a23] text-white text-xs font-semibold focus:border-[#f5c33b] focus:outline-none cursor-pointer"
                >
                  <option value="Pendente">Pendente</option>
                  <option value="Em análise">Em análise</option>
                  <option value="Completo">Completo</option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                  <div>
                    <strong className="text-white block mb-1">Ficha de Inscrição Completa</strong>
                    <span className="text-xs text-[#8fa2ad]">{hasFull ? `Enviada em ${new Date(cadastroCompleto!.enviadoEm).toLocaleString()}` : 'Pendente de envio'}</span>
                  </div>
                  {hasFull ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">Recebido</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 text-xs font-bold border border-red-500/30">Pendente</span>
                  )}
                </div>
                
                {hasFull && cadastroCompleto?.possuiLaudo === 'Sim' && (
                  <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                    <div>
                      <strong className="text-white block mb-1">Laudo Médico / Documento CID</strong>
                      <span className="text-xs text-[#8fa2ad]">{cadastroCompleto.laudoArquivoNome || 'Arquivo enviado'}</span>
                    </div>
                    {cadastroCompleto.laudoDownloadUrl ? (
                      <a href={cadastroCompleto.laudoDownloadUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] transition text-white text-xs font-bold border border-[rgba(255,255,255,0.1)] flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" /> Baixar
                      </a>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#8fa2ad] text-xs font-bold border border-[rgba(255,255,255,0.1)]">Sem anexo</span>
                    )}
                  </div>
                )}
                
                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
                  <div>
                    <strong className="text-white block mb-1">Autorização de Uso de Imagem</strong>
                    <span className="text-xs text-[#8fa2ad]">{hasFull && cadastroCompleto!.autorizaImagem ? 'Autorizado na ficha de inscrição' : 'Pendente'}</span>
                  </div>
                  {hasFull && cadastroCompleto!.autorizaImagem ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">Autorizado</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#8fa2ad] text-xs font-bold border border-[rgba(255,255,255,0.1)]">Pendente</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Aba: Histórico Inspira */}
          {(activeTab === 'historico' || typeof window !== 'undefined' && window.matchMedia('print').matches) && (
            <div className="animate-in fade-in duration-300 print:mb-8">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2 hidden print:flex"><Shield className="w-5 h-5"/> Histórico Inspira</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Timeline */}
                <div className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-[#f5c33b]"/> Linha do Tempo</h4>
                  
                  {loadingHistorico ? (
                     <div className="text-center text-[#8fa2ad] text-sm py-4">Carregando...</div>
                  ) : historico.length === 0 ? (
                     <div className="text-center text-[#8fa2ad] text-sm py-4">Nenhum evento registrado.</div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-[rgba(255,255,255,0.1)] before:to-transparent">
                      {historico.map((h, i) => (
                        <div key={i} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-[rgba(11,23,33,1)] bg-[#f5c33b] text-[#0b1721] shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                            <div className="w-2 h-2 rounded-full bg-[#0b1721]"></div>
                          </div>
                          <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-3 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] shadow">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[#f5c33b] text-[10px] uppercase font-bold">{h.tipoEvento}</span>
                              <span className="text-[#8fa2ad] text-[10px]">{new Date(h.dataEvento).toLocaleString('pt-BR')}</span>
                            </div>
                            <p className="text-sm text-white mb-1">{h.descricao}</p>
                            <span className="text-[10px] text-[#8fa2ad]">Usuário: {h.usuario}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Controle de Atendimento */}
                <div className="bg-[rgba(255,255,255,0.01)] border border-[rgba(255,255,255,0.05)] rounded-2xl p-5">
                  <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-400"/> Registrar Atendimento</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[#8fa2ad] text-xs font-bold mb-1">Responsável pelo Contato</label>
                      <input 
                        type="text" 
                        value={responsavelContato}
                        onChange={(e) => setResponsavelContato(e.target.value)}
                        className="w-full px-3 py-2 bg-[#060c12] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white focus:border-[#f5c33b] focus:outline-none transition"
                        placeholder="Nome do membro do Comando"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8fa2ad] text-xs font-bold mb-1">Próximo Passo / Ação</label>
                      <input 
                        type="text" 
                        value={proximoPasso}
                        onChange={(e) => setProximoPasso(e.target.value)}
                        className="w-full px-3 py-2 bg-[#060c12] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white focus:border-[#f5c33b] focus:outline-none transition"
                        placeholder="Ex: Ligar na sexta-feira"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8fa2ad] text-xs font-bold mb-1">Observações do Contato</label>
                      <textarea 
                        value={observacaoContato}
                        onChange={(e) => setObservacaoContato(e.target.value)}
                        className="w-full px-3 py-2 bg-[#060c12] border border-[rgba(255,255,255,0.08)] rounded-xl text-sm text-white focus:border-[#f5c33b] focus:outline-none transition min-h-[80px]"
                        placeholder="Resumo da conversa..."
                      />
                    </div>
                    <button 
                      onClick={handleSaveContato}
                      className="w-full py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold text-sm border border-emerald-500/30 hover:bg-emerald-500/30 transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Salvar Atendimento
                    </button>
                  </div>
                  
                  <div className="mt-6 flex flex-col items-center justify-center p-4 text-center rounded-xl border border-dashed border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]">
                    <Shield className="w-6 h-6 text-[#f5c33b] opacity-50 mb-2" />
                    <h5 className="text-white text-sm font-bold mb-1">Área do Aluno (Em Breve)</h5>
                    <p className="text-xs text-[#8fa2ad]">Esta aba integrará as avaliações, missões e desempenho na Fase 3.</p>
                  </div>
                </div>

              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, value, colSpan = false, isEditing = false, onChange = undefined }: { label: string; value: any; colSpan?: boolean; isEditing?: boolean; onChange?: (val: string) => void }) => {
  if (!value && !isEditing) value = 'Não informado';
  return (
    <div className={`p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] ${colSpan ? 'sm:col-span-2' : ''}`}>
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
};
