import React, { useState, useEffect, useMemo } from 'react';
import { 
  MessageSquare, Plus, Calendar, User, Eye, Edit2, Trash2, CheckCircle, 
  AlertTriangle, X, Send, Shield, Search, UserCheck, Filter, Clock
} from 'lucide-react';
import { Comunicado, TipoComunicado, StatusComunicado } from '../types.js';

interface ComunicacoesAlunoProps {
  alunoId: number;
  nomeAluno: string;
  currentUser?: {
    id?: string;
    username?: string;
    role?: string;
    nome?: string;
  };
}

export const ComunicacoesAluno: React.FC<ComunicacoesAlunoProps> = ({
  alunoId,
  nomeAluno,
  currentUser
}) => {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'individuais' | 'gerais'>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingComunicado, setEditingComunicado] = useState<Comunicado | null>(null);
  const [viewingComunicado, setViewingComunicado] = useState<Comunicado | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Comunicado | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    titulo: '',
    mensagem: '',
    data: new Date().toISOString().split('T')[0],
    tipo: 'Individual' as TipoComunicado,
    status: 'Publicado' as StatusComunicado,
    observacaoInterna: ''
  });

  const currentUserRole = currentUser?.role || 'Instrutor';
  const canCreate = currentUserRole === 'Administrador' || currentUserRole === 'Instrutor';
  const canDelete = currentUserRole === 'Administrador';

  useEffect(() => {
    loadAlunoComunicados();
  }, [alunoId]);

  const loadAlunoComunicados = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/alunos/${alunoId}/comunicados`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setComunicados(data.comunicados || []);
      }
    } catch (err) {
      console.error('Erro ao carregar comunicados do aluno:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingComunicado(null);
    setFormData({
      titulo: '',
      mensagem: '',
      data: new Date().toISOString().split('T')[0],
      tipo: 'Individual',
      status: 'Publicado',
      observacaoInterna: ''
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (item: Comunicado) => {
    setEditingComunicado(item);
    setFormData({
      titulo: item.titulo,
      mensagem: item.mensagem,
      data: item.data || new Date().toISOString().split('T')[0],
      tipo: item.tipo,
      status: item.status,
      observacaoInterna: item.observacaoInterna || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.titulo.trim() || !formData.mensagem.trim()) {
      setActionFeedback({ text: 'Preencha o título e a mensagem.', type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);
    const token = localStorage.getItem('inspira_auth_token');

    try {
      if (editingComunicado) {
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
            alunoId: formData.tipo === 'Individual' ? alunoId : null,
            alunoNome: formData.tipo === 'Individual' ? nomeAluno : null,
            status: formData.status,
            observacaoInterna: formData.observacaoInterna
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Erro ao atualizar comunicado');
        setActionFeedback({ text: 'Comunicado atualizado com sucesso!', type: 'success' });
      } else {
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
            alunoId: formData.tipo === 'Individual' ? alunoId : null,
            alunoNome: formData.tipo === 'Individual' ? nomeAluno : null,
            status: formData.status,
            observacaoInterna: formData.observacaoInterna
          })
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Erro ao criar comunicado');
        setActionFeedback({ text: 'Comunicado registrado com sucesso!', type: 'success' });
      }

      setShowModal(false);
      loadAlunoComunicados();
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Falha ao salvar comunicado.', type: 'error' });
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
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir comunicado');

      setActionFeedback({ text: 'Comunicado removido com sucesso!', type: 'success' });
      setDeleteConfirm(null);
      loadAlunoComunicados();
    } catch (err: any) {
      setActionFeedback({ text: err.message || 'Falha ao excluir comunicado.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredList = useMemo(() => {
    return comunicados.filter(item => {
      if (filtroTipo === 'individuais' && item.tipo !== 'Individual') return false;
      if (filtroTipo === 'gerais' && item.tipo === 'Individual') return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return item.titulo.toLowerCase().includes(term) ||
               item.mensagem.toLowerCase().includes(term) ||
               item.criadoPor.toLowerCase().includes(term);
      }
      return true;
    });
  }, [comunicados, filtroTipo, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: comunicados.length,
      individuais: comunicados.filter(c => c.tipo === 'Individual').length,
      gerais: comunicados.filter(c => c.tipo !== 'Individual').length
    };
  }, [comunicados]);

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

  const formatDisplayDate = (d: string) => {
    if (!d) return '--/--/----';
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Action */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0b1721] border border-[#1a2e3d] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-[#f5c33b]" />
            <h3 className="text-base sm:text-lg font-black text-white">
              Comunicações e Avisos do Aluno
            </h3>
          </div>
          <p className="text-xs text-[#8fa2ad]">
            Histórico completo de avisos direcionados especificamente a <strong>{nomeAluno}</strong> e comunicados gerais de turma.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={handleOpenCreateModal}
            className="btn-inspira-gold px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>+ Novo comunicado para o aluno</span>
          </button>
        )}
      </div>

      {/* Action Feedback */}
      {actionFeedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in duration-200 ${
            actionFeedback.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/50 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span className="font-semibold">{actionFeedback.text}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-[11px] font-bold hover:underline px-2 py-0.5 rounded bg-white/5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Stats and Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <span className="text-xs text-[#8fa2ad] font-bold">Total Relacionados:</span>
          <span className="text-lg font-black text-white">{stats.total}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#061018] border border-emerald-500/20 flex items-center justify-between">
          <span className="text-xs text-emerald-300 font-bold">Exclusivos deste Aluno:</span>
          <span className="text-lg font-black text-emerald-300">{stats.individuais}</span>
        </div>
        <div className="p-3.5 rounded-xl bg-[#061018] border border-blue-500/20 flex items-center justify-between">
          <span className="text-xs text-blue-300 font-bold">Gerais / Turma:</span>
          <span className="text-lg font-black text-blue-300">{stats.gerais}</span>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.08)] p-1">
          <button
            onClick={() => setFiltroTipo('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filtroTipo === 'todos' ? 'bg-[#f5c33b] text-[#061018]' : 'text-[#8fa2ad] hover:text-white'
            }`}
          >
            Todos ({stats.total})
          </button>
          <button
            onClick={() => setFiltroTipo('individuais')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filtroTipo === 'individuais' ? 'bg-emerald-500 text-white' : 'text-[#8fa2ad] hover:text-white'
            }`}
          >
            Exclusivos ({stats.individuais})
          </button>
          <button
            onClick={() => setFiltroTipo('gerais')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filtroTipo === 'gerais' ? 'bg-blue-500 text-white' : 'text-[#8fa2ad] hover:text-white'
            }`}
          >
            Gerais / Turma ({stats.gerais})
          </button>
        </div>

        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-[#8fa2ad] absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar nos comunicados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#061018] border border-[rgba(255,255,255,0.08)] text-white text-xs focus:outline-none focus:border-[#f5c33b]"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="w-7 h-7 border-3 border-[#f5c33b] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#8fa2ad]">Carregando comunicados...</p>
        </div>
      ) : filteredList.length === 0 ? (
        <div className="py-12 text-center p-6 rounded-2xl bg-[#061018] border border-[rgba(255,255,255,0.06)]">
          <MessageSquare className="w-8 h-8 text-[#8fa2ad]/40 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-white mb-1">Nenhum comunicado encontrado</h4>
          <p className="text-xs text-[#8fa2ad] max-w-sm mx-auto mb-4">
            {searchTerm || filtroTipo !== 'todos'
              ? 'Nenhum comunicado com os filtros atuais.'
              : `Nenhum comunicado registrado para ${nomeAluno} até o momento.`}
          </p>
          {canCreate && (
            <button
              onClick={handleOpenCreateModal}
              className="btn-inspira-gold px-3.5 py-1.5 rounded-lg text-xs font-black inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar comunicado</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredList.map((item) => {
            const isIndividual = item.tipo === 'Individual';
            const canEdit = currentUserRole === 'Administrador' || 
              (currentUserRole === 'Instrutor' && (item.criadorId === currentUser?.id || item.criadoPor === (currentUser?.nome || currentUser?.username)));

            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition ${
                  isIndividual
                    ? 'bg-emerald-950/15 border-emerald-500/25 hover:border-emerald-500/40'
                    : 'bg-[#061018] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                }`}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${getTipoBadge(item.tipo)}`}>
                      {item.tipo}
                    </span>
                    <span className="text-xs font-extrabold text-white">
                      {item.titulo}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-[#8fa2ad]">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3 h-3 text-[#f5c33b]" />
                      {formatDisplayDate(item.data)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <User className="w-3 h-3" />
                      {item.criadoPor}
                    </span>

                    <div className="flex items-center gap-1 pl-2 border-l border-white/10">
                      <button
                        onClick={() => setViewingComunicado(item)}
                        title="Visualizar comunicado"
                        className="p-1 rounded hover:bg-white/10 text-sky-400 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          title="Editar comunicado"
                          className="p-1 rounded hover:bg-white/10 text-amber-400 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteConfirm(item)}
                          title="Excluir comunicado"
                          className="p-1 rounded hover:bg-red-500/20 text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-[#c3d1db] leading-relaxed whitespace-pre-wrap">
                  {item.mensagem}
                </p>

                {item.observacaoInterna && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
                    <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="font-semibold">Obs interna:</span>
                    <span className="text-amber-200/90 truncate">{item.observacaoInterna}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Criar / Editar */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#08141e] border border-[#1a2e3d] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-[#0b1721]">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-[#f5c33b]" />
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingComunicado ? 'Editar Comunicado' : 'Novo Comunicado para o Aluno'}
                  </h3>
                  <span className="text-[11px] text-emerald-400 font-bold">
                    Destinatário: {nomeAluno}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-full bg-white/5 text-[#9dafb9] hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                  Título do Comunicado *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Reforço de equipamento e horário especial"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#061018] border border-white/10 text-white text-xs focus:outline-none focus:border-[#f5c33b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-[#061018] border border-white/10 text-white text-xs focus:outline-none focus:border-[#f5c33b]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                    Tipo de Destino
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoComunicado })}
                    className="w-full px-3 py-2 rounded-xl bg-[#061018] border border-white/10 text-white text-xs focus:outline-none focus:border-[#f5c33b]"
                  >
                    <option value="Individual">Individual (Apenas {nomeAluno})</option>
                    <option value="Alunos">Alunos (Toda a turma)</option>
                    <option value="Responsáveis">Responsáveis (Todos os pais)</option>
                    <option value="Geral">Geral (Todos os públicos)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase tracking-wider mb-1">
                  Mensagem *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Digite o conteúdo detalhado do comunicado..."
                  value={formData.mensagem}
                  onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#061018] border border-white/10 text-white text-xs focus:outline-none focus:border-[#f5c33b] resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" />
                  Observação Interna (Opcional - Visível apenas para instrutores)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Aluno solicitou via WhatsApp com atestado"
                  value={formData.observacaoInterna}
                  onChange={(e) => setFormData({ ...formData, observacaoInterna: e.target.value })}
                  className="w-full px-3 py-1.5 rounded-xl bg-[#061018] border border-white/10 text-white text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/10 text-xs font-bold text-[#8fa2ad] hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-inspira-gold px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Salvando...' : editingComunicado ? 'Salvar Alterações' : 'Publicar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Visualizar Detalhes */}
      {viewingComunicado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-[#08141e] border border-[#1a2e3d] rounded-2xl shadow-2xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border mb-2 ${getTipoBadge(viewingComunicado.tipo)}`}>
                  {viewingComunicado.tipo}
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  {viewingComunicado.titulo}
                </h3>
              </div>
              <button
                onClick={() => setViewingComunicado(null)}
                className="p-1 rounded-full bg-white/5 text-[#9dafb9] hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#8fa2ad] mb-4 pb-3 border-b border-white/5">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#f5c33b]" />
                {formatDisplayDate(viewingComunicado.data)}
              </span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {viewingComunicado.criadoPor}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#061018] border border-white/5 text-xs text-white leading-relaxed mb-4 whitespace-pre-wrap">
              {viewingComunicado.mensagem}
            </div>

            {viewingComunicado.observacaoInterna && (
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-300 mb-4">
                <span className="font-bold block mb-0.5">Observação Interna da Equipe:</span>
                <p className="text-amber-200/80">{viewingComunicado.observacaoInterna}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={() => setViewingComunicado(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Excluir */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#08141e] border border-red-500/30 rounded-2xl p-5 text-center">
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-3" />
            <h4 className="text-base font-bold text-white mb-1">Excluir Comunicado</h4>
            <p className="text-xs text-[#8fa2ad] mb-5">
              Confirmar exclusão de "{deleteConfirm.titulo}"?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-xs font-bold text-[#8fa2ad] hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg"
              >
                {isSubmitting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
