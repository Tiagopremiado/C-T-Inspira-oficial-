import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  User,
  Tag,
  Plus,
  Edit2,
  Copy,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  List,
  Layers,
  ArrowRight
} from 'lucide-react';
import { CronogramaAula, StatusCronograma } from '../types';

interface CronogramaComandoProps {
  currentUserRole: string;
  currentUserId?: string;
  currentUserName: string;
}

const CATEGORIAS_PADRAO = [
  'Treinamento Regular',
  'Disciplina',
  'Ordem Unida',
  'Primeiros Socorros',
  'Sobrevivência',
  'Rapel',
  'Técnicas com Cordas',
  'Falsa Baiana',
  'Comando Crawl',
  'Condicionamento Físico',
  'Acampamento',
  'Instrução Teórica',
  'Cerimônia',
  'Avaliação',
  'Evento Especial',
  'Outros'
];

export const CronogramaComando: React.FC<CronogramaComandoProps> = ({
  currentUserRole,
  currentUserName
}) => {
  const canEdit = currentUserRole === 'Administrador' || currentUserRole === 'Secretaria';
  const canDelete = currentUserRole === 'Administrador';

  // View state
  const [viewMode, setViewMode] = useState<'calendario' | 'lista'>('calendario');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Data
  const [aulas, setAulas] = useState<CronogramaAula[]>([]);

  // Filters
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth() + 1); // 1-12
  const [filterCategoria, setFilterCategoria] = useState<string>('todas');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDayString, setSelectedDayString] = useState<string>(
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  );

  // Modals state
  const [showNovaModal, setShowNovaModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDuplicarModal, setShowDuplicarModal] = useState(false);
  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [selectedAula, setSelectedAula] = useState<CronogramaAula | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    titulo: '',
    data: '',
    horaInicio: '14:00',
    horaFim: '17:00',
    categoria: 'Treinamento Regular',
    categoriaCustom: '',
    local: '',
    instrutorResponsavelNome: '',
    descricao: '',
    materiais: '',
    observacoes: '',
    status: 'Planejada' as StatusCronograma
  });
  const [duplicateData, setDuplicateData] = useState({
    novaData: '',
    novoHorario: ''
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete / Cancel confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);

  // Load Data
  const fetchAulas = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const params = new URLSearchParams();
      // Em lista ou calendário, trazemos os registros do ano selecionado
      params.append('ano', String(currentYear));
      if (viewMode === 'calendario') {
        params.append('mes', String(currentMonth));
      }
      if (filterCategoria !== 'todas') params.append('categoria', filterCategoria);
      if (filterStatus !== 'todos') params.append('status', filterStatus);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await fetch(`/api/cronograma?${params.toString()}`, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao carregar o cronograma.');
      }
      const data = await res.json();
      setAulas(data.aulas || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao buscar aulas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAulas();
  }, [currentYear, currentMonth, viewMode, filterCategoria, filterStatus]);

  // Handle Search Debounce
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchAulas();
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4500);
    } else {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth() + 1);
  };

  // Open Nova Aula Modal
  const handleOpenNovaAula = (prefillDate?: string) => {
    const d = prefillDate || `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setFormData({
      titulo: '',
      data: d,
      horaInicio: '14:00',
      horaFim: '17:00',
      categoria: 'Treinamento Regular',
      categoriaCustom: '',
      local: 'Sede Inspira - Campo de Instrução',
      instrutorResponsavelNome: '',
      descricao: '',
      materiais: '',
      observacoes: '',
      status: 'Planejada'
    });
    setShowNovaModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (aula: CronogramaAula) => {
    setSelectedAula(aula);
    const isCustomCat = !CATEGORIAS_PADRAO.includes(aula.categoria);
    setFormData({
      titulo: aula.titulo,
      data: aula.data,
      horaInicio: aula.horaInicio,
      horaFim: aula.horaFim || '',
      categoria: isCustomCat ? 'Outros' : aula.categoria,
      categoriaCustom: isCustomCat ? aula.categoria : '',
      local: aula.local || '',
      instrutorResponsavelNome: aula.instrutorResponsavelNome || '',
      descricao: aula.descricao || '',
      materiais: aula.materiais || '',
      observacoes: aula.observacoes || '',
      status: aula.status
    });
    setShowEditModal(true);
  };

  // Open Duplicar Modal
  const handleOpenDuplicar = (aula: CronogramaAula) => {
    setSelectedAula(aula);
    setDuplicateData({
      novaData: '',
      novoHorario: aula.horaInicio
    });
    setShowDuplicarModal(true);
  };

  // Open Detalhes Modal
  const handleOpenDetalhes = (aula: CronogramaAula) => {
    setSelectedAula(aula);
    setShowDetalhesModal(true);
  };

  // Submit Nova Aula
  const handleSubmitNovaAula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.data || !formData.horaInicio) {
      showNotification('Preencha os campos obrigatórios (Título, Data e Horário de Início).', true);
      return;
    }

    const finalCategoria = formData.categoria === 'Outros' && formData.categoriaCustom.trim()
      ? formData.categoriaCustom.trim()
      : formData.categoria;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/cronograma', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          titulo: formData.titulo.trim(),
          data: formData.data,
          horaInicio: formData.horaInicio,
          horaFim: formData.horaFim || undefined,
          categoria: finalCategoria,
          local: formData.local.trim() || undefined,
          instrutorResponsavelNome: formData.instrutorResponsavelNome.trim() || undefined,
          descricao: formData.descricao.trim() || undefined,
          materiais: formData.materiais.trim() || undefined,
          observacoes: formData.observacoes.trim() || undefined,
          status: formData.status
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao agendar aula.');
      }

      setShowNovaModal(false);
      showNotification('Aula adicionada com sucesso ao cronograma anual!');
      fetchAulas();
    } catch (err: any) {
      showNotification(err.message || 'Falha ao salvar aula.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Edit Aula
  const handleSubmitEditAula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAula) return;
    if (!formData.titulo.trim() || !formData.data || !formData.horaInicio) {
      showNotification('Preencha os campos obrigatórios.', true);
      return;
    }

    const finalCategoria = formData.categoria === 'Outros' && formData.categoriaCustom.trim()
      ? formData.categoriaCustom.trim()
      : formData.categoria;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/cronograma/${selectedAula.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          titulo: formData.titulo.trim(),
          data: formData.data,
          horaInicio: formData.horaInicio,
          horaFim: formData.horaFim || undefined,
          categoria: finalCategoria,
          local: formData.local.trim() || undefined,
          instrutorResponsavelNome: formData.instrutorResponsavelNome.trim() || undefined,
          descricao: formData.descricao.trim() || undefined,
          materiais: formData.materiais.trim() || undefined,
          observacoes: formData.observacoes.trim() || undefined,
          status: formData.status
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao atualizar aula.');
      }

      setShowEditModal(false);
      showNotification('Aula atualizada com sucesso no cronograma!');
      fetchAulas();
    } catch (err: any) {
      showNotification(err.message || 'Falha ao atualizar aula.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Duplicar Aula
  const handleSubmitDuplicar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAula) return;
    if (!duplicateData.novaData) {
      showNotification('Selecione a nova data para a aula duplicada.', true);
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/cronograma/${selectedAula.id}/duplicar`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          novaData: duplicateData.novaData,
          novoHorario: duplicateData.novoHorario || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao duplicar aula.');
      }

      setShowDuplicarModal(false);
      showNotification(`Aula duplicada com sucesso para ${formatDateBR(duplicateData.novaData)}!`);
      fetchAulas();
    } catch (err: any) {
      showNotification(err.message || 'Falha ao duplicar aula.', true);
    } finally {
      setSubmitting(false);
    }
  };

  // Cancelar Aula (status -> Cancelada)
  const handleConfirmCancel = async () => {
    if (!confirmCancelId) return;
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/cronograma/${confirmCancelId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status: 'Cancelada' })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao cancelar aula.');
      }

      setConfirmCancelId(null);
      if (showDetalhesModal) setShowDetalhesModal(false);
      showNotification('Aula marcada como Cancelada. O histórico foi preservado.');
      fetchAulas();
    } catch (err: any) {
      showNotification(err.message || 'Falha ao cancelar aula.', true);
    }
  };

  // Excluir Aula (soft delete - Admin only)
  const handleConfirmDelete = async () => {
    if (!confirmDeleteId) return;
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/cronograma/${confirmDeleteId}`, {
        method: 'DELETE',
        headers
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao excluir aula.');
      }

      setConfirmDeleteId(null);
      if (showDetalhesModal) setShowDetalhesModal(false);
      showNotification('Aula removida com sucesso do cronograma.');
      fetchAulas();
    } catch (err: any) {
      showNotification(err.message || 'Falha ao excluir aula.', true);
    }
  };

  // Calendar calculations
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 (Dom) a 6 (Sáb)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

    const days = [];

    // Previous month padding days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = currentMonth === 1 ? 12 : currentMonth - 1;
      const y = currentMonth === 1 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true
      });
    }

    // Next month padding days to complete grid (multiples of 7)
    const totalCells = Math.ceil(days.length / 7) * 7;
    const remaining = totalCells - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 12 ? 1 : currentMonth + 1;
      const y = currentMonth === 12 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Map aulas by date for instant lookup
  const aulasByDate = useMemo(() => {
    const map = new Map<string, CronogramaAula[]>();
    for (const aula of aulas) {
      const list = map.get(aula.data) || [];
      list.push(aula);
      map.set(aula.data, list);
    }
    return map;
  }, [aulas]);

  // Selected day's aulas for agenda panel
  const selectedDayAulas = useMemo(() => {
    return aulasByDate.get(selectedDayString) || [];
  }, [aulasByDate, selectedDayString]);

  // Helpers
  function formatDateBR(dateStr: string) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getStatusBadge(status: StatusCronograma) {
    switch (status) {
      case 'Confirmada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            Confirmada
          </span>
        );
      case 'Realizada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
            <CheckCircle className="w-3 h-3 text-sky-400" />
            Realizada
          </span>
        );
      case 'Cancelada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 line-through">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
            Cancelada
          </span>
        );
      case 'Planejada':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-[#f5c33b] border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f5c33b]"></span>
            Planejada
          </span>
        );
    }
  }

  function getStatusIndicatorDot(status: StatusCronograma) {
    switch (status) {
      case 'Confirmada':
        return 'bg-emerald-400';
      case 'Realizada':
        return 'bg-sky-400';
      case 'Cancelada':
        return 'bg-red-400';
      case 'Planejada':
      default:
        return 'bg-[#f5c33b]';
    }
  }

  // Summary counts
  const statsTotal = aulas.length;
  const statsConfirmadas = aulas.filter(a => a.status === 'Confirmada').length;
  const statsRealizadas = aulas.filter(a => a.status === 'Realizada').length;
  const statsCanceladas = aulas.filter(a => a.status === 'Cancelada').length;

  return (
    <div className="w-full max-w-[1240px] mx-auto px-4 sm:px-6 pb-16">
      {/* Notifications */}
      {successMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-4 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-200 text-sm flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="p-1 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 pb-6 border-b border-[rgba(255,255,255,0.08)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#f5c33b]">
            <CalendarDays className="w-4 h-4" />
            <span>Planejamento Anual</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mt-1">
            Cronograma Anual de Treinamentos
          </h1>
          <p className="text-sm text-[#9dafb9] mt-1 max-w-[680px]">
            Planejamento interno das aulas e atividades do Centro de Treinamento Inspira.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Toggle */}
          <div className="p-1 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center">
            <button
              onClick={() => setViewMode('calendario')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'calendario'
                  ? 'bg-[#f5c33b] text-[#061018] shadow'
                  : 'text-[#9dafb9] hover:text-white'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Calendário</span>
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                viewMode === 'lista'
                  ? 'bg-[#f5c33b] text-[#061018] shadow'
                  : 'text-[#9dafb9] hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Lista</span>
            </button>
          </div>

          {/* Nova Aula Button (Admin / Secretaria) */}
          {canEdit && (
            <button
              onClick={() => handleOpenNovaAula()}
              className="btn-inspira-gold px-4 py-2 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg shadow-[#f5c33b]/10"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nova aula</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
          <span className="text-[11px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">
            Total de aulas
          </span>
          <span className="text-2xl font-black text-white">{statsTotal}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
            Confirmadas
          </span>
          <span className="text-2xl font-black text-emerald-300">{statsConfirmadas}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
          <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider block mb-1">
            Realizadas
          </span>
          <span className="text-2xl font-black text-sky-300">{statsRealizadas}</span>
        </div>
        <div className="p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
          <span className="text-[11px] font-bold text-red-400 uppercase tracking-wider block mb-1">
            Canceladas
          </span>
          <span className="text-2xl font-black text-red-300">{statsCanceladas}</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-[rgba(10,24,36,0.7)] border border-[rgba(255,255,255,0.08)] mb-6 backdrop-blur-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca text */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8fa2ad] absolute left-3 top-3.5" />
            <input
              type="text"
              placeholder="Buscar título, instrutor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white focus:outline-none focus:border-[#f5c33b] placeholder-[#6b7b85]"
            />
          </div>

          {/* Ano */}
          <div>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              aria-label="Filtrar por ano"
              className="w-full px-3 py-2 text-xs rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white focus:outline-none focus:border-[#f5c33b]"
            >
              {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                <option key={y} value={y} className="bg-[#091f2e] text-white">
                  Ano {y}
                </option>
              ))}
            </select>
          </div>

          {/* Mês (no modo lista permite ver todos os meses) */}
          <div>
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              aria-label="Filtrar por mês"
              className="w-full px-3 py-2 text-xs rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white focus:outline-none focus:border-[#f5c33b]"
            >
              {monthNames.map((name, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-[#091f2e] text-white">
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <select
              value={filterCategoria}
              onChange={(e) => setFilterCategoria(e.target.value)}
              aria-label="Filtrar por categoria"
              className="w-full px-3 py-2 text-xs rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white focus:outline-none focus:border-[#f5c33b]"
            >
              <option value="todas" className="bg-[#091f2e] text-white">
                Todas as categorias
              </option>
              {CATEGORIAS_PADRAO.map((cat) => (
                <option key={cat} value={cat} className="bg-[#091f2e] text-white">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filtrar por status"
              className="w-full px-3 py-2 text-xs rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white focus:outline-none focus:border-[#f5c33b]"
            >
              <option value="todos" className="bg-[#091f2e] text-white">
                Todos os status
              </option>
              <option value="Planejada" className="bg-[#091f2e] text-white">
                Planejada
              </option>
              <option value="Confirmada" className="bg-[#091f2e] text-white">
                Confirmada
              </option>
              <option value="Realizada" className="bg-[#091f2e] text-white">
                Realizada
              </option>
              <option value="Cancelada" className="bg-[#091f2e] text-white">
                Cancelada
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {viewMode === 'calendario' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Grid Container (8 cols on lg) */}
          <div className="lg:col-span-8 p-4 sm:p-6 rounded-3xl bg-[rgba(9,26,38,0.7)] border border-[rgba(255,255,255,0.08)] shadow-xl">
            {/* Calendar Month Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 sm:gap-3">
                <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                  {monthNames[currentMonth - 1]} de {currentYear}
                </h2>
                <span className="text-xs font-bold text-[#8fa2ad] hidden sm:inline">
                  ({aulas.length} {aulas.length === 1 ? 'aula' : 'aulas'})
                </span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={handleCurrentMonth}
                  className="px-2.5 py-1 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs font-bold text-[#8fa2ad] hover:text-white transition"
                >
                  Hoje
                </button>
                <button
                  onClick={handlePrevMonth}
                  aria-label="Mês anterior"
                  className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={handleNextMonth}
                  aria-label="Próximo mês"
                  className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-white hover:bg-[rgba(255,255,255,0.1)] transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#6b7b85] uppercase tracking-wider mb-2">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
              {calendarDays.map((cell, idx) => {
                const dayAulas = aulasByDate.get(cell.dateStr) || [];
                const hasAulas = dayAulas.length > 0;
                const isSelected = selectedDayString === cell.dateStr;
                const isToday =
                  cell.dateStr ===
                  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayString(cell.dateStr)}
                    className={`min-h-[85px] sm:min-h-[105px] p-1.5 sm:p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#f5c33b] bg-[rgba(245,195,59,0.08)] shadow-[0_0_15px_rgba(245,195,59,0.15)]'
                        : cell.isCurrentMonth
                        ? 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.04)]'
                        : 'border-transparent bg-transparent opacity-30 hover:opacity-60'
                    }`}
                  >
                    {/* Day number header */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-[#f5c33b] text-[#061018]'
                            : cell.isCurrentMonth
                            ? 'text-white'
                            : 'text-[#6b7b85]'
                        }`}
                      >
                        {cell.dayNumber}
                      </span>

                      {hasAulas && (
                        <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-[#f5c33b]/20 text-[#f5c33b]">
                          {dayAulas.length}
                        </span>
                      )}
                    </div>

                    {/* Miniature pills */}
                    <div className="mt-1 space-y-1 overflow-hidden">
                      {dayAulas.slice(0, 2).map((a) => (
                        <div
                          key={a.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDetalhes(a);
                          }}
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
                            a.status === 'Cancelada'
                              ? 'bg-red-950/40 text-red-300 line-through'
                              : a.status === 'Confirmada'
                              ? 'bg-emerald-950/50 text-emerald-200 border border-emerald-500/20'
                              : a.status === 'Realizada'
                              ? 'bg-sky-950/50 text-sky-200'
                              : 'bg-amber-950/40 text-[#f5c33b] border border-[#f5c33b]/20'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getStatusIndicatorDot(a.status)}`}></span>
                          <span className="truncate">{a.horaInicio} {a.titulo}</span>
                        </div>
                      ))}

                      {dayAulas.length > 2 && (
                        <span className="block text-[9px] text-[#8fa2ad] font-bold text-center">
                          +{dayAulas.length - 2} mais
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agenda of Selected Day (4 cols on lg) */}
          <div className="lg:col-span-4 p-5 sm:p-6 rounded-3xl bg-[rgba(9,26,38,0.7)] border border-[rgba(255,255,255,0.08)] shadow-xl flex flex-col">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#f5c33b] block">
                  Agenda do dia
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {formatDateBR(selectedDayString)}
                </h3>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleOpenNovaAula(selectedDayString)}
                  className="px-3 py-1.5 rounded-xl bg-[#f5c33b]/15 text-[#f5c33b] border border-[#f5c33b]/30 text-xs font-bold hover:bg-[#f5c33b]/25 transition flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Agendar</span>
                </button>
              )}
            </div>

            {selectedDayAulas.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-10 text-center text-[#8fa2ad]">
                <CalendarDays className="w-10 h-10 mb-3 opacity-30 text-[#f5c33b]" />
                <p className="text-sm font-bold text-white mb-1">Nenhum treinamento neste dia</p>
                <p className="text-xs max-w-[200px]">
                  {canEdit ? 'Clique em "Agendar" para marcar uma nova aula nesta data.' : 'Não há aulas programadas nesta data.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto max-h-[480px] pr-1">
                {selectedDayAulas.map((aula) => (
                  <div
                    key={aula.id}
                    className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)] transition space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#8fa2ad] block">
                          {aula.categoria}
                        </span>
                        <h4 className="text-sm font-extrabold text-white truncate group-hover:text-[#f5c33b] transition">
                          {aula.titulo}
                        </h4>
                      </div>
                      {getStatusBadge(aula.status)}
                    </div>

                    <div className="space-y-1 text-xs text-[#9dafb9]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#f5c33b]" />
                        <span>
                          {aula.horaInicio} {aula.horaFim ? `às ${aula.horaFim}` : ''}
                        </span>
                      </div>
                      {aula.local && (
                        <div className="flex items-center gap-2 truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#f5c33b] shrink-0" />
                          <span className="truncate">{aula.local}</span>
                        </div>
                      )}
                      {aula.instrutorResponsavelNome && (
                        <div className="flex items-center gap-2 truncate">
                          <User className="w-3.5 h-3.5 text-[#f5c33b] shrink-0" />
                          <span className="truncate">Instrutor: {aula.instrutorResponsavelNome}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick actions on card */}
                    <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-[rgba(255,255,255,0.05)]">
                      <button
                        onClick={() => handleOpenDetalhes(aula)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3 text-[#9dafb9]" />
                        <span>Ver</span>
                      </button>

                      {canEdit && (
                        <>
                          <button
                            onClick={() => handleOpenEdit(aula)}
                            className="p-1.5 rounded-lg text-xs font-bold text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition cursor-pointer"
                            title="Editar aula"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-[#f5c33b]" />
                          </button>
                          <button
                            onClick={() => handleOpenDuplicar(aula)}
                            className="p-1.5 rounded-lg text-xs font-bold text-white bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition cursor-pointer"
                            title="Duplicar para outra data"
                          >
                            <Copy className="w-3.5 h-3.5 text-sky-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Lista View (Chronological) */
        <div className="rounded-3xl bg-[rgba(9,26,38,0.7)] border border-[rgba(255,255,255,0.08)] shadow-xl overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <List className="w-5 h-5 text-[#f5c33b]" />
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                Lista Cronológica de Treinamentos ({aulas.length})
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-[#8fa2ad]">
              <div className="w-8 h-8 border-2 border-[#f5c33b] border-t-transparent rounded-full animate-spin mb-3"></div>
              <span className="text-sm font-bold">Carregando aulas do cronograma...</span>
            </div>
          ) : aulas.length === 0 ? (
            <div className="py-20 text-center text-[#8fa2ad]">
              <CalendarDays className="w-12 h-12 mx-auto mb-3 opacity-30 text-[#f5c33b]" />
              <h3 className="text-base font-bold text-white mb-1">Nenhuma aula encontrada</h3>
              <p className="text-xs max-w-sm mx-auto mb-4">
                Não há treinamentos correspondentes aos filtros selecionados.
              </p>
              {canEdit && (
                <button
                  onClick={() => handleOpenNovaAula()}
                  className="btn-inspira-gold px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar nova aula</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {aulas.map((aula) => (
                <div
                  key={aula.id}
                  className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-[rgba(255,255,255,0.02)] transition"
                >
                  {/* Date badge + basic info */}
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl bg-[rgba(245,195,59,0.08)] border border-[rgba(245,195,59,0.2)] flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-black uppercase text-[#f5c33b]">
                        {new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-xl font-black text-white leading-none">
                        {aula.data.split('-')[2]}
                      </span>
                      <span className="text-[9px] font-bold text-[#8fa2ad]">
                        {new Date(aula.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-[rgba(255,255,255,0.05)] text-[#f5c33b] border border-[rgba(255,255,255,0.08)]">
                          {aula.categoria}
                        </span>
                        {getStatusBadge(aula.status)}
                      </div>

                      <h3
                        onClick={() => handleOpenDetalhes(aula)}
                        className="text-base sm:text-lg font-extrabold text-white hover:text-[#f5c33b] cursor-pointer transition truncate"
                      >
                        {aula.titulo}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[#9dafb9]">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#f5c33b]" />
                          {aula.horaInicio} {aula.horaFim ? `às ${aula.horaFim}` : ''}
                        </span>
                        {aula.local && (
                          <span className="flex items-center gap-1.5 truncate max-w-[240px]">
                            <MapPin className="w-3.5 h-3.5 text-[#f5c33b] shrink-0" />
                            <span className="truncate">{aula.local}</span>
                          </span>
                        )}
                        {aula.instrutorResponsavelNome && (
                          <span className="flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-[#f5c33b]" />
                            {aula.instrutorResponsavelNome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
                    <button
                      onClick={() => handleOpenDetalhes(aula)}
                      className="px-3 py-1.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#9dafb9]" />
                      <span>Detalhes</span>
                    </button>

                    {canEdit && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(aula)}
                          className="px-3 py-1.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs font-bold text-[#f5c33b] hover:bg-[rgba(245,195,59,0.1)] transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

                        <button
                          onClick={() => handleOpenDuplicar(aula)}
                          className="px-3 py-1.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs font-bold text-sky-300 hover:bg-sky-500/10 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Duplicar</span>
                        </button>
                      </>
                    )}

                    {canDelete && (
                      <button
                        onClick={() => setConfirmDeleteId(aula.id)}
                        className="p-2 rounded-xl bg-red-950/20 border border-red-500/20 text-red-300 hover:bg-red-900/40 transition cursor-pointer"
                        title="Excluir aula (Administrador)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL: NOVA AULA ================= */}
      {showNovaModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#091f2e] border border-[rgba(255,255,255,0.12)] rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#f5c33b] block">
                  Novo Treinamento
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Agendar Aula no Cronograma
                </h3>
              </div>
              <button
                onClick={() => setShowNovaModal(false)}
                className="p-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-[#8fa2ad] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNovaAula} className="space-y-4">
              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Título da aula <span className="text-[#f5c33b]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Instrução de Sobrevivência na Selva e Abrigos"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              {/* Data & Horários */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Data <span className="text-[#f5c33b]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Início <span className="text-[#f5c33b]">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.horaInicio}
                    onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Término (opcional)
                  </label>
                  <input
                    type="time"
                    value={formData.horaFim}
                    onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
              </div>

              {/* Categoria & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Categoria <span className="text-[#f5c33b]">*</span>
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  >
                    {CATEGORIAS_PADRAO.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#091f2e] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formData.categoria === 'Outros' && (
                    <input
                      type="text"
                      placeholder="Especifique a categoria..."
                      value={formData.categoriaCustom}
                      onChange={(e) => setFormData({ ...formData, categoriaCustom: e.target.value })}
                      className="mt-2 w-full px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-xs focus:outline-none focus:border-[#f5c33b]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Status da aula
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusCronograma })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  >
                    <option value="Planejada" className="bg-[#091f2e] text-white">Planejada</option>
                    <option value="Confirmada" className="bg-[#091f2e] text-white">Confirmada</option>
                    <option value="Realizada" className="bg-[#091f2e] text-white">Realizada</option>
                    <option value="Cancelada" className="bg-[#091f2e] text-white">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Local & Instrutor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Local do Treinamento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Campo de Instrução / Pista de Obstáculos"
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Instrutor Responsável
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Instrutor Rodrigo / Coordenação"
                    value={formData.instrutorResponsavelNome}
                    onChange={(e) => setFormData({ ...formData, instrutorResponsavelNome: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Conteúdo / Descrição da aula
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalhamento do que será ministrado aos alunos..."
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              {/* Materiais Necessários */}
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Materiais e Equipamentos Necessários
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Cordas dinâmicas, mosquetões, kits de primeiros socorros..."
                  value={formData.materiais}
                  onChange={(e) => setFormData({ ...formData, materiais: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              {/* Observações Internas */}
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Observações Internas da Equipe
                </label>
                <textarea
                  rows={2}
                  placeholder="Anotações para a coordenação e equipe de instrução..."
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => setShowNovaModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-inspira-gold px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar no Cronograma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: EDITAR AULA ================= */}
      {showEditModal && selectedAula && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#091f2e] border border-[rgba(255,255,255,0.12)] rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#f5c33b] block">
                  Edição de Aula
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  Editar Treinamento #{selectedAula.id}
                </h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-[#8fa2ad] hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditAula} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Título da aula <span className="text-[#f5c33b]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              {/* Data & Horários (permite alterar data sem criar novo registro) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Data da aula <span className="text-[#f5c33b]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Horário Início <span className="text-[#f5c33b]">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formData.horaInicio}
                    onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Horário Término
                  </label>
                  <input
                    type="time"
                    value={formData.horaFim}
                    onChange={(e) => setFormData({ ...formData, horaFim: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
              </div>

              {/* Categoria & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Categoria <span className="text-[#f5c33b]">*</span>
                  </label>
                  <select
                    value={formData.categoria}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  >
                    {CATEGORIAS_PADRAO.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#091f2e] text-white">
                        {cat}
                      </option>
                    ))}
                  </select>
                  {formData.categoria === 'Outros' && (
                    <input
                      type="text"
                      placeholder="Especifique a categoria..."
                      value={formData.categoriaCustom}
                      onChange={(e) => setFormData({ ...formData, categoriaCustom: e.target.value })}
                      className="mt-2 w-full px-3 py-2 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-xs focus:outline-none focus:border-[#f5c33b]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusCronograma })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  >
                    <option value="Planejada" className="bg-[#091f2e] text-white">Planejada</option>
                    <option value="Confirmada" className="bg-[#091f2e] text-white">Confirmada</option>
                    <option value="Realizada" className="bg-[#091f2e] text-white">Realizada</option>
                    <option value="Cancelada" className="bg-[#091f2e] text-white">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Local & Instrutor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Local
                  </label>
                  <input
                    type="text"
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                    Instrutor Responsável
                  </label>
                  <input
                    type="text"
                    value={formData.instrutorResponsavelNome}
                    onChange={(e) => setFormData({ ...formData, instrutorResponsavelNome: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Conteúdo / Descrição da aula
                </label>
                <textarea
                  rows={2}
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              {/* Materiais */}
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Materiais Necessários
                </label>
                <textarea
                  rows={2}
                  value={formData.materiais}
                  onChange={(e) => setFormData({ ...formData, materiais: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Observações Internas
                </label>
                <textarea
                  rows={2}
                  value={formData.observacoes}
                  onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => setConfirmCancelId(selectedAula.id)}
                  className="px-3.5 py-2 rounded-xl bg-red-950/30 border border-red-500/30 text-xs font-bold text-red-300 hover:bg-red-900/40 transition cursor-pointer"
                >
                  Marcar como Cancelada
                </button>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-inspira-gold px-6 py-2 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DUPLICAR AULA ================= */}
      {showDuplicarModal && selectedAula && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-[#091f2e] border border-[rgba(255,255,255,0.12)] rounded-3xl p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-400 block">
                  Duplicar Treinamento
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Copiar Aula para Nova Data
                </h3>
              </div>
              <button
                onClick={() => setShowDuplicarModal(false)}
                className="p-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-[#8fa2ad] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] mb-5">
              <span className="text-[10px] font-black uppercase text-[#8fa2ad] block">
                Aula de Origem
              </span>
              <h4 className="text-sm font-extrabold text-white">{selectedAula.titulo}</h4>
              <p className="text-xs text-[#9dafb9] mt-0.5">
                Data original: {formatDateBR(selectedAula.data)} • {selectedAula.categoria}
              </p>
            </div>

            <form onSubmit={handleSubmitDuplicar} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Selecione a Nova Data <span className="text-[#f5c33b]">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={duplicateData.novaData}
                  onChange={(e) => setDuplicateData({ ...duplicateData, novaData: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">
                  Horário de Início (opcional)
                </label>
                <input
                  type="time"
                  value={duplicateData.novoHorario}
                  onChange={(e) => setDuplicateData({ ...duplicateData, novoHorario: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
                <span className="text-[11px] text-[#8fa2ad] mt-1 block">
                  Todos os conteúdos, descrição, local e materiais serão duplicados para a nova data.
                </span>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[rgba(255,255,255,0.08)]">
                <button
                  type="button"
                  onClick={() => setShowDuplicarModal(false)}
                  className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-sky-500 text-[#061018] text-sm font-black flex items-center gap-2 hover:bg-sky-400 transition cursor-pointer disabled:opacity-50"
                >
                  <Copy className="w-4 h-4" />
                  <span>{submitting ? 'Duplicando...' : 'Confirmar e Duplicar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETALHES DA AULA ================= */}
      {showDetalhesModal && selectedAula && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-[#091f2e] border border-[rgba(255,255,255,0.12)] rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-start justify-between pb-4 mb-5 border-b border-[rgba(255,255,255,0.08)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase bg-[rgba(255,255,255,0.05)] text-[#f5c33b] border border-[rgba(255,255,255,0.08)]">
                    {selectedAula.categoria}
                  </span>
                  {getStatusBadge(selectedAula.status)}
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  {selectedAula.titulo}
                </h3>
              </div>
              <button
                onClick={() => setShowDetalhesModal(false)}
                className="p-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-[#8fa2ad] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <span className="text-[10px] font-black uppercase text-[#8fa2ad] block mb-1">
                  Data do Treinamento
                </span>
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-[#f5c33b]" />
                  {formatDateBR(selectedAula.data)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <span className="text-[10px] font-black uppercase text-[#8fa2ad] block mb-1">
                  Horário
                </span>
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#f5c33b]" />
                  {selectedAula.horaInicio} {selectedAula.horaFim ? `às ${selectedAula.horaFim}` : ''}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)]">
                <span className="text-[10px] font-black uppercase text-[#8fa2ad] block mb-1">
                  Instrutor Responsável
                </span>
                <span className="text-sm font-extrabold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#f5c33b]" />
                  {selectedAula.instrutorResponsavelNome || 'A definir'}
                </span>
              </div>
            </div>

            {/* Details Content */}
            <div className="space-y-4 text-sm text-[#dce5ea]">
              {selectedAula.local && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#8fa2ad] mb-1">
                    Localização
                  </h4>
                  <p className="p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#f5c33b] shrink-0" />
                    <span>{selectedAula.local}</span>
                  </p>
                </div>
              )}

              {selectedAula.descricao && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#8fa2ad] mb-1">
                    Conteúdo Programático / Descrição
                  </h4>
                  <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] whitespace-pre-wrap leading-relaxed text-[#c6d4dc]">
                    {selectedAula.descricao}
                  </div>
                </div>
              )}

              {selectedAula.materiais && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#8fa2ad] mb-1">
                    Materiais & Equipamentos
                  </h4>
                  <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] whitespace-pre-wrap leading-relaxed text-[#c6d4dc]">
                    {selectedAula.materiais}
                  </div>
                </div>
              )}

              {selectedAula.observacoes && (
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-[#8fa2ad] mb-1">
                    Observações Internas da Coordenação
                  </h4>
                  <div className="p-3.5 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] whitespace-pre-wrap leading-relaxed text-[#f5c33b]/90">
                    {selectedAula.observacoes}
                  </div>
                </div>
              )}

              <div className="pt-2 text-[11px] text-[#6b7b85] flex flex-wrap items-center gap-3">
                <span>Criado por: {selectedAula.criadoPor}</span>
                {selectedAula.createdAt && (
                  <span>Cadastrado em: {new Date(selectedAula.createdAt).toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-5 mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.08)]">
              {canDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(selectedAula.id)}
                  className="px-3.5 py-2 rounded-xl bg-red-950/30 border border-red-500/30 text-xs font-bold text-red-300 hover:bg-red-900/40 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Excluir aula</span>
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                {canEdit && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setShowDetalhesModal(false);
                        handleOpenDuplicar(selectedAula);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] text-xs font-bold text-sky-300 hover:bg-sky-500/10 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Duplicar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowDetalhesModal(false);
                        handleOpenEdit(selectedAula);
                      }}
                      className="btn-inspira-gold px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setShowDetalhesModal(false)}
                  className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] text-xs font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMAR CANCELAMENTO ================= */}
      {confirmCancelId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#091f2e] border border-red-500/30 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">Cancelar Treinamento?</h3>
            <p className="text-xs text-[#9dafb9] leading-relaxed mb-6">
              A aula será marcada com o status <strong>"Cancelada"</strong>. O registro permanecerá no histórico do cronograma e poderá ser consultado a qualquer momento.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmCancelId(null)}
                className="px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-black transition cursor-pointer"
              >
                Sim, cancelar aula
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRMAR EXCLUSÃO (ADMIN ONLY) ================= */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-[#091f2e] border border-red-500/40 rounded-3xl p-6 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2">Excluir do Cronograma?</h3>
            <p className="text-xs text-[#9dafb9] leading-relaxed mb-6">
              Esta ação removerá a aula do planejamento ativo através de exclusão lógica segura, mantendo auditoria no banco. Apenas o Administrador Geral pode executar esta ação.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-black transition cursor-pointer"
              >
                Sim, excluir aula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
