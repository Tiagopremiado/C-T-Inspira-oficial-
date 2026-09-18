import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  AlertTriangle,
  Award,
  Sparkles,
  CalendarCheck,
  Search,
  Filter,
  Check
} from 'lucide-react';
import { FrequenciaAluno as FrequenciaItem, StatusFrequencia, ResumoFrequencia } from '../types.js';

interface FrequenciaAlunoProps {
  alunoId: number;
  nomeAluno: string;
  currentUser?: {
    id?: string;
    username?: string;
    role?: string;
    nome?: string;
  };
  onResumoUpdated?: (resumo: ResumoFrequencia) => void;
}

const ATIVIDADES_SUGESTOES = [
  'Treinamento de Liderança',
  'Instrução de Ordem Unida',
  'Condicionamento Físico & TAF',
  'Primeiros Socorros & Resgate',
  'Orientação e Sobrevivência',
  'Ética, Civismo e Disciplina',
  'Comunicação & Trabalho em Equipe',
  'Superação de Pista de Obstáculos'
];

export const FrequenciaAluno: React.FC<FrequenciaAlunoProps> = ({
  alunoId,
  nomeAluno,
  currentUser,
  onResumoUpdated
}) => {
  const [frequencias, setFrequencias] = useState<FrequenciaItem[]>([]);
  const [resumo, setResumo] = useState<ResumoFrequencia>({
    totalTreinamentos: 0,
    presentes: 0,
    faltas: 0,
    justificadas: 0,
    percentualPresenca: 100,
    ultimosRegistros: []
  });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [buscaAtividade, setBuscaAtividade] = useState('');

  // Modal de registro/edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    atividade: '',
    instrutorNome: currentUser?.nome || currentUser?.username || 'Instrutor',
    status: 'Presente' as StatusFrequencia,
    observacao: ''
  });

  // Modal de confirmação de exclusão
  const [itemToDelete, setItemToDelete] = useState<FrequenciaItem | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // Permissões
  const role = currentUser?.role || 'Instrutor';
  const isAdmin = role === 'Administrador';
  const isInstrutor = role === 'Instrutor';
  const isSecretaria = role === 'Secretaria';
  const canCreate = isAdmin || isInstrutor;

  const canEdit = (item: FrequenciaItem) => {
    if (isAdmin) return true;
    if (isInstrutor) {
      if (currentUser?.id && item.instrutorId && String(item.instrutorId) === String(currentUser.id)) return true;
      if (currentUser?.nome && item.instrutorNome.toLowerCase() === currentUser.nome.toLowerCase()) return true;
      if (currentUser?.username && item.instrutorNome.toLowerCase() === currentUser.username.toLowerCase()) return true;
    }
    return false;
  };

  const canDelete = () => isAdmin;

  const loadFrequencias = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/alunos/${alunoId}/frequencia`, { headers });
      if (!res.ok) {
        throw new Error('Falha ao carregar registros de frequência.');
      }
      const data = await res.json();
      setFrequencias(data.frequencias || []);
      if (data.resumo) {
        setResumo(data.resumo);
        if (onResumoUpdated) onResumoUpdated(data.resumo);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao carregar dados de frequência.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFrequencias();
  }, [alunoId]);

  const handleOpenNew = () => {
    setEditingId(null);
    setFormData({
      data: new Date().toISOString().split('T')[0],
      atividade: '',
      instrutorNome: currentUser?.nome || currentUser?.username || 'Instrutor',
      status: 'Presente',
      observacao: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: FrequenciaItem) => {
    setEditingId(item.id);
    setFormData({
      data: item.data,
      atividade: item.atividade,
      instrutorNome: item.instrutorNome,
      status: item.status,
      observacao: item.observacao || ''
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.atividade.trim()) {
      alert('Por favor, informe a atividade ou treinamento.');
      return;
    }

    try {
      setSalvando(true);
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const url = editingId ? `/api/frequencia/${editingId}` : `/api/alunos/${alunoId}/frequencia`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify({
          data: formData.data,
          atividade: formData.atividade.trim(),
          instrutorNome: formData.instrutorNome.trim(),
          status: formData.status,
          observacao: formData.observacao.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao salvar registro de frequência.');
      }

      setIsModalOpen(false);
      await loadFrequencias();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar frequência.');
    } finally {
      setSalvando(false);
    }
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    try {
      setExcluindo(true);
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/frequencia/${itemToDelete.id}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao excluir registro de frequência.');
      }

      setItemToDelete(null);
      await loadFrequencias();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir frequência.');
    } finally {
      setExcluindo(false);
    }
  };

  // Filtragem dos registros
  const frequenciasFiltradas = frequencias.filter((item) => {
    const matchStatus = filtroStatus === 'todos' || item.status === filtroStatus;
    const matchBusca =
      !buscaAtividade.trim() ||
      item.atividade.toLowerCase().includes(buscaAtividade.toLowerCase()) ||
      item.instrutorNome.toLowerCase().includes(buscaAtividade.toLowerCase()) ||
      (item.observacao && item.observacao.toLowerCase().includes(buscaAtividade.toLowerCase()));
    return matchStatus && matchBusca;
  });

  const getStatusBadge = (status: StatusFrequencia) => {
    switch (status) {
      case 'Presente':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" /> Presente
          </span>
        );
      case 'Ausente':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3.5 h-3.5" /> Ausente
          </span>
        );
      case 'Justificada':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3.5 h-3.5" /> Ausência justificada
          </span>
        );
    }
  };

  const formatarData = (d: string) => {
    if (!d) return '—';
    try {
      const parts = d.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return d;
    } catch {
      return d;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header com Resumo de Métricas */}
      <div className="bg-[#0b1622] p-5 rounded-2xl border border-[rgba(255,255,255,0.06)] shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[rgba(255,255,255,0.06)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarCheck className="w-5 h-5 text-[#f5c33b]" />
              <h3 className="text-lg font-bold text-white tracking-wide">
                Controle de Frequência e Presença
              </h3>
            </div>
            <p className="text-xs text-[#8fa2ad]">
              Acompanhamento de assiduidade e pontualidade nos treinamentos de <span className="text-white font-semibold">{nomeAluno}</span>
            </p>
          </div>

          {canCreate && (
            <button
              onClick={handleOpenNew}
              id="btn-nova-frequencia"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f5c33b] to-[#dfab22] text-[#061018] font-bold text-sm flex items-center justify-center gap-2 hover:brightness-110 shadow-md transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> Registrar presença
            </button>
          )}
        </div>

        {/* 5 Cards de Estatísticas Obrigatórias */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4">
          {/* 1. Percentual de Presença */}
          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8fa2ad]">
              Presença Geral
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-2xl font-black ${
                  resumo.percentualPresenca >= 85
                    ? 'text-emerald-400'
                    : resumo.percentualPresenca >= 70
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {resumo.percentualPresenca}%
              </span>
            </div>
            <div className="w-full bg-[rgba(255,255,255,0.08)] h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  resumo.percentualPresenca >= 85
                    ? 'bg-emerald-500'
                    : resumo.percentualPresenca >= 70
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, resumo.percentualPresenca))}%` }}
              />
            </div>
          </div>

          {/* 2. Total de Treinamentos */}
          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#8fa2ad]">
              Total Treinos
            </span>
            <span className="text-2xl font-black text-white mt-1">
              {resumo.totalTreinamentos}
            </span>
            <span className="text-[10px] text-[#8fa2ad] mt-1">Sessões registradas</span>
          </div>

          {/* 3. Presentes */}
          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Presentes
            </span>
            <span className="text-2xl font-black text-emerald-400 mt-1">
              {resumo.presentes}
            </span>
            <span className="text-[10px] text-[#8fa2ad] mt-1">Participações ativas</span>
          </div>

          {/* 4. Faltas */}
          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Faltas
            </span>
            <span className="text-2xl font-black text-rose-400 mt-1">
              {resumo.faltas}
            </span>
            <span className="text-[10px] text-[#8fa2ad] mt-1">Ausências s/ justificativa</span>
          </div>

          {/* 5. Faltas Justificadas */}
          <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)] flex flex-col justify-between col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Justificadas
            </span>
            <span className="text-2xl font-black text-amber-400 mt-1">
              {resumo.justificadas}
            </span>
            <span className="text-[10px] text-[#8fa2ad] mt-1">Com atestado / aviso</span>
          </div>
        </div>

        {/* Faixa de Últimos Registros (Dashboard Resumo) */}
        {resumo.ultimosRegistros && resumo.ultimosRegistros.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.06)] flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#8fa2ad] mr-1">Últimos registros:</span>
            {resumo.ultimosRegistros.map((item, idx) => (
              <span
                key={idx}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                  item.status === 'Presente'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                    : item.status === 'Ausente'
                    ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                }`}
              >
                {item.status === 'Presente' && <Check className="w-3 h-3" />}
                {item.status === 'Ausente' && <XCircle className="w-3 h-3" />}
                {item.status === 'Justificada' && <AlertCircle className="w-3 h-3" />}
                {formatarData(item.data)} ({item.status})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-[#8fa2ad] flex items-center gap-1 font-semibold pl-1">
            <Filter className="w-3.5 h-3.5" /> Filtrar:
          </span>
          <button
            onClick={() => setFiltroStatus('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filtroStatus === 'todos'
                ? 'bg-[rgba(245,195,59,0.15)] text-[#f5c33b] border border-[#f5c33b]/30'
                : 'text-[#8fa2ad] hover:text-white bg-[rgba(255,255,255,0.03)] border border-transparent'
            }`}
          >
            Todos ({frequencias.length})
          </button>
          <button
            onClick={() => setFiltroStatus('Presente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filtroStatus === 'Presente'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'text-[#8fa2ad] hover:text-white bg-[rgba(255,255,255,0.03)] border border-transparent'
            }`}
          >
            Presentes ({resumo.presentes})
          </button>
          <button
            onClick={() => setFiltroStatus('Ausente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filtroStatus === 'Ausente'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'text-[#8fa2ad] hover:text-white bg-[rgba(255,255,255,0.03)] border border-transparent'
            }`}
          >
            Faltas ({resumo.faltas})
          </button>
          <button
            onClick={() => setFiltroStatus('Justificada')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
              filtroStatus === 'Justificada'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'text-[#8fa2ad] hover:text-white bg-[rgba(255,255,255,0.03)] border border-transparent'
            }`}
          >
            Justificadas ({resumo.justificadas})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-[#8fa2ad] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por atividade ou instrutor..."
            value={buscaAtividade}
            onChange={(e) => setBuscaAtividade(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white placeholder-[#8fa2ad] focus:outline-none focus:border-[#f5c33b]"
          />
        </div>
      </div>

      {/* Lista de Histórico */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8fa2ad]">
            Histórico de Presenças e Treinamentos ({frequenciasFiltradas.length})
          </h4>
          {isSecretaria && (
            <span className="text-[11px] text-[#8fa2ad] italic">
              Modo visualização (Secretaria)
            </span>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center bg-[#0b1622] rounded-2xl border border-[rgba(255,255,255,0.06)] text-[#8fa2ad]">
            <div className="w-6 h-6 border-2 border-[#f5c33b] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Carregando registros de frequência...
          </div>
        ) : errorMsg ? (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-sm">
            {errorMsg}
          </div>
        ) : frequenciasFiltradas.length === 0 ? (
          <div className="p-8 text-center bg-[#0b1622] rounded-2xl border border-[rgba(255,255,255,0.06)]">
            <CalendarCheck className="w-10 h-10 text-[#8fa2ad] opacity-30 mx-auto mb-2" />
            <p className="text-white font-semibold text-sm">Nenhum registro de frequência encontrado</p>
            <p className="text-xs text-[#8fa2ad] mt-1 max-w-sm mx-auto">
              {frequencias.length === 0
                ? 'Registre a primeira presença ou falta do aluno clicando no botão "+ Registrar presença".'
                : 'Nenhum registro corresponde aos filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {frequenciasFiltradas.map((item) => (
              <div
                key={item.id}
                className="bg-[#0b1622] p-4 rounded-xl border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] transition flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="p-2.5 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-center shrink-0 min-w-[65px]">
                    <span className="text-[10px] text-[#8fa2ad] uppercase font-bold block">
                      Data
                    </span>
                    <span className="text-xs font-bold text-white block mt-0.5">
                      {formatarData(item.data)}
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-sm font-bold text-white tracking-wide">
                        {item.atividade}
                      </h5>
                      {getStatusBadge(item.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#8fa2ad]">
                      <span>
                        Instrutor: <strong className="text-slate-300 font-semibold">{item.instrutorNome}</strong>
                      </span>
                    </div>

                    {item.observacao && (
                      <p className="mt-2 text-xs text-slate-300 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.04)] p-2 rounded-lg italic">
                        "{item.observacao}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Ações de Edição e Exclusão */}
                <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                  {canEdit(item) && (
                    <button
                      onClick={() => handleOpenEdit(item)}
                      title="Editar registro"
                      className="p-2 rounded-lg text-[#8fa2ad] hover:text-[#f5c33b] hover:bg-[rgba(245,195,59,0.1)] transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}

                  {canDelete() && (
                    <button
                      onClick={() => setItemToDelete(item)}
                      title="Excluir registro"
                      className="p-2 rounded-lg text-[#8fa2ad] hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banner de Integração Futura (Conforme requisitos) */}
      <div className="p-4 rounded-xl border border-dashed border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.01)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#8fa2ad]">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-[#f5c33b] shrink-0" />
          <span>
            <strong>Próximas fases:</strong> Este módulo está preparado para sincronização com o <em>Calendário Geral de Treinamentos</em>, <em>Notificação de ausência via WhatsApp para os responsáveis</em>, e <em>Emissão de Certificado por Assiduidade</em>.
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-[rgba(245,195,59,0.08)] text-[#f5c33b] font-bold text-[11px] shrink-0">
          Inspira V1.0
        </span>
      </div>

      {/* Modal: Registrar / Editar Presença */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1622] border border-[rgba(255,255,255,0.1)] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-[#f5c33b]" />
                <h3 className="text-base font-bold text-white">
                  {editingId ? 'Editar Registro de Frequência' : 'Registrar Presença / Treinamento'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8fa2ad] hover:text-white text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              {/* Aluno em destaque */}
              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                <span className="text-[10px] uppercase font-bold text-[#8fa2ad] block">Aluno</span>
                <span className="text-sm font-bold text-white block">{nomeAluno}</span>
              </div>

              {/* Data e Instrutor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#8fa2ad] block mb-1">
                    Data do Treinamento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full bg-[#061018] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8fa2ad] block mb-1">
                    Instrutor Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.instrutorNome}
                    onChange={(e) => setFormData({ ...formData, instrutorNome: e.target.value })}
                    placeholder="Nome do instrutor"
                    className="w-full bg-[#061018] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
              </div>

              {/* Atividade / Treinamento */}
              <div>
                <label className="text-xs font-bold text-[#8fa2ad] block mb-1">
                  Atividade / Treinamento Realizado *
                </label>
                <input
                  type="text"
                  required
                  value={formData.atividade}
                  onChange={(e) => setFormData({ ...formData, atividade: e.target.value })}
                  placeholder="Ex: Treinamento de liderança, Ordem unida..."
                  className="w-full bg-[#061018] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f5c33b]"
                />

                {/* Sugestões rápidas */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="text-[10px] text-[#8fa2ad] self-center mr-1">Sugestões:</span>
                  {ATIVIDADES_SUGESTOES.slice(0, 4).map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFormData({ ...formData, atividade: sug })}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] text-[#8fa2ad] hover:text-white hover:border-[#f5c33b] transition"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status de Presença (Opções obrigatórias) */}
              <div>
                <label className="text-xs font-bold text-[#8fa2ad] block mb-2">
                  Status de Participação *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'Presente' })}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                      formData.status === 'Presente'
                        ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold ring-1 ring-emerald-500'
                        : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[#8fa2ad] hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs font-bold">✅ Presente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'Ausente' })}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                      formData.status === 'Ausente'
                        ? 'bg-rose-500/15 border-rose-500 text-rose-400 font-bold ring-1 ring-rose-500'
                        : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[#8fa2ad] hover:text-white'
                    }`}
                  >
                    <XCircle className="w-5 h-5 text-rose-400" />
                    <span className="text-xs font-bold">❌ Ausente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'Justificada' })}
                    className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition ${
                      formData.status === 'Justificada'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold ring-1 ring-amber-500'
                        : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.08)] text-[#8fa2ad] hover:text-white'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold">🟡 Justificada</span>
                  </button>
                </div>
              </div>

              {/* Observações Opcionais */}
              <div>
                <label className="text-xs font-bold text-[#8fa2ad] block mb-1">
                  Observação / Parecer do Instrutor (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Ex: Participou bem da atividade em equipe, demonstrou pontualidade..."
                  className="w-full bg-[#061018] border border-[rgba(255,255,255,0.1)] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-[#f5c33b] resize-none"
                />
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={salvando}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[#8fa2ad] hover:text-white bg-[rgba(255,255,255,0.03)] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="px-5 py-2 rounded-xl bg-[#f5c33b] text-[#061018] font-bold text-xs hover:brightness-110 shadow-md transition disabled:opacity-50"
                >
                  {salvando ? 'Salvando...' : editingId ? 'Atualizar Frequência' : 'Confirmar Presença'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão (Sem window.confirm) */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b1622] border border-rose-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Excluir Registro</h4>
                <span className="text-xs text-[#8fa2ad]">Esta ação não poderá ser desfeita</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Deseja realmente remover o registro do treinamento{' '}
              <strong className="text-white">"{itemToDelete.atividade}"</strong> do dia{' '}
              <strong className="text-white">{formatarData(itemToDelete.data)}</strong>?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={excluindo}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[#8fa2ad] hover:text-white bg-[rgba(255,255,255,0.03)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={excluindo}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 shadow-md transition disabled:opacity-50"
              >
                {excluindo ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
