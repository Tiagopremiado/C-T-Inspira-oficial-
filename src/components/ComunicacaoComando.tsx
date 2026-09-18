import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, Plus, Search, Filter, Calendar, User, Eye, Edit2, Trash2, 
  CheckCircle, AlertTriangle, X, Send, Users, Shield, Clock, BookOpen, AlertCircle,
  FileText, ArrowRight, UserCheck
} from 'lucide-react';
import { Comunicado, TipoComunicado, StatusComunicado, PreCadastro } from '../types.js';

interface ComunicacaoComandoProps {
  currentUserRole: string;
  currentUserId?: string;
  currentUserName?: string;
}

export const ComunicacaoComando: React.FC<ComunicacaoComandoProps> = ({
  currentUserRole,
  currentUserId,
  currentUserName
}) => {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [alunos, setAlunos] = useState<PreCadastro[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingComunicado, setEditingComunicado] = useState<Comunicado | null>(null);
  const [viewingComunicado, setViewingComunicado] = useState<Comunicado | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Comunicado | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'Geral' as TipoComunicado,
    alunoId: '' as string | number,
    status: 'Publicado' as StatusComunicado,
    observacaoInterna: ''
  });
  const [alunoSearchTerm, setAlunoSearchTerm] = useState('');

  const canCreate = currentUserRole === 'Administrador' || currentUserRole === 'Instrutor';
  const canDelete = currentUserRole === 'Administrador';

  useEffect(() => {
    loadComunicados();
    loadAlunos();
  }, []);

  const loadComunicados = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch('/api/comunicados', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComunicados(data.comunicados || []);
      }
    } catch (err) {
      console.error('Falha ao carregar comunicados:', err);
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
      console.error('Falha ao carregar alunos:', err);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingComunicado(null);
    setFormData({
      titulo: '',
      mensagem: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'Geral',
      alunoId: '',
      status: 'Publicado',
      observacaoInterna: ''
    });
    setAlunoSearchTerm('');
    setShowModal(true);
  };

  const handleOpenEditModal = (item: Comunicado) => {
    setEditingComunicado(item);
    setFormData({
      titulo: item.titulo,
      mensagem: item.mensagem,
      data: item.data || new Date().toISOString().split('T')[0],
      tipo: item.tipo,
      alunoId: item.alunoId ? String(item.alunoId) : '',
      status: item.status,
      observacaoInterna: item.observacaoInterna || ''
    });
    const foundAluno = alunos.find(a => a.id === item.alunoId);
    setAlunoSearchTerm(foundAluno ? foundAluno.nomeAluno : (item.alunoNome || ''));
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.mensagem.trim()) {
      setActionFeedback({ text: 'Preencha o título e a mensagem do comunicado.', type: 'error' });
      return;
    }

    if (formData.tipo === 'Individual' && !formData.alunoId) {
      setActionFeedback({ text: 'Selecione um aluno para comunicados do tipo Individual.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);

    const token = localStorage.getItem('inspira_auth_token');
    const selectedAlunoObj = alunos.find(a => String(a.id) === String(formData.alunoId));

    try {
      if (editingComunicado) {
        // Update
        const res = await fetch(`/api/comunicados/${editingComunicado.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            titulo: formData.titulo,
            mensagem: formData.mensagem,
            data: formData.data,
            tipo: formData.tipo,
            alunoId: formData.tipo === 'Individual' ? Number(formData.alunoId) : null,
            alunoNome: formData.tipo === 'Individual' ? (selectedAlunoObj?.nomeAluno || '') : null,
            status: formData.status,
            observacaoInterna: formData.observacaoInterna
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao atualizar comunicado');
        }

        setActionFeedback({ text: 'Comunicado atualizado com sucesso!', type: 'success' });
      } else {
        // Create
        const res = await fetch('/api/comunicados', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            titulo: formData.titulo,
            mensagem: formData.mensagem,
            data: formData.data,
            tipo: formData.tipo,
            alunoId: formData.tipo === 'Individual' ? Number(formData.alunoId) : null,
            alunoNome: formData.tipo === 'Individual' ? (selectedAlunoObj?.nomeAluno || '') : null,
            status: formData.status,
            observacaoInterna: formData.observacaoInterna
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao criar comunicado');
        }

        setActionFeedback({ text: 'Comunicado publicado com sucesso!', type: 'success' });
      }

      setShowModal(false);
      loadComunicados();
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Falha ao salvar comunicado', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setIsSubmitting(true);
    setActionFeedback(null);

    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/comunicados/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir comunicado');
      }

      setActionFeedback({ text: data.message || 'Comunicado excluído com sucesso!', type: 'success' });
      setDeleteConfirm(null);
      loadComunicados();
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Falha ao excluir comunicado', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered list
  const filteredComunicados = useMemo(() => {
    return comunicados.filter(item => {
      if (tipoFilter !== 'todos' && item.tipo !== tipoFilter) return false;
      if (statusFilter !== 'todos' && item.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.titulo.toLowerCase().includes(term);
        const matchesMsg = item.mensagem.toLowerCase().includes(term);
        const matchesAuthor = item.criadoPor.toLowerCase().includes(term);
        const matchesAluno = item.alunoNome ? item.alunoNome.toLowerCase().includes(term) : false;
        return matchesTitle || matchesMsg || matchesAuthor || matchesAluno;
      }
      return true;
    });
  }, [comunicados, tipoFilter, statusFilter, searchTerm]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: comunicados.length,
      geral: comunicados.filter(c => c.tipo === 'Geral').length,
      alunos: comunicados.filter(c => c.tipo === 'Alunos').length,
      responsaveis: comunicados.filter(c => c.tipo === 'Responsáveis').length,
      individuais: comunicados.filter(c => c.tipo === 'Individual').length
    };
  }, [comunicados]);

  const filteredAlunosList = useMemo(() => {
    if (!alunoSearchTerm.trim()) return alunos.slice(0, 10);
    const term = alunoSearchTerm.toLowerCase();
    return alunos.filter(a => 
      a.nomeAluno.toLowerCase().includes(term) || 
      (a.cidadeAluno && a.cidadeAluno.toLowerCase().includes(term))
    ).slice(0, 10);
  }, [alunos, alunoSearchTerm]);

  const getTipoBadge = (tipo: TipoComunicado) => {
    switch (tipo) {
      case 'Geral':
        return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
      case 'Alunos':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Responsáveis':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
      case 'Individual':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-gray-500/15 text-gray-300 border-gray-500/30';
    }
  };

  const getStatusBadge = (status: StatusComunicado) => {
    switch (status) {
      case 'Publicado':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'Rascunho':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'Arquivado':
        return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/15 text-gray-300 border-gray-500/30';
    }
  };

  const formatDisplayDate = (d: string) => {
    if (!d) return '--/--/----';
    const parts = d.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };

  return (
    <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Comando Geral</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#f5c33b]/10 text-[#f5c33b] border border-[#f5c33b]/20 font-bold">Módulo 8</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 mb-1.5 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-[#f5c33b]" />
            Comunicação
          </h1>
          <p className="text-[#9dafb9] text-sm max-w-[700px] leading-relaxed">
            Central de comunicados institucionais, avisos para alunos, informativos para responsáveis e comunicados individuais.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreateModal}
            className="btn-inspira-gold px-5 py-3 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shadow-lg hover:shadow-[#f5c33b]/20 transition shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo comunicado</span>
          </button>
        )}
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm flex items-center justify-between border animate-in fade-in duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/50 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionFeedback.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="font-semibold">{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs font-bold hover:underline ml-4 px-2 py-1 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition"
          >
            ✕ Fechar
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-6">
        <div className="p-4 rounded-2xl bg-[#0b1721] border border-[#1a2e3d]">
          <span className="text-[11px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Total</span>
          <span className="text-2xl font-black text-white">{stats.total}</span>
          <span className="text-[11px] text-[#6b7b85] block mt-0.5">comunicados</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b1721] border border-[#1a2e3d]">
          <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider block mb-1">Gerais</span>
          <span className="text-2xl font-black text-blue-300">{stats.geral}</span>
          <span className="text-[11px] text-[#6b7b85] block mt-0.5">todos os públicos</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b1721] border border-[#1a2e3d]">
          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block mb-1">Alunos</span>
          <span className="text-2xl font-black text-amber-300">{stats.alunos}</span>
          <span className="text-[11px] text-[#6b7b85] block mt-0.5">direcionados à turma</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b1721] border border-[#1a2e3d]">
          <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider block mb-1">Responsáveis</span>
          <span className="text-2xl font-black text-purple-300">{stats.responsaveis}</span>
          <span className="text-[11px] text-[#6b7b85] block mt-0.5">pais e tutores</span>
        </div>
        <div className="p-4 rounded-2xl bg-[#0b1721] border border-[#1a2e3d] col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Individuais</span>
          <span className="text-2xl font-black text-emerald-300">{stats.individuais}</span>
          <span className="text-[11px] text-[#6b7b85] block mt-0.5">aluno específico</span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="p-4 rounded-2xl bg-[#0b1721] border border-[#1a2e3d] mb-6 flex flex-col md:flex-row gap-3.5 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8fa2ad] absolute left-3.5 top-3.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título, mensagem, autor ou aluno..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none focus:border-[#f5c33b] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8fa2ad] font-bold hidden sm:inline">Público:</span>
            <select
              value={tipoFilter}
              onChange={(e) => setTipoFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none focus:border-[#f5c33b] cursor-pointer"
            >
              <option value="todos">Todos os públicos</option>
              <option value="Geral">Geral</option>
              <option value="Alunos">Alunos</option>
              <option value="Responsáveis">Responsáveis</option>
              <option value="Individual">Individual</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8fa2ad] font-bold hidden sm:inline">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.08)] text-white text-sm focus:outline-none focus:border-[#f5c33b] cursor-pointer"
            >
              <option value="todos">Todos os status</option>
              <option value="Publicado">Publicado</option>
              <option value="Rascunho">Rascunho</option>
              <option value="Arquivado">Arquivado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Communicados List */}
      <div className="rounded-2xl bg-[#0b1721] border border-[#1a2e3d] overflow-hidden shadow-xl">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-3 border-[#f5c33b] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-[#8fa2ad] text-sm">Carregando comunicados...</p>
          </div>
        ) : filteredComunicados.length === 0 ? (
          <div className="py-16 text-center px-4">
            <div className="w-14 h-14 rounded-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center mx-auto mb-4 text-[#8fa2ad]">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Nenhum comunicado encontrado</h3>
            <p className="text-[#8fa2ad] text-sm max-w-[460px] mx-auto mb-5">
              {searchTerm || tipoFilter !== 'todos' || statusFilter !== 'todos'
                ? 'Nenhum resultado corresponde aos filtros aplicados. Tente ajustar os termos de busca.'
                : 'Ainda não há comunicados cadastrados no sistema. Clique abaixo para registrar o primeiro.'}
            </p>
            {canCreate && (
              <button
                onClick={handleOpenCreateModal}
                className="btn-inspira-gold px-4 py-2 rounded-xl text-xs font-black inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Novo comunicado</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1a2e3d] bg-[rgba(255,255,255,0.015)] text-[11px] font-bold uppercase tracking-wider text-[#8fa2ad]">
                  <th className="py-3.5 px-4 sm:px-6">Título e Resumo</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4">Criado por</th>
                  <th className="py-3.5 px-4">Público</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2e3d]/60 text-sm">
                {filteredComunicados.map((item) => {
                  const canEdit = currentUserRole === 'Administrador' || 
                    (currentUserRole === 'Instrutor' && (item.criadorId === currentUserId || item.criadoPor === currentUserName));
                  
                  return (
                    <tr key={item.id} className="hover:bg-[rgba(255,255,255,0.02)] transition">
                      <td className="py-4 px-4 sm:px-6 max-w-[320px]">
                        <div className="font-extrabold text-white text-[15px] mb-1 leading-snug line-clamp-1">
                          {item.titulo}
                        </div>
                        <p className="text-[#8fa2ad] text-xs line-clamp-2 leading-relaxed">
                          {item.mensagem}
                        </p>
                        {item.observacaoInterna && (
                          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-amber-300/80 font-medium">
                            <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                            <span className="truncate">Obs interna: {item.observacaoInterna}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-[#c3d1db] text-xs font-semibold">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#8fa2ad]" />
                          <span>{formatDisplayDate(item.data)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap text-[#c3d1db] text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#8fa2ad]" />
                          <span>{item.criadoPor}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${getTipoBadge(item.tipo)}`}>
                          {item.tipo}
                        </span>
                        {item.tipo === 'Individual' && item.alunoNome && (
                          <div className="text-[11px] text-emerald-300 font-bold mt-1 flex items-center gap-1">
                            <UserCheck className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{item.alunoNome}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getStatusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingComunicado(item)}
                            title="Visualizar comunicado completo"
                            className="p-2 rounded-lg bg-[rgba(255,255,255,0.04)] text-white hover:bg-[rgba(255,255,255,0.1)] transition"
                          >
                            <Eye className="w-4 h-4 text-sky-400" />
                          </button>

                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              title="Editar comunicado"
                              className="p-2 rounded-lg bg-[rgba(255,255,255,0.04)] text-white hover:bg-[rgba(255,255,255,0.1)] transition"
                            >
                              <Edit2 className="w-4 h-4 text-amber-400" />
                            </button>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => setDeleteConfirm(item)}
                              title="Excluir comunicado"
                              className="p-2 rounded-lg bg-red-950/20 text-red-300 hover:bg-red-900/40 border border-red-500/20 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Criar / Editar Comunicado */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-[#08141e] border border-[#1a2e3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-[#0b1721]">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-[#f5c33b]/10 text-[#f5c33b] border border-[#f5c33b]/20">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white">
                    {editingComunicado ? 'Editar Comunicado' : 'Novo Comunicado'}
                  </h3>
                  <p className="text-xs text-[#8fa2ad]">
                    {editingComunicado ? 'Atualize as informações do aviso' : 'Preencha os dados do aviso ou comunicação'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] text-[#9dafb9] hover:bg-[rgba(255,255,255,0.1)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
                  Título do Comunicado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Alteração de horário do treinamento"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              {/* Data & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
                    Status da Publicação
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StatusComunicado })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b] cursor-pointer"
                  >
                    <option value="Publicado">Publicado (Ativo)</option>
                    <option value="Rascunho">Rascunho (Interno)</option>
                    <option value="Arquivado">Arquivado</option>
                  </select>
                </div>
              </div>

              {/* Tipo de Comunicado */}
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
                  Público Alvo (Tipo) *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['Geral', 'Alunos', 'Responsáveis', 'Individual'] as TipoComunicado[]).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setFormData({ ...formData, tipo: t })}
                      className={`px-3 py-2.5 rounded-xl text-xs font-extrabold border transition cursor-pointer text-center ${
                        formData.tipo === t
                          ? 'bg-[#f5c33b] text-[#061018] border-[#f5c33b] shadow-md shadow-[#f5c33b]/20'
                          : 'bg-[#061018] text-[#8fa2ad] border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.03)] hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Seleção de Aluno (quando for Individual) */}
              {formData.tipo === 'Individual' && (
                <div className="p-4 rounded-xl bg-[#061018] border border-emerald-500/30 animate-in fade-in duration-200">
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4" />
                    Selecionar Aluno Específico *
                  </label>
                  
                  {/* Selected Aluno display */}
                  {formData.alunoId && (
                    <div className="mb-2.5 p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-emerald-300 font-bold block">
                          {alunos.find(a => String(a.id) === String(formData.alunoId))?.nomeAluno || 'Aluno selecionado'}
                        </span>
                        <span className="text-[11px] text-emerald-400/80">
                          {alunos.find(a => String(a.id) === String(formData.alunoId))?.cidadeAluno} • ID #{formData.alunoId}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, alunoId: '' })}
                        className="text-xs text-red-300 hover:underline px-2 py-1"
                      >
                        Trocar
                      </button>
                    </div>
                  )}

                  {!formData.alunoId && (
                    <>
                      <input
                        type="text"
                        placeholder="Buscar aluno pelo nome..."
                        value={alunoSearchTerm}
                        onChange={(e) => setAlunoSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 mb-2 rounded-lg bg-[#0b1721] border border-[rgba(255,255,255,0.1)] text-white text-xs focus:outline-none focus:border-emerald-400"
                      />
                      <div className="max-h-36 overflow-y-auto space-y-1 divide-y divide-white/5 border border-white/5 rounded-lg p-1 bg-[#0b1721]">
                        {filteredAlunosList.map((aluno) => (
                          <div
                            key={aluno.id}
                            onClick={() => {
                              setFormData({ ...formData, alunoId: aluno.id });
                              setAlunoSearchTerm(aluno.nomeAluno);
                            }}
                            className="p-2 text-xs rounded hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer flex justify-between items-center transition"
                          >
                            <span className="font-bold text-white">{aluno.nomeAluno}</span>
                            <span className="text-[10px] text-[#8fa2ad]">{aluno.cidadeAluno || 'Sem cidade'}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mensagem */}
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1.5">
                  Mensagem / Conteúdo do Comunicado *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Ex: O treinamento deste sábado iniciará pontualmente às 8h no campo de instruções. Favor trazer uniforme completo e hidratação."
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.1)] text-white text-sm focus:outline-none focus:border-[#f5c33b] resize-none leading-relaxed"
                />
              </div>

              {/* Observação Interna */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-[#8fa2ad] uppercase tracking-wider flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    Observação Interna da Equipe (Opcional)
                  </label>
                  <span className="text-[10px] text-[#6b7b85]">Visível apenas no Comando</span>
                </div>
                <input
                  type="text"
                  placeholder="Ex: Alinhado na reunião pedagógica de sexta-feira"
                  value={formData.observacaoInterna}
                  onChange={(e) => setFormData({ ...formData, observacaoInterna: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.08)] text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-sm font-bold text-[#8fa2ad] hover:text-white hover:bg-[rgba(255,255,255,0.08)] transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-inspira-gold px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Salvando...' : editingComunicado ? 'Salvar Alterações' : 'Publicar Comunicado'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Comunicado */}
      {viewingComunicado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#08141e] border border-[#1a2e3d] rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-start bg-[#0b1721]">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${getTipoBadge(viewingComunicado.tipo)}`}>
                    {viewingComunicado.tipo}
                  </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(viewingComunicado.status)}`}>
                    {viewingComunicado.status}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-white leading-snug">
                  {viewingComunicado.titulo}
                </h3>
              </div>
              <button
                onClick={() => setViewingComunicado(null)}
                className="p-2 rounded-full bg-[rgba(255,255,255,0.05)] text-[#9dafb9] hover:bg-[rgba(255,255,255,0.1)] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Metadados */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.05)] text-xs">
                <div>
                  <span className="text-[#6b7b85] block font-bold mb-0.5">Data do Comunicado:</span>
                  <span className="text-white font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#f5c33b]" />
                    {formatDisplayDate(viewingComunicado.data)}
                  </span>
                </div>
                <div>
                  <span className="text-[#6b7b85] block font-bold mb-0.5">Registrado por:</span>
                  <span className="text-white font-semibold flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#f5c33b]" />
                    {viewingComunicado.criadoPor}
                  </span>
                </div>
                {viewingComunicado.tipo === 'Individual' && viewingComunicado.alunoNome && (
                  <div className="col-span-2 pt-1 border-t border-white/5">
                    <span className="text-[#6b7b85] block font-bold mb-0.5">Aluno Destinatário:</span>
                    <span className="text-emerald-300 font-bold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      {viewingComunicado.alunoNome}
                    </span>
                  </div>
                )}
              </div>

              {/* Conteúdo */}
              <div>
                <span className="text-[11px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-2">
                  Mensagem Oficial
                </span>
                <div className="p-4 rounded-xl bg-[#0b1721] border border-[#1a2e3d] text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {viewingComunicado.mensagem}
                </div>
              </div>

              {/* Observação interna */}
              {viewingComunicado.observacaoInterna && (
                <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs">
                  <span className="text-amber-400 font-bold flex items-center gap-1 mb-1">
                    <Shield className="w-3.5 h-3.5" />
                    Observação Interna do Comando
                  </span>
                  <p className="text-amber-200/90 leading-relaxed">
                    {viewingComunicado.observacaoInterna}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setViewingComunicado(null)}
                  className="px-5 py-2.5 rounded-xl bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-white text-xs font-bold transition"
                >
                  Fechar Visualização
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#08141e] border border-red-500/30 rounded-2xl shadow-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-red-950/50 border border-red-500/40 flex items-center justify-center mx-auto mb-4 text-red-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white text-center mb-2">
              Confirmar Exclusão do Comunicado
            </h3>
            <p className="text-[#8fa2ad] text-xs text-center leading-relaxed mb-6">
              Tem certeza que deseja apagar o comunicado <strong className="text-white">"{deleteConfirm.titulo}"</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] text-xs font-bold text-[#8fa2ad] hover:text-white transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold shadow-lg shadow-red-900/30 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
