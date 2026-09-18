import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, CheckCircle2, Clock, AlertTriangle, 
  Calendar, CreditCard, User, Edit2, Trash2, Save, FileText, Check, AlertCircle, X
} from 'lucide-react';
import { AlunoFinanceiroConfig, Pagamento, StatusFinanceiro, FormaPagamento } from '../types.js';

interface FinanceiroAlunoProps {
  alunoId: number;
  nomeAluno: string;
  currentUserRole?: string;
  currentUserName?: string;
}

export const FinanceiroAluno: React.FC<FinanceiroAlunoProps> = ({
  alunoId,
  nomeAluno,
  currentUserRole = 'Administrador',
  currentUserName = 'Administrador'
}) => {
  const [config, setConfig] = useState<AlunoFinanceiroConfig>({
    alunoId,
    plano: 'Mensalidade Padrão',
    valor: 150,
    diaVencimento: 10,
    status: 'Aguardando'
  });
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configFeedback, setConfigFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Form edit states
  const [planoInput, setPlanoInput] = useState('Mensalidade Padrão');
  const [valorInput, setValorInput] = useState('150.00');
  const [diaVencimentoInput, setDiaVencimentoInput] = useState('10');
  const [statusInput, setStatusInput] = useState<StatusFinanceiro>('Aguardando');

  // Modal Registrar / Editar Pagamento
  const [showModal, setShowModal] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<Pagamento | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Pagamento | null>(null);

  // Payment Form Fields
  const [payValor, setPayValor] = useState('150.00');
  const [payData, setPayData] = useState(new Date().toISOString().split('T')[0]);
  const [payReferencia, setPayReferencia] = useState('');
  const [payForma, setPayForma] = useState<FormaPagamento>('PIX');
  const [payStatus, setPayStatus] = useState<StatusFinanceiro>('Pago');
  const [payObservacao, setPayObservacao] = useState('');

  const isInstrutor = currentUserRole === 'Instrutor';
  const isAdmin = currentUserRole === 'Administrador';
  const canRegister = isAdmin || currentUserRole === 'Secretaria';

  useEffect(() => {
    loadData();
  }, [alunoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/financeiro/aluno/${alunoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
          setPlanoInput(data.config.plano || 'Mensalidade Padrão');
          setValorInput(Number(data.config.valor || 150).toFixed(2));
          setDiaVencimentoInput(String(data.config.diaVencimento || 10));
          setStatusInput(data.config.status || 'Aguardando');
        }
        setPagamentos(data.pagamentos || []);
      }
    } catch (err) {
      console.error('Erro ao carregar financeiro do aluno:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInstrutor) return;

    setSavingConfig(true);
    setConfigFeedback(null);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/financeiro/aluno/${alunoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          plano: planoInput,
          valor: parseFloat(valorInput) || 0,
          diaVencimento: parseInt(diaVencimentoInput) || 10,
          status: statusInput
        })
      });

      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        setConfigFeedback({ text: 'Configuração financeira salva com sucesso!', type: 'success' });
        setTimeout(() => setConfigFeedback(null), 4000);
      } else {
        const errData = await res.json();
        setConfigFeedback({ text: errData.error || 'Erro ao salvar configuração.', type: 'error' });
      }
    } catch (err: any) {
      setConfigFeedback({ text: 'Falha de conexão com o servidor.', type: 'error' });
    } finally {
      setSavingConfig(false);
    }
  };

  const getDefaultReference = () => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const now = new Date();
    return `Mensalidade ${months[now.getMonth()]}/${now.getFullYear()}`;
  };

  const handleOpenNewPayment = () => {
    setEditingPagamento(null);
    setPayValor(Number(config.valor || 150).toFixed(2));
    setPayData(new Date().toISOString().split('T')[0]);
    setPayReferencia(getDefaultReference());
    setPayForma('PIX');
    setPayStatus('Pago');
    setPayObservacao('');
    setModalFeedback(null);
    setShowModal(true);
  };

  const handleOpenEditPayment = (p: Pagamento) => {
    setEditingPagamento(p);
    setPayValor(Number(p.valor).toFixed(2));
    setPayData(p.dataPagamento);
    setPayReferencia(p.mesReferencia);
    setPayForma(p.formaPagamento as FormaPagamento);
    setPayStatus(p.status);
    setPayObservacao(p.observacao || '');
    setModalFeedback(null);
    setShowModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setModalFeedback(null);

    try {
      const token = localStorage.getItem('inspira_auth_token');
      const payload = {
        alunoId,
        alunoNome: nomeAluno,
        valor: parseFloat(payValor) || 0,
        dataPagamento: payData,
        mesReferencia: payReferencia.trim(),
        formaPagamento: payForma,
        status: payStatus,
        observacao: payObservacao.trim()
      };

      let url = '/api/financeiro/pagamentos';
      let method = 'POST';

      if (editingPagamento) {
        url = `/api/financeiro/pagamentos/${editingPagamento.id}`;
        method = 'PUT';
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        await loadData();
      } else {
        const data = await res.json();
        setModalFeedback({ text: data.error || 'Erro ao salvar pagamento.', type: 'error' });
      }
    } catch (err: any) {
      setModalFeedback({ text: 'Falha de comunicação com o servidor.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePayment = async (id: number) => {
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/financeiro/pagamentos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setDeleteConfirm(null);
        await loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir pagamento.');
      }
    } catch (err) {
      alert('Falha ao excluir pagamento.');
    }
  };

  const handleQuickStatusChange = async (pagamento: Pagamento, newStatus: StatusFinanceiro) => {
    if (!isAdmin) return;
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/financeiro/pagamentos/${pagamento.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Erro ao atualizar status rápido:', err);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  if (isInstrutor) {
    return (
      <div className="p-8 text-center bg-[#091522] border border-[#1a2f42] rounded-2xl text-[#8fa2ad]">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-1">Acesso Restrito</h3>
        <p className="text-sm">Instrutores não possuem permissão para visualizar dados financeiros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* CARD 1: CADASTRO FINANCEIRO DO ALUNO */}
      <div className="bg-[#091522] border border-[#1a2f42] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5 border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#f5c33b]" />
              <h2 className="text-lg font-black text-white tracking-wide">Cadastro Financeiro do Aluno</h2>
            </div>
            <p className="text-xs text-[#8fa2ad] mt-1">
              Defina o plano contratado, valor mensal, dia de vencimento e a situação financeira atual.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#8fa2ad]">Situação atual:</span>
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
              config.status === 'Pago'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                : config.status === 'Aguardando'
                ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                : 'bg-red-500/15 border border-red-500/40 text-red-300'
            }`}>
              {config.status === 'Pago' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
              {config.status === 'Aguardando' && <span className="w-2 h-2 rounded-full bg-amber-400" />}
              {config.status === 'Atrasado' && <span className="w-2 h-2 rounded-full bg-red-400" />}
              {config.status}
            </span>
          </div>
        </div>

        {configFeedback && (
          <div className={`p-3.5 mb-5 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            configFeedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}>
            {configFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{configFeedback.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveConfig} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Campo: Plano / Mensalidade */}
          <div>
            <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
              Plano / Mensalidade
            </label>
            <input
              type="text"
              value={planoInput}
              onChange={(e) => setPlanoInput(e.target.value)}
              placeholder="Ex: Mensalidade Padrão"
              className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition"
              required
            />
          </div>

          {/* Campo: Valor */}
          <div>
            <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
              Valor (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-sm font-bold text-[#8fa2ad]">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={valorInput}
                onChange={(e) => setValorInput(e.target.value)}
                placeholder="150,00"
                className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition"
                required
              />
            </div>
          </div>

          {/* Campo: Dia do Vencimento */}
          <div>
            <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
              Dia do Vencimento
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="31"
                value={diaVencimentoInput}
                onChange={(e) => setDiaVencimentoInput(e.target.value)}
                placeholder="Ex: 10"
                className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition"
                required
              />
              <span className="absolute right-3.5 top-2.5 text-xs text-[#8fa2ad] font-semibold">de cada mês</span>
            </div>
          </div>

          {/* Campo: Status */}
          <div>
            <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
              Status Geral
            </label>
            <select
              value={statusInput}
              onChange={(e) => setStatusInput(e.target.value as StatusFinanceiro)}
              className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition cursor-pointer"
            >
              <option value="Pago">🟢 Pago</option>
              <option value="Aguardando">🟡 Aguardando</option>
              <option value="Atrasado">🔴 Atrasado</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end mt-2">
            <button
              type="submit"
              disabled={savingConfig}
              className="px-5 py-2.5 bg-[#f5c33b] text-[#06121e] font-black text-xs uppercase tracking-wider rounded-xl hover:bg-[#e0b030] transition flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingConfig ? 'Salvando...' : 'Salvar Configuração'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* CARD 2: HISTÓRICO FINANCEIRO E BOTÃO REGISTRAR PAGAMENTO */}
      <div className="bg-[#091522] border border-[#1a2f42] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 border-b border-[rgba(255,255,255,0.06)] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#f5c33b]" />
              <h2 className="text-lg font-black text-white tracking-wide">Histórico Financeiro</h2>
            </div>
            <p className="text-xs text-[#8fa2ad] mt-1">
              Registro completo de mensalidades e pagamentos realizados para este aluno.
            </p>
          </div>

          {canRegister && (
            <button
              onClick={handleOpenNewPayment}
              className="btn-inspira-gold px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar pagamento</span>
            </button>
          )}
        </div>

        {/* Tabela de Histórico */}
        {loading ? (
          <div className="py-12 text-center text-[#8fa2ad]">
            <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-[#f5c33b]" />
            <span className="text-xs font-bold uppercase tracking-wider">Carregando pagamentos...</span>
          </div>
        ) : pagamentos.length === 0 ? (
          <div className="py-10 text-center bg-[#0d1e2e]/50 border border-dashed border-[#213a52] rounded-xl">
            <DollarSign className="w-10 h-10 text-[#476074] mx-auto mb-2 opacity-60" />
            <p className="text-sm font-bold text-white mb-1">Nenhum pagamento registrado</p>
            <p className="text-xs text-[#8fa2ad] max-w-sm mx-auto mb-4">
              Clique no botão abaixo para lançar o primeiro pagamento ou cobrança deste aluno.
            </p>
            {canRegister && (
              <button
                onClick={handleOpenNewPayment}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[rgba(245,195,59,0.15)] text-[#f5c33b] border border-[rgba(245,195,59,0.3)] text-xs font-bold hover:bg-[rgba(245,195,59,0.25)] transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Registrar pagamento agora
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1a2f42] text-[11px] font-black text-[#8fa2ad] uppercase tracking-wider">
                  <th className="py-3 px-3">Data</th>
                  <th className="py-3 px-3">Mês / Referência</th>
                  <th className="py-3 px-3">Valor</th>
                  <th className="py-3 px-3">Forma</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Responsável</th>
                  {isAdmin && <th className="py-3 px-3 text-right">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#152737] text-sm">
                {pagamentos.map((p) => (
                  <tr key={p.id} className="hover:bg-[rgba(255,255,255,0.02)] transition group">
                    <td className="py-3.5 px-3 font-semibold text-white whitespace-nowrap text-xs">
                      {formatDate(p.dataPagamento)}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="font-bold text-white text-xs">{p.mesReferencia}</div>
                      {p.observacao && (
                        <div className="text-[11px] text-[#8fa2ad] italic truncate max-w-xs">
                          {p.observacao}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-black text-[#f5c33b] whitespace-nowrap text-xs">
                      {formatCurrency(p.valor)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#132637] border border-[#213c54] text-[11px] font-medium text-white">
                        <CreditCard className="w-3 h-3 text-[#f5c33b]" />
                        {p.formaPagamento}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide ${
                        p.status === 'Pago'
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                          : p.status === 'Aguardando'
                          ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300'
                          : 'bg-red-500/15 border border-red-500/40 text-red-300'
                      }`}>
                        {p.status === 'Pago' && '🟢 Pago'}
                        {p.status === 'Aguardando' && '🟡 Aguardando'}
                        {p.status === 'Atrasado' && '🔴 Atrasado'}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-xs text-[#8fa2ad] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-[#627d92]" />
                        <span>{p.responsavelRegistro}</span>
                      </div>
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick status change toggles */}
                          <button
                            title="Marcar como Pago"
                            onClick={() => handleQuickStatusChange(p, 'Pago')}
                            className={`p-1.5 rounded-lg border transition ${
                              p.status === 'Pago' 
                                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                                : 'bg-[#102334] border-[#1f374e] text-[#8fa2ad] hover:text-emerald-400 hover:border-emerald-500/30'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>

                          <button
                            title="Editar pagamento"
                            onClick={() => handleOpenEditPayment(p)}
                            className="p-1.5 rounded-lg bg-[#102334] border border-[#1f374e] text-[#8fa2ad] hover:text-white hover:border-[#f5c33b]/40 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            title="Excluir pagamento"
                            onClick={() => setDeleteConfirm(p)}
                            className="p-1.5 rounded-lg bg-[#102334] border border-[#1f374e] text-[#8fa2ad] hover:text-red-400 hover:border-red-500/40 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL REGISTRAR / EDITAR PAGAMENTO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#081522] border border-[#1d354a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#182c3e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#f5c33b]" />
                <h3 className="font-black text-white text-base">
                  {editingPagamento ? 'Editar Registro Financeiro' : 'Registrar Pagamento'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4">
              {modalFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalFeedback.text}</span>
                </div>
              )}

              {/* Aluno (fixo para a ficha) */}
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                  Aluno
                </label>
                <input
                  type="text"
                  value={nomeAluno}
                  disabled
                  className="w-full bg-[#0d1e2e] border border-[#1b3145] rounded-xl px-3.5 py-2.5 text-sm text-[#cbd5e1] font-semibold opacity-85 cursor-not-allowed"
                />
              </div>

              {/* Valor & Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                    Valor (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={payValor}
                    onChange={(e) => setPayValor(e.target.value)}
                    required
                    className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2.5 text-sm text-white font-bold focus:border-[#f5c33b] focus:outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                    Data do Pagamento *
                  </label>
                  <input
                    type="date"
                    value={payData}
                    onChange={(e) => setPayData(e.target.value)}
                    required
                    className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Referência (mês) */}
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                  Referência (Mês / Descrição) *
                </label>
                <input
                  type="text"
                  value={payReferencia}
                  onChange={(e) => setPayReferencia(e.target.value)}
                  placeholder="Ex: Mensalidade Setembro/2026"
                  required
                  className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2.5 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition"
                />
              </div>

              {/* Forma de Pagamento & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                    Forma de Pagamento
                  </label>
                  <select
                    value={payForma}
                    onChange={(e) => setPayForma(e.target.value as FormaPagamento)}
                    className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3 py-2.5 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition cursor-pointer"
                  >
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Boleto">Boleto</option>
                    <option value="Transferência">Transferência</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={payStatus}
                    onChange={(e) => setPayStatus(e.target.value as StatusFinanceiro)}
                    className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3 py-2.5 text-sm text-white font-bold focus:border-[#f5c33b] focus:outline-none transition cursor-pointer"
                  >
                    <option value="Pago">🟢 Pago</option>
                    <option value="Aguardando">🟡 Aguardando</option>
                    <option value="Atrasado">🔴 Atrasado</option>
                  </select>
                </div>
              </div>

              {/* Observação */}
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                  Observação (Opcional)
                </label>
                <textarea
                  value={payObservacao}
                  onChange={(e) => setPayObservacao(e.target.value)}
                  rows={2}
                  placeholder="Ex: Comprovante enviado via WhatsApp pelo responsável..."
                  className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#182c3e]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-sm font-bold text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-inspira-gold px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : editingPagamento ? 'Salvar Alterações' : 'Confirmar Pagamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#081522] border border-red-500/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-black text-white">Excluir Pagamento?</h4>
            </div>
            <p className="text-xs text-[#8fa2ad] mb-4 leading-relaxed">
              Tem certeza que deseja excluir o registro de <strong className="text-white">{deleteConfirm.mesReferencia}</strong> no valor de <strong className="text-[#f5c33b]">{formatCurrency(deleteConfirm.valor)}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-3.5 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-xs font-bold text-[#8fa2ad] hover:text-white transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeletePayment(deleteConfirm.id)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-black text-white tracking-wider uppercase transition cursor-pointer shadow-lg"
              >
                Sim, excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
