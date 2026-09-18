import React, { useState, useEffect, useMemo } from 'react';
import { 
  DollarSign, Plus, Search, Filter, Calendar, User, Eye, Edit2, Trash2, 
  CheckCircle2, AlertTriangle, X, Check, CreditCard, Users, Clock, AlertCircle,
  TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw, FileText
} from 'lucide-react';
import { Pagamento, DashboardFinanceiroStats, StatusFinanceiro, FormaPagamento, PreCadastro } from '../types.js';

interface FinanceiroComandoProps {
  currentUserRole: string;
  currentUserId?: string;
  currentUserName?: string;
}

export const FinanceiroComando: React.FC<FinanceiroComandoProps> = ({
  currentUserRole,
  currentUserId,
  currentUserName
}) => {
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [alunos, setAlunos] = useState<PreCadastro[]>([]);
  const [stats, setStats] = useState<DashboardFinanceiroStats>({
    totalAlunosAtivos: 0,
    mensalidadesRecebidasTotal: 0,
    mensalidadesRecebidasQtd: 0,
    mensalidadesPendentesTotal: 0,
    mensalidadesPendentesQtd: 0,
    pagamentosAtrasadosTotal: 0,
    pagamentosAtrasadosQtd: 0
  });

  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pagos' | 'Pendentes' | 'Atrasados'>('Todos');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingPagamento, setEditingPagamento] = useState<Pagamento | null>(null);
  const [viewingPagamento, setViewingPagamento] = useState<Pagamento | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Pagamento | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [selectedAlunoId, setSelectedAlunoId] = useState<string>('');
  const [alunoSearchTerm, setAlunoSearchTerm] = useState('');
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
    if (!isInstrutor) {
      loadData();
      loadAlunos();
    }
  }, [isInstrutor]);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const [resStats, resPagamentos] = await Promise.all([
        fetch('/api/financeiro/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/financeiro/pagamentos', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (resStats.ok) {
        const dataStats = await resStats.json();
        if (dataStats.stats) setStats(dataStats.stats);
      }

      if (resPagamentos.ok) {
        const dataPag = await resPagamentos.json();
        setPagamentos(dataPag.pagamentos || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados financeiros:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAlunos = async () => {
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch('/api/pre-cadastros', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAlunos(data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar lista de alunos:', err);
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
    setSelectedAlunoId(alunos.length > 0 ? String(alunos[0].id) : '');
    setAlunoSearchTerm('');
    setPayValor('150.00');
    setPayData(new Date().toISOString().split('T')[0]);
    setPayReferencia(getDefaultReference());
    setPayForma('PIX');
    setPayStatus('Pago');
    setPayObservacao('');
    setActionFeedback(null);
    setShowModal(true);
  };

  const handleOpenEditPayment = (p: Pagamento) => {
    setEditingPagamento(p);
    setSelectedAlunoId(String(p.alunoId));
    setAlunoSearchTerm(p.alunoNome || '');
    setPayValor(Number(p.valor).toFixed(2));
    setPayData(p.dataPagamento);
    setPayReferencia(p.mesReferencia);
    setPayForma(p.formaPagamento as FormaPagamento);
    setPayStatus(p.status);
    setPayObservacao(p.observacao || '');
    setActionFeedback(null);
    setShowModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlunoId) {
      setActionFeedback({ text: 'Por favor, selecione o aluno.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    const alunoSelected = alunos.find(a => String(a.id) === String(selectedAlunoId));
    const targetAlunoNome = alunoSelected?.nomeAluno || editingPagamento?.alunoNome || `Aluno #${selectedAlunoId}`;

    try {
      const token = localStorage.getItem('inspira_auth_token');
      const payload = {
        alunoId: Number(selectedAlunoId),
        alunoNome: targetAlunoNome,
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
        setActionFeedback({ text: data.error || 'Erro ao registrar pagamento.', type: 'error' });
      }
    } catch (err: any) {
      setActionFeedback({ text: 'Falha de comunicação com o servidor.', type: 'error' });
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
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '--';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Filtragem
  const filteredPagamentos = useMemo(() => {
    return pagamentos.filter((p) => {
      // Filtro de status
      if (statusFilter === 'Pagos' && p.status !== 'Pago') return false;
      if (statusFilter === 'Pendentes' && p.status !== 'Aguardando') return false;
      if (statusFilter === 'Atrasados' && p.status !== 'Atrasado') return false;

      // Filtro de texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNome = (p.alunoNome || '').toLowerCase().includes(q);
        const matchRef = (p.mesReferencia || '').toLowerCase().includes(q);
        const matchForma = (p.formaPagamento || '').toLowerCase().includes(q);
        const matchResp = (p.responsavelRegistro || '').toLowerCase().includes(q);
        const matchObs = (p.observacao || '').toLowerCase().includes(q);
        return matchNome || matchRef || matchForma || matchResp || matchObs;
      }
      return true;
    });
  }, [pagamentos, statusFilter, searchTerm]);

  // Alunos filtrados para o modal
  const filteredAlunosList = useMemo(() => {
    if (!alunoSearchTerm.trim()) return alunos;
    const q = alunoSearchTerm.toLowerCase();
    return alunos.filter(a => a.nomeAluno.toLowerCase().includes(q) || (a.cidadeAluno || '').toLowerCase().includes(q));
  }, [alunos, alunoSearchTerm]);

  if (isInstrutor) {
    return (
      <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 pt-12">
        <div className="p-10 text-center bg-[#091522] border border-[#1a2f42] rounded-3xl max-w-lg mx-auto shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-white mb-2">Acesso Restrito ao Módulo Financeiro</h2>
          <p className="text-sm text-[#8fa2ad] leading-relaxed">
            Usuários com perfil de <strong>Instrutor</strong> não possuem permissão para acessar ou gerenciar informações financeiras. Caso necessite de acesso, solicite ao Administrador Geral.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Gestão Financeira</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 mb-1.5">Financeiro</h1>
          <p className="text-[#9dafb9] text-sm max-w-[700px] leading-relaxed">
            Acompanhe o fluxo de mensalidades, pagamentos recebidos, pendências e situação financeira dos alunos do CT Inspira.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={loadData}
            title="Atualizar dados"
            className="p-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-white hover:bg-[rgba(255,255,255,0.08)] transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {canRegister && (
            <button
              onClick={handleOpenNewPayment}
              className="btn-inspira-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              <span>+ Registrar pagamento</span>
            </button>
          )}
        </div>
      </div>

      {/* DASHBOARD FINANCEIRO: 4 CARDS OBRIGATÓRIOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Card 1: Total de alunos ativos */}
        <div className="bg-[#091522] border border-[#1a2f42] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-[#f5c33b]/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#8fa2ad]">Total de Alunos Ativos</span>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white tracking-tight">
            {stats.totalAlunosAtivos}
          </div>
          <p className="text-[11px] text-[#8fa2ad] mt-1.5 font-semibold">
            Alunos matriculados ativos no CT
          </p>
        </div>

        {/* Card 2: Mensalidades recebidas */}
        <div className="bg-[#091522] border border-[#1a2f42] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#8fa2ad]">Mensalidades Recebidas</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 tracking-tight">
            {formatCurrency(stats.mensalidadesRecebidasTotal)}
          </div>
          <p className="text-[11px] text-[#8fa2ad] mt-1.5 font-semibold">
            {stats.mensalidadesRecebidasQtd} {stats.mensalidadesRecebidasQtd === 1 ? 'pagamento confirmado' : 'pagamentos confirmados'}
          </p>
        </div>

        {/* Card 3: Mensalidades pendentes */}
        <div className="bg-[#091522] border border-[#1a2f42] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#8fa2ad]">Mensalidades Pendentes</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 tracking-tight">
            {formatCurrency(stats.mensalidadesPendentesTotal)}
          </div>
          <p className="text-[11px] text-[#8fa2ad] mt-1.5 font-semibold">
            {stats.mensalidadesPendentesQtd} {stats.mensalidadesPendentesQtd === 1 ? 'mensalidade aguardando' : 'mensalidades aguardando'}
          </p>
        </div>

        {/* Card 4: Pagamentos atrasados */}
        <div className="bg-[#091522] border border-[#1a2f42] rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-red-500/40 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-[#8fa2ad]">Pagamentos Atrasados</span>
            <div className="w-9 h-9 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-red-400 tracking-tight">
            {formatCurrency(stats.pagamentosAtrasadosTotal)}
          </div>
          <p className="text-[11px] text-[#8fa2ad] mt-1.5 font-semibold">
            {stats.pagamentosAtrasadosQtd} {stats.pagamentosAtrasadosQtd === 1 ? 'pagamento em atraso' : 'pagamentos em atraso'}
          </p>
        </div>
      </div>

      {/* FILTROS E BUSCA */}
      <div className="bg-[#091522] border border-[#1a2f42] rounded-2xl p-4 sm:p-5 shadow-xl mb-6">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Botões de Filtros: Todos | Pagos | Pendentes | Atrasados */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mr-1 hidden sm:inline">
              Filtro:
            </span>

            <button
              onClick={() => setStatusFilter('Todos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                statusFilter === 'Todos'
                  ? 'bg-[rgba(245,195,59,0.15)] text-[#f5c33b] border border-[#f5c33b]/40 shadow-sm'
                  : 'bg-[#0d1e2e] text-[#8fa2ad] border border-[#1c3247] hover:text-white'
              }`}
            >
              Todos ({pagamentos.length})
            </button>

            <button
              onClick={() => setStatusFilter('Pagos')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'Pagos'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-[#0d1e2e] text-[#8fa2ad] border border-[#1c3247] hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Pagos ({stats.mensalidadesRecebidasQtd})
            </button>

            <button
              onClick={() => setStatusFilter('Pendentes')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'Pendentes'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'bg-[#0d1e2e] text-[#8fa2ad] border border-[#1c3247] hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Pendentes ({stats.mensalidadesPendentesQtd})
            </button>

            <button
              onClick={() => setStatusFilter('Atrasados')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'Atrasados'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                  : 'bg-[#0d1e2e] text-[#8fa2ad] border border-[#1c3247] hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-red-400" />
              Atrasados ({stats.pagamentosAtrasadosQtd})
            </button>
          </div>

          {/* Busca Textual */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#8fa2ad]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por aluno, mês, forma..."
              className="w-full bg-[#0d1e2e] border border-[#1c3247] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white font-medium focus:border-[#f5c33b] focus:outline-none transition placeholder:text-[#6a8091]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-2.5 text-[#8fa2ad] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TABELA DO HISTÓRICO FINANCEIRO */}
      <div className="bg-[#091522] border border-[#1a2f42] rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#162a3c] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#f5c33b]" />
            <h2 className="text-base font-black text-white tracking-wide">
              Registros e Histórico Financeiro
            </h2>
          </div>
          <span className="text-xs font-semibold text-[#8fa2ad]">
            Exibindo {filteredPagamentos.length} de {pagamentos.length} {pagamentos.length === 1 ? 'registro' : 'registros'}
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-[#8fa2ad]">
            <Clock className="w-8 h-8 animate-spin mx-auto mb-2 text-[#f5c33b]" />
            <span className="text-xs font-bold uppercase tracking-wider">Carregando dados financeiros...</span>
          </div>
        ) : filteredPagamentos.length === 0 ? (
          <div className="py-16 text-center">
            <DollarSign className="w-12 h-12 text-[#3b5468] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-bold text-white mb-1">Nenhum registro encontrado</h3>
            <p className="text-xs text-[#8fa2ad] max-w-md mx-auto mb-5">
              {searchTerm || statusFilter !== 'Todos'
                ? 'Nenhum lançamento corresponde aos filtros selecionados. Tente ajustar os termos de busca.'
                : 'Ainda não há registros financeiros no sistema. Registre a primeira mensalidade clicando abaixo.'}
            </p>
            {canRegister && (
              <button
                onClick={handleOpenNewPayment}
                className="btn-inspira-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Registrar primeiro pagamento
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#162a3c] bg-[#07111b]/60 text-[11px] font-black text-[#8fa2ad] uppercase tracking-wider">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Aluno</th>
                  <th className="py-3 px-4">Mês / Referência</th>
                  <th className="py-3 px-4">Valor</th>
                  <th className="py-3 px-4">Forma</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132535] text-sm">
                {filteredPagamentos.map((p) => (
                  <tr key={p.id} className="hover:bg-[rgba(255,255,255,0.02)] transition group">
                    {/* Data */}
                    <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap text-xs">
                      {formatDate(p.dataPagamento)}
                    </td>

                    {/* Aluno */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-white text-sm hover:text-[#f5c33b] transition">
                        {p.alunoNome || `Aluno #${p.alunoId}`}
                      </div>
                      <span className="text-[10px] text-[#698294] font-medium">ID: #{p.alunoId}</span>
                    </td>

                    {/* Mês / Referência */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white text-xs">{p.mesReferencia}</div>
                      {p.observacao && (
                        <div className="text-[11px] text-[#8fa2ad] italic truncate max-w-xs mt-0.5" title={p.observacao}>
                          {p.observacao}
                        </div>
                      )}
                    </td>

                    {/* Valor */}
                    <td className="py-3.5 px-4 font-black text-[#f5c33b] whitespace-nowrap text-xs">
                      {formatCurrency(p.valor)}
                    </td>

                    {/* Forma de Pagamento */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#102436] border border-[#1e3952] text-[11px] font-medium text-white">
                        <CreditCard className="w-3 h-3 text-[#f5c33b]" />
                        {p.formaPagamento}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black tracking-wide ${
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

                    {/* Responsável pelo Registro */}
                    <td className="py-3.5 px-4 text-xs text-[#8fa2ad] whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-[#627d92]" />
                        <span className="font-medium">{p.responsavelRegistro}</span>
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Visualizar detalhes"
                          onClick={() => setViewingPagamento(p)}
                          className="p-1.5 rounded-lg bg-[#102334] border border-[#1f374e] text-[#8fa2ad] hover:text-white hover:border-[#f5c33b]/40 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Ações restritas ao Administrador */}
                        {isAdmin && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
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
          <div className="bg-[#081522] border border-[#1d354a] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#182c3e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#f5c33b]" />
                <h3 className="font-black text-white text-base">
                  {editingPagamento ? 'Editar Pagamento' : 'Registrar Novo Pagamento'}
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
              {actionFeedback && (
                <div className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
                  actionFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                }`}>
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{actionFeedback.text}</span>
                </div>
              )}

              {/* Seletor de Aluno */}
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                  Aluno *
                </label>
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-[#8fa2ad]" />
                    <input
                      type="text"
                      value={alunoSearchTerm}
                      onChange={(e) => setAlunoSearchTerm(e.target.value)}
                      placeholder="Filtrar aluno por nome..."
                      className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white font-medium focus:border-[#f5c33b] focus:outline-none transition"
                    />
                  </div>
                  <select
                    value={selectedAlunoId}
                    onChange={(e) => setSelectedAlunoId(e.target.value)}
                    required
                    className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:border-[#f5c33b] focus:outline-none transition cursor-pointer"
                  >
                    <option value="">-- Selecione o Aluno --</option>
                    {filteredAlunosList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nomeAluno} ({a.cidadeAluno || 'Pelotas'})
                      </option>
                    ))}
                  </select>
                </div>
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

              {/* Referência (Mês) */}
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
                  placeholder="Ex: Pagamento recebido via PIX chave CNPJ..."
                  className="w-full bg-[#0d1e2e] border border-[#213a52] rounded-xl px-3.5 py-2 text-sm text-white font-medium focus:border-[#f5c33b] focus:outline-none transition resize-none"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#182c3e]">
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
                  <span>{isSubmitting ? 'Gravando...' : editingPagamento ? 'Salvar Alterações' : 'Confirmar Pagamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VISUALIZAR PAGAMENTO */}
      {viewingPagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#081522] border border-[#1d354a] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#182c3e] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#f5c33b]" />
                <h3 className="font-black text-white text-base">Detalhes do Registro Financeiro</h3>
              </div>
              <button
                onClick={() => setViewingPagamento(null)}
                className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="bg-[#0d1e2e] p-4 rounded-xl border border-[#1b3145]">
                <span className="text-[11px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Aluno</span>
                <span className="text-base font-extrabold text-white">{viewingPagamento.alunoNome || `Aluno #${viewingPagamento.alunoId}`}</span>
                <span className="block text-xs text-[#698294] mt-0.5">Matrícula ID: #{viewingPagamento.alunoId}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d1e2e] p-3 rounded-xl border border-[#1b3145]">
                  <span className="text-[10px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Valor</span>
                  <span className="text-lg font-black text-[#f5c33b]">{formatCurrency(viewingPagamento.valor)}</span>
                </div>
                <div className="bg-[#0d1e2e] p-3 rounded-xl border border-[#1b3145]">
                  <span className="text-[10px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Status</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black ${
                    viewingPagamento.status === 'Pago'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : viewingPagamento.status === 'Aguardando'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {viewingPagamento.status === 'Pago' && '🟢 Pago'}
                    {viewingPagamento.status === 'Aguardando' && '🟡 Aguardando'}
                    {viewingPagamento.status === 'Atrasado' && '🔴 Atrasado'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0d1e2e] p-3 rounded-xl border border-[#1b3145]">
                  <span className="text-[10px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Data Pagamento</span>
                  <span className="font-bold text-white text-xs">{formatDate(viewingPagamento.dataPagamento)}</span>
                </div>
                <div className="bg-[#0d1e2e] p-3 rounded-xl border border-[#1b3145]">
                  <span className="text-[10px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Forma</span>
                  <span className="font-bold text-white text-xs">{viewingPagamento.formaPagamento}</span>
                </div>
              </div>

              <div className="bg-[#0d1e2e] p-3 rounded-xl border border-[#1b3145]">
                <span className="text-[10px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Mês / Referência</span>
                <span className="font-bold text-white text-xs">{viewingPagamento.mesReferencia}</span>
              </div>

              {viewingPagamento.observacao && (
                <div className="bg-[#0d1e2e] p-3 rounded-xl border border-[#1b3145]">
                  <span className="text-[10px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Observação</span>
                  <p className="text-xs text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">{viewingPagamento.observacao}</p>
                </div>
              )}

              <div className="pt-2 text-[11px] text-[#698294] flex items-center justify-between border-t border-[#182c3e]">
                <span>Registrado por: <strong className="text-[#8fa2ad]">{viewingPagamento.responsavelRegistro}</strong></span>
                {viewingPagamento.criadoEm && <span>Em: {new Date(viewingPagamento.criadoEm).toLocaleDateString('pt-BR')}</span>}
              </div>
            </div>

            <div className="p-4 bg-[#07111b] border-t border-[#182c3e] flex justify-end">
              <button
                onClick={() => setViewingPagamento(null)}
                className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.06)] text-xs font-bold text-white hover:bg-[rgba(255,255,255,0.12)] transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#081522] border border-red-500/30 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
            <div className="flex items-center gap-3 text-red-400 mb-3">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h4 className="text-base font-black text-white">Excluir Pagamento?</h4>
            </div>
            <p className="text-xs text-[#8fa2ad] mb-4 leading-relaxed">
              Tem certeza que deseja excluir o pagamento de <strong className="text-white">{deleteConfirm.alunoNome}</strong> referente a <strong className="text-white">{deleteConfirm.mesReferencia}</strong> no valor de <strong className="text-[#f5c33b]">{formatCurrency(deleteConfirm.valor)}</strong>?
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
