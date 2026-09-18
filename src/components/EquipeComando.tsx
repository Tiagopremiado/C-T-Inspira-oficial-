import React, { useState, useEffect } from 'react';
import { UserPlus, Shield, Edit, Ban, CheckCircle, Search, Save, X, Eye, Trash2, AlertTriangle } from 'lucide-react';

interface User {
  id: string;
  email: string;
  nome_completo: string;
  funcao: string;
  status: string;
  whatsapp: string;
  login?: string;
  foto?: string;
  criado_em: string;
  ultimo_acesso: string;
}

interface EquipeComandoProps {
  currentUserRole: string;
}

export const EquipeComando: React.FC<EquipeComandoProps> = ({ currentUserRole }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    nome_completo: '',
    email: '',
    whatsapp: '',
    login: '',
    foto: '',
    status: 'Ativo',
    funcao: 'Administrador',
    password: '',
    confirmPassword: ''
  });
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch('/api/equipe', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Erro ao carregar equipe:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user?: User) => {
    setFormError('');
    if (user) {
      setEditingUser(user);
      setFormData({
        nome_completo: user.nome_completo,
        email: user.email,
        whatsapp: user.whatsapp,
        funcao: user.funcao,
        login: user.login || '',
        foto: user.foto || '',
        status: user.status || 'Ativo',
        password: '',
        confirmPassword: ''
      });
    } else {
      setEditingUser(null);
      setFormData({
        nome_completo: '',
        email: '',
        whatsapp: '',
        funcao: 'Administrador',
        login: '',
        foto: '',
        status: 'Ativo',
        password: '',
        confirmPassword: ''
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.nome_completo || !formData.email) {
      setFormError('Nome e email são obrigatórios.');
      return;
    }
    
    if (!editingUser && !formData.password) {
      setFormError('Senha é obrigatória para novos usuários.');
      return;
    }
    
    if (formData.password && formData.password !== formData.confirmPassword) {
      setFormError('As senhas não coincidem.');
      return;
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const url = editingUser ? `/api/equipe/${editingUser.id}` : '/api/equipe';
      const method = editingUser ? 'PATCH' : 'POST';
      
      const payload: any = { ...formData };
      if (!payload.password) delete payload.password;
      delete payload.confirmPassword;

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar usuário.');
      
      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  
  const handleDelete = async (user: User) => {
    setActionMessage(null);
    setConfirmDialog({
      isOpen: true,
      title: 'Confirmar Exclusão',
      message: `Tem certeza que deseja APAGAR o usuário ${user.nome_completo}? Esta ação é irreversível.`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('inspira_auth_token');
          const res = await fetch(`/api/equipe/${user.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || 'Erro ao remover usuário');
          }
          setActionMessage({
            text: data.message || `Usuário ${user.nome_completo} excluído com sucesso!`,
            type: 'success'
          });
          loadUsers();
          setConfirmDialog(null);
        } catch (err: any) {
          setActionMessage({
            text: err.message || 'Erro ao remover usuário.',
            type: 'error'
          });
          setConfirmDialog(null);
        }
      }
    });
  };

  const handleToggleStatus = async (user: User) => {
    setActionMessage(null);
    const actionName = user.status === 'Ativo' ? 'BLOQUEAR' : 'ATIVAR';
    setConfirmDialog({
      isOpen: true,
      title: `Confirmar ${actionName}`,
      message: `Tem certeza que deseja ${actionName.toLowerCase()} o usuário ${user.nome_completo}?`,
      onConfirm: async () => {
        try {
          const token = localStorage.getItem('inspira_auth_token');
          const res = await fetch(`/api/equipe/${user.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ status: user.status === 'Ativo' ? 'Bloqueado' : 'Ativo' })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(data.error || 'Erro desconhecido ao bloquear/ativar');
          }
          setActionMessage({
            text: `Usuário ${user.nome_completo} ${user.status === 'Ativo' ? 'bloqueado' : 'ativado'} com sucesso!`,
            type: 'success'
          });
          loadUsers();
          setConfirmDialog(null);
        } catch (err: any) {
          setActionMessage({
            text: err.message || 'Erro ao atualizar status do usuário.',
            type: 'error'
          });
          setConfirmDialog(null);
        }
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.funcao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (currentUserRole !== 'Administrador') {
    return (
      <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 py-8">
        <div className="bg-red-950/30 border border-red-500/20 rounded-xl p-6 text-center">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Acesso Restrito</h2>
          <p className="text-red-200">Apenas administradores podem acessar a Equipe do Comando.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
        <div>
          <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Administração</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 mb-1.5">Equipe do Comando</h1>
          <p className="text-[#9dafb9] text-sm max-w-[700px] leading-relaxed">
            Gerencie os usuários com acesso ao painel. Crie novas contas e defina níveis de permissão.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleOpenModal()}
            className="btn-inspira-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Usuário</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm flex items-center justify-between border animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
              : 'bg-red-950/50 border-red-500/40 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span className="font-semibold">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold hover:underline ml-4 px-2 py-1 rounded bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] transition"
          >
            ✕ Fechar
          </button>
        </div>
      )}

      <div className="mb-6 relative">
        <Search className="w-5 h-5 text-[#8fa2ad] absolute left-3.5 top-3.5 pointer-events-none" />
        <input
          type="search"
          placeholder="Buscar por nome, email ou função..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full sm:max-w-md min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] text-white pl-11 pr-4 focus:border-[#f5c33b] focus:outline-none transition text-sm"
        />
      </div>

      <div className="bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)]">
                <th className="px-5 py-4 text-xs font-black text-[#9dafb9] uppercase tracking-wider">Nome / Email</th>
                <th className="px-5 py-4 text-xs font-black text-[#9dafb9] uppercase tracking-wider">Função</th>
                <th className="px-5 py-4 text-xs font-black text-[#9dafb9] uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-black text-[#9dafb9] uppercase tracking-wider hidden sm:table-cell">Acesso</th>
                <th className="px-5 py-4 text-xs font-black text-[#9dafb9] uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#9dafb9]">Carregando equipe...</td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-[#9dafb9]">Nenhum usuário encontrado.</td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-[rgba(255,255,255,0.02)] transition group">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white flex items-center gap-2">
                        {user.nome_completo}
                      </div>
                      <div className="text-xs text-[#8fa2ad] mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-sky-950/40 text-sky-400 border border-sky-500/20">
                        {user.funcao}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {user.status === 'Ativo' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-red-950/40 text-red-400 border border-red-500/20">
                          <Ban className="w-3 h-3" /> Bloqueado
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="text-xs text-[#8fa2ad]">Criado em: {new Date(user.criado_em).toLocaleDateString('pt-BR')}</div>
                      {user.ultimo_acesso && (
                        <div className="text-[11px] text-[#6b7b85] mt-1">Último login: {new Date(user.ultimo_acesso).toLocaleDateString('pt-BR')}</div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(user)}
                          className="w-8 h-8 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[#f5c33b] hover:text-[#08141e] text-[#9dafb9] transition flex items-center justify-center"
                          title="Editar usuário"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`w-8 h-8 rounded-lg transition flex items-center justify-center ${user.status === 'Ativo' ? 'bg-red-950/30 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/20' : 'bg-emerald-950/30 text-emerald-400 hover:bg-emerald-500 hover:text-white border border-emerald-500/20'}`}
                          title={user.status === 'Ativo' ? 'Bloquear usuário' : 'Ativar usuário'}
                        >
                          {user.status === 'Ativo' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="w-8 h-8 rounded-lg transition flex items-center justify-center bg-red-950/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/10"
                          title="Apagar usuário"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diálogo de Confirmação Personalizado */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmDialog(null)} />
          <div className="relative w-full max-w-md bg-[#0b1b26] border border-[#1a2e3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{confirmDialog.title}</h3>
                <p className="text-sm text-[#8fa2ad] mt-0.5">{confirmDialog.message}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#9dafb9] text-sm font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmDialog.onConfirm()}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-lg transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-[#0b1b26] border border-[#1a2e3d] rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-5 sm:p-6 border-b border-[rgba(255,255,255,0.06)] flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#f5c33b]" />
                {editingUser ? 'Editar Usuário' : 'Novo Usuário do Comando'}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#9dafb9] transition">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 sm:p-6 overflow-y-auto">
              <form id="user-form" onSubmit={handleSave} className="space-y-6">
                {formError && (
                  <div className="p-4 bg-red-950/30 border border-red-500/20 rounded-xl text-red-200 text-sm">
                    {formError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <h3 className="text-[#f5c33b] text-sm font-bold border-b border-[rgba(255,255,255,0.06)] pb-2">Dados Pessoais</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">Nome Completo *</label>
                      <input
                        type="text"
                        value={formData.nome_completo}
                        onChange={e => setFormData({...formData, nome_completo: e.target.value})}
                        required
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">E-mail de Contato *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        required
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">Login de Acesso *</label>
                      <input
                        type="text"
                        value={formData.login || ''}
                        onChange={e => setFormData({...formData, login: e.target.value})}
                        required
                        disabled={!!editingUser}
                        placeholder="Ex: joao.silva"
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition disabled:opacity-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">WhatsApp</label>
                      <input
                        type="text"
                        value={formData.whatsapp}
                        onChange={e => setFormData({...formData, whatsapp: e.target.value})}
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">URL da Foto (Opcional)</label>
                      <input
                        type="url"
                        value={formData.foto || ''}
                        onChange={e => setFormData({...formData, foto: e.target.value})}
                        placeholder="https://..."
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-[#f5c33b] text-sm font-bold border-b border-[rgba(255,255,255,0.06)] pb-2">Acesso</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">Função *</label>
                      <select
                        value={formData.funcao}
                        onChange={e => setFormData({...formData, funcao: e.target.value})}
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                      >
                        <option value="Administrador">Administrador (Acesso total)</option>
                        <option value="Instrutor">Instrutor (Acesso limitado)</option>
                        <option value="Secretaria">Secretaria (Acesso limitado)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">Status *</label>
                      <select
                        value={formData.status || 'Ativo'}
                        onChange={e => setFormData({...formData, status: e.target.value})}
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Bloqueado">Bloqueado</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">Senha {editingUser && '(Opcional)'} {(!editingUser) && '*'}</label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required={!editingUser}
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#9dafb9] uppercase mb-1.5">Confirmar Senha</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                        required={!editingUser || !!formData.password}
                        className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-4 py-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-5 sm:p-6 border-t border-[rgba(255,255,255,0.06)] shrink-0 flex justify-end gap-3 bg-[rgba(0,0,0,0.2)] rounded-b-2xl">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 rounded-xl border border-[rgba(255,255,255,0.11)] bg-transparent text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.05)] transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                form="user-form"
                disabled={isSaving}
                className="btn-inspira-gold px-6 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Usuário'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
