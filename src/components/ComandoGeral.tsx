import React, { useState, useEffect, useMemo } from 'react';
import { PreCadastro, CadastroCompleto } from '../types.js';
import { NovoAlunoModal } from './NovoAlunoModal.js';
import { Shield, LogOut, Download, Search, FileText, CheckCircle, Clock, AlertTriangle, Eye, Send, Trash2, X, Key, ExternalLink, Copy, MessageCircle, Database } from 'lucide-react';

interface ComandoGeralProps {
  onNavigate: (route: string) => void;
}

export const ComandoGeral: React.FC<ComandoGeralProps> = ({ onNavigate }) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Data state
  const [cadastros, setCadastros] = useState<PreCadastro[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modals state
  const [selectedPre, setSelectedPre] = useState<PreCadastro | null>(null);
  const [selectedFull, setSelectedFull] = useState<CadastroCompleto | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [fullError, setFullError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showNovoAlunoModal, setShowNovoAlunoModal] = useState(false);
  const [token, setToken] = useState('');

  // Password change state
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // App Base URL for WhatsApp links
  const [appBaseUrl, setAppBaseUrl] = useState('');
  const [dbProvider, setDbProvider] = useState<{ provider: string; label: string; isSupabase: boolean } | null>(null);

  // Check auth and base URL on mount
  useEffect(() => {
    checkAuth();
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const data = await res.json();
        if (data.appUrl) {
          setAppBaseUrl(data.appUrl);
        } else {
          setAppBaseUrl(window.location.origin);
        }
        if (data.database) {
          setDbProvider(data.database);
        }
      }
    } catch {
      setAppBaseUrl(window.location.origin);
    }
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/auth/me', { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          loadCadastros(token || undefined);
          return;
        }
      }
      setIsAuthenticated(false);
    } catch {
      setIsAuthenticated(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Usuário ou senha inválidos.');
      }

      if (data.token) {
        localStorage.setItem('inspira_auth_token', data.token);
      }
      setIsAuthenticated(true);
      setToken(data.token);
      loadCadastros(data.token);
    } catch (err: any) {
      setLoginError(err.message || 'Erro ao efetuar login.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('inspira_auth_token');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch {
      // ignore
    }
    localStorage.removeItem('inspira_auth_token');
    setIsAuthenticated(false);
    setCadastros([]);
  };

  const loadCadastros = async (tokenOverride?: string) => {
    setLoading(true);
    try {
      const token = tokenOverride || localStorage.getItem('inspira_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/pre-cadastros', { headers });
      if (res.ok) {
        const data = await res.json();
        setCadastros(data);
      } else if (res.status === 401) {
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Erro ao carregar pré-cadastros:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    const token = localStorage.getItem('inspira_auth_token');
    try {
      const res = await fetch(`/api/pre-cadastros/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setCadastros((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
        );
      }
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Tem certeza que deseja excluir este cadastro?')) return;

    const token = localStorage.getItem('inspira_auth_token');
    try {
      const res = await fetch(`/api/pre-cadastros/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        setCadastros((prev) => prev.filter((item) => item.id !== id));
        if (selectedPre?.id === id) setSelectedPre(null);
        if (selectedFull && String(selectedFull.ref) === String(id)) setSelectedFull(null);
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  const handleOpenFullRegistration = async (id: number) => {
    setLoadingFull(true);
    setFullError('');
    setSelectedFull(null);

    const token = localStorage.getItem('inspira_auth_token');
    try {
      const res = await fetch(`/api/cadastros-completos/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.ok) {
        const data = await res.json();
        setSelectedFull(data);
      } else if (res.status === 404) {
        setFullError('A ficha completa ainda não foi enviada por este aluno ou responsável.');
      } else {
        setFullError('Erro ao consultar a ficha completa no servidor.');
      }
    } catch (err: any) {
      setFullError('Erro de conexão ao buscar ficha completa.');
    } finally {
      setLoadingFull(false);
    }
  };

  const getWhatsAppUrl = (phone?: string, text?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;
    const fullNumber = digits.length <= 11 ? `55${digits}` : digits;
    const url = new URL(`https://wa.me/${fullNumber}`);
    if (text) {
      url.searchParams.set('text', text);
    }
    return url.toString();
  };

  const WhatsAppLinkBtn: React.FC<{ phone?: string; label?: string; compact?: boolean; message?: string }> = ({
    phone,
    label = 'WhatsApp',
    compact = false,
    message,
  }) => {
    if (!phone) return null;
    const url = getWhatsAppUrl(phone, message);
    if (!url) return null;

    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={`inline-flex items-center gap-1.5 ${
          compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        } rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/35 font-bold transition cursor-pointer shrink-0`}
        title={`Abrir WhatsApp (${phone})`}
      >
        <MessageCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-400`} />
        <span>{label}</span>
      </a>
    );
  };

  const handleCopyLink = (item: PreCadastro) => {
    const base = appBaseUrl || window.location.origin;
    const link = new URL('/ficha-completa', base);
    link.searchParams.set('ref', String(item.id));
    
    navigator.clipboard.writeText(link.toString())
      .then(() => alert('Link da ficha copiado com sucesso!'))
      .catch((err) => {
        console.error('Erro ao copiar link', err);
        alert('Falha ao copiar link.');
      });
  };

  const handleSendWhatsApp = (item: PreCadastro) => {
    const rawNumber = item.whatsResponsavel || item.whatsAluno || '';
    const digits = rawNumber.replace(/\D/g, '');

    if (!digits) {
      alert('Este cadastro não possui número de WhatsApp informado.');
      return;
    }

    const base = appBaseUrl || window.location.origin;
    const link = new URL('/ficha-completa', base);
    link.searchParams.set('ref', String(item.id));

    const primeiroNome = (item.nomeAluno || 'aluno').split(' ')[0];
    const mensagem = `Olá! Aqui é da equipe do Centro de Treinamento Inspira.

O pré-cadastro de ${primeiroNome} foi recebido e agora precisamos concluir a ficha de cadastro.

Acesse o formulário pelo link abaixo:
${link.href}

Após o envio, nossa equipe dará continuidade ao atendimento.`;

    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(mensagem)}`, '_blank');
  };

  const handleExportCsv = () => {
    if (!cadastros.length) {
      alert('Não há cadastros para exportar.');
      return;
    }

    const headers = [
      'ID',
      'Aluno',
      'Nascimento',
      'Cidade',
      'WhatsApp Aluno',
      'Responsável',
      'Parentesco',
      'WhatsApp Responsável',
      'Contato Preferido',
      'Status',
      'Ficha Completa Enviada',
      'Observações',
      'Criado Em',
    ];

    const rows = cadastros.map((r) => [
      r.id,
      r.nomeAluno,
      r.nascimentoAluno,
      r.cidadeAluno,
      r.whatsAluno || '',
      r.nomeResponsavel || '',
      r.parentesco || '',
      r.whatsResponsavel || '',
      r.contatoPreferido || '',
      r.status,
      r.hasFullRegistration ? 'Sim' : 'Não',
      r.observacao || '',
      r.criadoEm,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v || '').replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pre-cadastros-inspira-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    const token = localStorage.getItem('inspira_auth_token');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao alterar senha.');
      }

      setPassMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPass('');
      setNewPass('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Erro ao alterar senha.' });
    }
  };

  const formatDate = (val?: string) => {
    if (!val) return 'Não informado';
    try {
      const d = new Date(val.includes('T') ? val : val + 'T00:00:00');
      return isNaN(d.getTime()) ? val : d.toLocaleDateString('pt-BR');
    } catch {
      return val;
    }
  };

  // Filtered list
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return cadastros.filter((r) => {
      const text = [r.nomeAluno, r.nomeResponsavel, r.cidadeAluno, r.whatsAluno, r.whatsResponsavel]
        .join(' ')
        .toLowerCase();
      const matchesQuery = !q || text.includes(q);
      const matchesFilter = statusFilter === 'todos' || r.status === statusFilter;
      return matchesQuery && matchesFilter;
    });
  }, [cadastros, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: cadastros.length,
      aguardando: cadastros.filter((r) => r.status === 'Aguardando contato').length,
      atendimento: cadastros.filter((r) => r.status === 'Em atendimento').length,
      confirmados: cadastros.filter((r) => r.status === 'Confirmado').length,
    };
  }, [cadastros]);

  // If waiting for initial auth check
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#061018] text-[#8fa2ad]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#f5c33b] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Carregando Comando Geral...</span>
          
    </div>
        
    </div>
    );
  }

  // If Not Authenticated: Render Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_82%_0%,rgba(22,134,193,0.14),transparent_26%),linear-gradient(180deg,#061018,#07131d_48%,#050d14)] text-[#f5f7f9]">
        {/* Topbar */}
        <header className="border-b border-[rgba(255,255,255,0.08)] py-4 bg-[rgba(6,16,24,0.92)] backdrop-blur-md">
          <div className="w-[min(1180px,calc(100%-28px))] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/assets/logo-inspira.png" alt="Centro de Treinamento Inspira" className="h-10 sm:h-12 w-auto object-contain" />
              <span className="text-xs text-[#9dafb9] font-semibold hidden sm:inline">Área do Comando Geral</span>
              
    </div>
            <button
              onClick={() => onNavigate('landing')}
              className="px-4 py-2 rounded-xl border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.045)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition cursor-pointer"
            >
              Voltar ao site
            </button>
            
    </div>
        </header>

        <main className="min-h-[calc(100vh-76px)] grid place-items-center p-4">
          <div className="w-full max-w-[430px] p-7 rounded-3xl bg-[linear-gradient(180deg,rgba(12,27,39,0.96),rgba(8,18,26,0.98))] border border-[rgba(84,160,212,0.13)] shadow-[0_28px_80px_rgba(0,0,0,0.4)]">
            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Acesso restrito</span>
            <h1 className="text-3xl font-extrabold text-white mt-1.5 mb-2">Login Inspira</h1>
            <p className="text-[#9dafb9] text-sm leading-relaxed mb-5">
              Entre para acessar o portal do Aluno.
            </p>

            {loginError && (
              <div className="p-3.5 mb-4 rounded-xl bg-red-900/40 border border-red-500/40 text-red-200 text-sm">
                {loginError}
                
    </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1.5">Usuário</label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="comando"
                  className="w-full min-h-[50px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                />
                
    </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1.5">Senha</label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full min-h-[50px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                />
                
    </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full min-h-[50px] rounded-xl btn-inspira-gold text-base font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loggingIn ? 'Entrando...' : 'Entrar no painel'}
              </button>

              <div className="text-center text-[#758892] text-xs mt-3">
                Credenciais de acesso: usuário <strong className="text-[#ffe27a]">comando</strong> • senha <strong className="text-[#ffe27a]">inspira2026</strong>
                
    </div>
            </form>
            
    </div>
        </main>
        
    </div>
    );
  }

  // If Authenticated: Render Full Dashboard
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_82%_0%,rgba(22,134,193,0.14),transparent_26%),linear-gradient(180deg,#061018,#07131d_48%,#050d14)] text-[#f5f7f9] pb-16">
      {/* Topbar */}
      <header className="border-b border-[rgba(255,255,255,0.08)] py-4 bg-[rgba(6,16,24,0.92)] backdrop-blur-md sticky top-0 z-20">
        <div className="w-[min(1180px,calc(100%-28px))] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/assets/logo-inspira.png" alt="Centro de Treinamento Inspira" className="h-10 sm:h-12 w-auto object-contain" />
            <span className="text-xs text-[#9dafb9] font-semibold hidden md:inline">Área do Comando Geral</span>
            {dbProvider && (
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border transition ${
                  dbProvider.isSupabase
                    ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300'
                    : 'bg-sky-500/15 border-sky-500/35 text-sky-300'
                }`}
                title={
                  dbProvider.isSupabase
                    ? 'Banco de dados Supabase (Nuvem) conectado'
                    : 'Banco de dados SQLite (Local) ativo. Adicione SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente para nuvem.'
                }
              >
                <Database className="w-3 h-3" />
                <span className="hidden xs:inline">{dbProvider.label}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.045)] text-xs sm:text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition flex items-center gap-1.5 cursor-pointer"
              title="Alterar senha do Comando"
            >
              <Key className="w-4 h-4 text-[#f5c33b]" />
              <span className="hidden sm:inline">Senha</span>
            </button>
            <button
              onClick={() => onNavigate('landing')}
              className="px-3 py-2 rounded-xl border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.045)] text-xs sm:text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition cursor-pointer"
            >
              Voltar ao site
            </button>
            <button
              onClick={handleLogout}
              className="px-3 py-2 rounded-xl border border-red-500/20 bg-red-950/20 text-xs sm:text-sm font-bold text-red-200 hover:bg-red-900/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
            
    </div>
          
    </div>
      </header>

      {/* Main Content */}
      <main className="pt-8">
        <div className="w-[min(1180px,calc(100%-28px))] mx-auto">
          {/* Dashboard Head */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
            <div>
              <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Comando Geral</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-1 mb-1.5">Painel de cadastros</h1>
              <p className="text-[#9dafb9] text-sm max-w-[700px] leading-relaxed">
                Consulte as fichas, acompanhe o status de contato e envie a ficha completa para alunos ou responsáveis.
              </p>
            </div>
            <div className="flex gap-2">
            <button
              onClick={() => {
                const base = appBaseUrl || window.location.origin;
                const link = new URL('/ficha-completa', base);
                navigator.clipboard.writeText(link.toString())
                  .then(() => alert('Link de nova inscrição copiado!'))
                  .catch(() => alert('Falha ao copiar link.'));
              }}
              className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.045)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Copy className="w-4 h-4" />
              <span>Copiar link de inscrição</span>
            </button>
            <button
              onClick={() => setShowNovoAlunoModal(true)}
              className="btn-inspira-gold px-4 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer shrink-0"
            >
              <FileText className="w-4 h-4" />
              <span>Cadastrar Novo Aluno</span>
            </button>
            <button
    onClick={handleExportCsv}
    className="px-4 py-2.5 rounded-xl border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.045)] text-sm font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition flex items-center gap-2 cursor-pointer shrink-0"
  >
    <Download className="w-4 h-4" />
              <span>Exportar CSV</span>
            </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-[rgba(84,160,212,0.11)]">
              <span className="block text-[#9dafb9] text-xs mb-1.5">Total de pré-cadastros</span>
              <strong className="text-2xl sm:text-3xl text-[#ffe27a] font-black">{stats.total}</strong>
              
    </div>

            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-[rgba(84,160,212,0.11)]">
              <span className="block text-[#9dafb9] text-xs mb-1.5">Aguardando contato</span>
              <strong className="text-2xl sm:text-3xl text-[#f5c33b] font-black">{stats.aguardando}</strong>
              
    </div>

            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-[rgba(84,160,212,0.11)]">
              <span className="block text-[#9dafb9] text-xs mb-1.5">Em atendimento</span>
              <strong className="text-2xl sm:text-3xl text-[#1aa0e6] font-black">{stats.atendimento}</strong>
              
    </div>

            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-[rgba(84,160,212,0.11)]">
              <span className="block text-[#9dafb9] text-xs mb-1.5">Confirmados</span>
              <strong className="text-2xl sm:text-3xl text-emerald-400 font-black">{stats.confirmados}</strong>
              
    </div>
            
    </div>

          {/* Search & Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_230px] gap-3 mb-4">
            <div className="relative">
              <Search className="w-5 h-5 text-[#8fa2ad] absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                type="search"
                placeholder="Buscar aluno, responsável, cidade ou WhatsApp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] text-white pl-11 pr-4 focus:border-[#f5c33b] focus:outline-none transition text-sm"
              />
              
    </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.09)] bg-[#0d1a23] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition text-sm cursor-pointer"
            >
              <option value="todos">Todos os status</option>
              <option value="Aguardando contato">Aguardando contato</option>
              <option value="Em atendimento">Em atendimento</option>
              <option value="Confirmado">Confirmado</option>
            </select>
            
    </div>

          {/* Table Shell */}
          <div className="overflow-x-auto rounded-2xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]">
            {loading ? (
              <div className="p-12 text-center text-[#8799a3]">
                <div className="w-6 h-6 border-2 border-[#f5c33b] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Carregando registros do banco de dados...
                
    </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-[#8799a3]">
                Nenhum pré-cadastro encontrado.
                
    </div>
            ) : (
              <table className="w-full border-collapse min-w-[1050px]">
                <thead>
                  <tr className="border-b border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.025)]">
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Aluno</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">WhatsApp</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Responsável</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Cidade</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Ficha Completa</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Status</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-sm text-[#dce5ea]">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-[rgba(255,255,255,0.02)] transition">
                      <td className="p-3.5">
                        <strong className="block text-white">{r.nomeAluno}</strong>
                        <small className="text-[#84949d] block text-xs">{formatDate(r.nascimentoAluno)}</small>
                      </td>
                      <td className="p-3.5 font-mono text-xs">
                        <div className="flex flex-col items-start gap-1.5">
                          <span className="text-white font-medium">{r.whatsAluno || r.whatsResponsavel || 'Não informado'}</span>
                          {(r.whatsAluno || r.whatsResponsavel) && (
                            <WhatsAppLinkBtn
                              phone={r.whatsAluno || r.whatsResponsavel}
                              label="Conversar"
                              compact
                            />
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        {r.nomeResponsavel || 'Não informado'}
                        {r.parentesco && <span className="text-[#84949d] text-xs block">({r.parentesco})</span>}
                      </td>
                      <td className="p-3.5">{r.cidadeAluno || 'Não informado'}</td>
                      <td className="p-3.5">
                        {r.hasFullRegistration ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-xs bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Enviada</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#8fa2ad] text-xs bg-[rgba(255,255,255,0.04)] px-2.5 py-1 rounded-full">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pendente</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <select
                          value={r.status}
                          onChange={(e) => handleStatusChange(r.id, e.target.value)}
                          className="min-h-[34px] rounded-lg border border-[rgba(255,255,255,0.12)] bg-[#0d1a23] text-white px-2 text-xs font-semibold focus:border-[#f5c33b] focus:outline-none cursor-pointer"
                        >
                          <option value="Aguardando contato">Aguardando contato</option>
                          <option value="Em atendimento">Em atendimento</option>
                          <option value="Confirmado">Confirmado</option>
                        </select>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedPre(r)}
                            className="min-h-[32px] px-2.5 rounded-lg border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.045)] text-xs font-bold text-white hover:bg-[rgba(255,255,255,0.09)] transition cursor-pointer"
                          >
                            Ver pré-cadastro
                          </button>

                          <button
                            onClick={() => handleOpenFullRegistration(r.id)}
                            className={`min-h-[32px] px-2.5 rounded-lg border text-xs font-bold transition cursor-pointer ${
                              r.hasFullRegistration
                                ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-300 hover:bg-emerald-900/40'
                                : 'border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.045)] text-[#8fa2ad] hover:text-white'
                            }`}
                          >
                            Ver ficha completa
                          </button>

                          <button
                            onClick={() => handleCopyLink(r)}
                            className="min-h-[32px] px-2.5 rounded-lg border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.05)] text-xs font-bold text-white hover:bg-[rgba(255,255,255,0.1)] transition flex items-center gap-1 cursor-pointer"
                            title="Copiar link da ficha"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copiar link</span>
                          </button>

                          <button
                            onClick={() => handleSendWhatsApp(r)}
                            className="min-h-[32px] px-2.5 rounded-lg border border-[rgba(245,195,59,0.25)] bg-[rgba(245,195,59,0.08)] text-xs font-bold text-[#ffe27a] hover:bg-[rgba(245,195,59,0.15)] transition flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Enviar ficha completa</span>
                          </button>

                          <button
                            onClick={() => handleDelete(r.id)}
                            className="min-h-[32px] px-2 rounded-lg border border-red-500/20 bg-red-950/20 text-xs font-bold text-red-300 hover:bg-red-900/40 transition cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          
    </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            
    </div>
          
    </div>
      </main>

      {/* Modal: Pré-cadastro */}
      {selectedPre && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-[760px] max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-3xl bg-[#0b1721] border border-[rgba(255,255,255,0.10)] shadow-2xl relative my-auto">
            <button
              onClick={() => setSelectedPre(null)}
              className="absolute right-4 top-4 w-9 h-9 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-wider">Ficha do aluno</span>
            <h2 className="text-2xl font-bold text-white mt-1 mb-4">Dados do pré-cadastro</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Aluno</span>
                <strong className="text-white text-base">{selectedPre.nomeAluno}</strong>
                
    </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Nascimento</span>
                <strong className="text-white">{formatDate(selectedPre.nascimentoAluno)}</strong>
                
    </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Cidade</span>
                <strong className="text-white">{selectedPre.cidadeAluno || 'Não informado'}</strong>
                
    </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Quem cadastrou</span>
                <strong className="text-white">{selectedPre.tipoCadastro === 'responsavel' ? 'Responsável' : 'Aluno'}</strong>
                
    </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2">
                <div>
                  <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">WhatsApp aluno</span>
                  <strong className="text-white text-base">{selectedPre.whatsAluno || 'Não informado'}</strong>
                </div>
                {selectedPre.whatsAluno && (
                  <WhatsAppLinkBtn phone={selectedPre.whatsAluno} label="Abrir WhatsApp" />
                )}
              </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2">
                <div>
                  <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">WhatsApp responsável</span>
                  <strong className="text-white text-base">{selectedPre.whatsResponsavel || 'Não informado'}</strong>
                </div>
                {selectedPre.whatsResponsavel && (
                  <WhatsAppLinkBtn phone={selectedPre.whatsResponsavel} label="Abrir WhatsApp" />
                )}
              </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Responsável</span>
                <strong className="text-white">{selectedPre.nomeResponsavel || 'Não informado'}</strong>
                
    </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Parentesco</span>
                <strong className="text-white">{selectedPre.parentesco || 'Não informado'}</strong>
                
    </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Contato preferido</span>
                <strong className="text-white">
                  {selectedPre.contatoPreferido === 'aluno'
                    ? 'Aluno'
                    : selectedPre.contatoPreferido === 'responsavel'
                    ? 'Responsável'
                    : selectedPre.contatoPreferido === 'ambos'
                    ? 'Aluno e responsável'
                    : 'Não informado'}
                </strong>
                
    </div>

              <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Status</span>
                <strong className="text-[#ffe27a]">{selectedPre.status}</strong>
                
    </div>

              <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Observações</span>
                <p className="text-white whitespace-pre-wrap">{selectedPre.observacao || 'Nenhuma observação informada.'}</p>
                
    </div>

              <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Pré-cadastro realizado em</span>
                <strong className="text-white">{new Date(selectedPre.criadoEm).toLocaleString('pt-BR')}</strong>
                
    </div>
              
    </div>

            <div className="mt-5 flex gap-2 flex-wrap items-center">
              <button
                onClick={() => handleSendWhatsApp(selectedPre)}
                className="btn-inspira-gold px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar link da ficha completa pelo WhatsApp</span>
              </button>
              {selectedPre.whatsAluno && (
                <WhatsAppLinkBtn phone={selectedPre.whatsAluno} label="Conversar com Aluno" />
              )}
              {selectedPre.whatsResponsavel && (
                <WhatsAppLinkBtn phone={selectedPre.whatsResponsavel} label="Conversar com Responsável" />
              )}
            </div>
            
    </div>
          
    </div>
      )}

      {/* Modal: Ficha Completa */}
      {(selectedFull || loadingFull || fullError) && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-[780px] max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-3xl bg-[#0b1721] border border-[rgba(255,255,255,0.10)] shadow-2xl relative my-auto">
            <button
              onClick={() => {
                setSelectedFull(null);
                setFullError('');
              }}
              className="absolute right-4 top-4 w-9 h-9 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-wider">Ficha completa</span>
            <h2 className="text-2xl font-bold text-white mt-1 mb-4">Dados cadastrais completos</h2>

            {loadingFull ? (
              <div className="p-8 text-center text-[#8799a3]">
                <div className="w-6 h-6 border-2 border-[#f5c33b] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                Buscando ficha completa...
                
    </div>
            ) : fullError ? (
              <div className="p-5 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-center">
                <AlertTriangle className="w-8 h-8 text-[#f5c33b] mx-auto mb-2" />
                <p className="text-white font-medium mb-3">{fullError}</p>
                <p className="text-xs text-[#8fa2ad]">
                  Você pode enviar o link da ficha completa para o aluno ou responsável pelo WhatsApp.
                </p>
                
    </div>
            ) : selectedFull ? (
              <div className="space-y-4">
                {/* Grid de Informações */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Aluno</span>
                    <strong className="text-white text-base">{selectedFull.nome}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Nascimento</span>
                    <strong className="text-white">{formatDate(selectedFull.nascimento)}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">WhatsApp aluno</span>
                      <strong className="text-white text-base">{selectedFull.whats || 'Não informado'}</strong>
                    </div>
                    {selectedFull.whats && (
                      <WhatsAppLinkBtn phone={selectedFull.whats} label="Abrir WhatsApp" />
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Cidade</span>
                    <strong className="text-white">{selectedFull.cidade || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Bairro</span>
                    <strong className="text-white">{selectedFull.bairro || 'Não informado'}</strong>
                    
    </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Endereço</span>
                    <strong className="text-white">{selectedFull.endereco || 'Não informado'}</strong>
                    
    </div>

                  {/* Estudos */}
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Escola / Instituição</span>
                    <strong className="text-white">{selectedFull.escola || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Ano / Curso</span>
                    <strong className="text-white">{selectedFull.curso || 'Não informado'}</strong>
                    
    </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Objetivos no Inspira</span>
                    <strong className="text-white">{selectedFull.objetivos || 'Não informado'}</strong>
                    
    </div>

                  {/* Responsável */}
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Responsável</span>
                    <strong className="text-white">{selectedFull.responsavel || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Parentesco</span>
                    <strong className="text-white">{selectedFull.parentesco || 'Não informado'}</strong>
                    
    </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">WhatsApp do responsável</span>
                      <strong className="text-white text-base">{selectedFull.whatsResponsavel || 'Não informado'}</strong>
                    </div>
                    {selectedFull.whatsResponsavel && (
                      <WhatsAppLinkBtn phone={selectedFull.whatsResponsavel} label="Abrir WhatsApp" />
                    )}
                  </div>

                  {/* Saúde e Laudo */}
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Possui laudo</span>
                    <strong className="text-[#ffe27a]">{selectedFull.possuiLaudo || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">CID</span>
                    <strong className="text-white">{selectedFull.cid || 'Não informado'}</strong>
                    
    </div>

                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(245,195,59,0.18)] flex items-center justify-between gap-3">
                    <div>
                      <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Arquivo de laudo / documento de saúde</span>
                      <strong className="text-white text-sm flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#f5c33b]" />
                        <span>{selectedFull.laudoArquivoNome || 'Nenhum arquivo registrado'}</span>
                      </strong>
                      
    </div>

                    {selectedFull.laudoDownloadUrl && (
                      <a
                        href={selectedFull.laudoDownloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[rgba(245,195,59,0.15)] text-[#ffe27a] hover:bg-[rgba(245,195,59,0.25)] text-xs font-bold transition flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Visualizar / Baixar</span>
                      </a>
                    )}
                    
    </div>

                  {/* Alergias e Medicamentos */}
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Possui alergias</span>
                    <strong className="text-white">{selectedFull.temAlergia || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Quais alergias</span>
                    <strong className="text-white">{selectedFull.alergias || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Usa medicamento contínuo</span>
                    <strong className="text-white">{selectedFull.usaMedicamento || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Medicamentos em uso</span>
                    <strong className="text-white">{selectedFull.medicamentos || 'Não informado'}</strong>
                    
    </div>

                  {/* Restrições e Saúde */}
                  <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Restrições</span>
                    <strong className="text-white">{selectedFull.restricoes || 'Não informado'}</strong>
                    
    </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Condições / Orientações de saúde</span>
                    <strong className="text-white">{selectedFull.condicoesSaude || 'Não informado'}</strong>
                    
    </div>

                  {/* Emergência */}
                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Contato de emergência</span>
                    <strong className="text-white">{selectedFull.emergenciaNome || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)] flex items-center justify-between gap-2">
                    <div>
                      <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Telefone de emergência</span>
                      <strong className="text-white text-base">{selectedFull.emergenciaFone || 'Não informado'}</strong>
                    </div>
                    {selectedFull.emergenciaFone && (
                      <WhatsAppLinkBtn phone={selectedFull.emergenciaFone} label="Abrir WhatsApp" />
                    )}
                  </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Orientação em emergência</span>
                    <strong className="text-white">{selectedFull.orientacaoEmergencia || 'Não informado'}</strong>
                    
    </div>

                  <div className="sm:col-span-2 p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Outras informações de segurança</span>
                    <strong className="text-white">{selectedFull.seguranca || 'Não informado'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Autorização de imagem</span>
                    <strong className="text-white">{selectedFull.autorizaImagem ? 'Sim' : 'Não'}</strong>
                    
    </div>

                  <div className="p-3 rounded-xl bg-[rgba(255,255,255,0.035)] border border-[rgba(255,255,255,0.06)]">
                    <span className="block text-[#8798a2] text-[11px] uppercase tracking-wider mb-1">Ficha enviada em</span>
                    <strong className="text-white">{new Date(selectedFull.enviadoEm).toLocaleString('pt-BR')}</strong>
                    
    </div>
                  
    </div>
                
    </div>
            ) : null}
            
    </div>
          
    </div>
      )}

      {/* Modal: Alterar Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-[420px] p-6 rounded-3xl bg-[#0b1721] border border-[rgba(255,255,255,0.10)] shadow-2xl relative">
            <button
              onClick={() => {
                setShowPasswordModal(false);
                setPassMsg(null);
              }}
              className="absolute right-4 top-4 w-9 h-9 rounded-xl border border-[rgba(255,255,255,0.09)] bg-[rgba(255,255,255,0.04)] text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer transition"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-wider">Segurança</span>
            <h2 className="text-xl font-bold text-white mt-1 mb-4">Alterar senha do Comando</h2>

            {passMsg && (
              <div
                className={`p-3 rounded-xl mb-4 text-sm ${
                  passMsg.type === 'success'
                    ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/40 border border-red-500/40 text-red-200'
                }`}
              >
                {passMsg.text}
                
    </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">Senha atual</label>
                <input
                  type="password"
                  required
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#dce5ea] mb-1">Nova senha (mínimo 6 caracteres)</label>
                <input
                  type="password"
                  required
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[46px] rounded-xl btn-inspira-gold text-sm font-black cursor-pointer"
              >
                Salvar nova senha
              </button>
            </form>
          </div>
        </div>
      )}

      {showNovoAlunoModal && (
        <NovoAlunoModal 
          token={token}
          onClose={() => setShowNovoAlunoModal(false)}
          onSuccess={() => loadCadastros(token)}
        />
      )}
    </div>
  );
};