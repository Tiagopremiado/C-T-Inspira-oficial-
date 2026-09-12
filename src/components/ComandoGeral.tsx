import React, { useState, useEffect, useMemo } from 'react';
import { PreCadastro, CadastroCompleto } from '../types.js';
import { NovoAlunoModal } from './NovoAlunoModal.js';
import { FichaAluno } from './FichaAluno.js';
import { Shield, LogOut, Download, Search, FileText, CheckCircle, Clock, AlertTriangle, Eye, Send, Trash2, X, Key, ExternalLink, Copy, MessageCircle, Database, User, Users, UserPlus, UserCheck, Clock4, FileWarning, Files } from 'lucide-react';

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
  const [rememberMe, setRememberMe] = useState(false);

  // Data state
  const [cadastros, setCadastros] = useState<PreCadastro[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modals state
  const [selectedAluno, setSelectedAluno] = useState<PreCadastro | null>(null);
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
    
    const savedUsername = localStorage.getItem('inspira_saved_username');
    if (savedUsername) {
      setUsername(savedUsername);
      setRememberMe(true);
    }
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

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON response (e.g. 404/500 HTML from Vercel)
      }

      if (!res.ok) {
        if (!data) {
          if (res.status === 404) {
            throw new Error('Servidor da API não encontrado (404). Verifique as variáveis de ambiente na Vercel e o arquivo vercel.json.');
          }
          throw new Error(`Falha de comunicação com o servidor (Status HTTP ${res.status}).`);
        }
        throw new Error(data.error || 'Usuário ou senha inválidos.');
      }

      if (data?.token) {
        localStorage.setItem('inspira_auth_token', data.token);
      }
      
      if (rememberMe) {
        localStorage.setItem('inspira_saved_username', username);
      } else {
        localStorage.removeItem('inspira_saved_username');
      }

      setIsAuthenticated(true);
      setToken(data?.token || '');
      loadCadastros(data?.token);
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
        setSelectedAluno((prev) => prev && prev.id === id ? { ...prev, status: newStatus } : prev);
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

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        // Non-JSON
      }

      if (!res.ok) {
        throw new Error(data?.error || `Erro ao alterar senha (${res.status}).`);
      }

      setPassMsg({ type: 'success', text: 'Senha alterada com sucesso!' });
      setCurrentPass('');
      setNewPass('');
    } catch (err: any) {
      setPassMsg({ type: 'error', text: err.message || 'Erro ao alterar senha.' });
    }
  };

  const calculateAge = (dob: string | undefined) => {
    if (!dob) return '';
    try {
      const d = new Date(dob.includes('T') ? dob : dob + 'T00:00:00');
      if (isNaN(d.getTime())) return '';
      const ageDifMs = Date.now() - d.getTime();
      const ageDate = new Date(ageDifMs);
      return Math.abs(ageDate.getUTCFullYear() - 1970) + ' anos';
    } catch { return ''; }
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
      let matchesFilter = true;
      if (statusFilter === 'Pré-cadastro') {
        matchesFilter = !r.hasFullRegistration;
      } else if (statusFilter === 'Cadastro completo') {
        matchesFilter = r.hasFullRegistration === true;
      } else if (statusFilter === 'Doc: Pendente') {
        matchesFilter = r.documentacaoStatus === 'Pendente';
      } else if (statusFilter === 'Doc: Em análise') {
        matchesFilter = r.documentacaoStatus === 'Em análise';
      } else if (statusFilter === 'Doc: Completo') {
        matchesFilter = r.documentacaoStatus === 'Completo';
      } else if (statusFilter !== 'todos') {
        matchesFilter = r.status === statusFilter;
      }
      
      return matchesQuery && matchesFilter;
    });
  }, [cadastros, searchTerm, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: cadastros.length,
      novosPreCadastros: cadastros.filter(c => c.status === 'Novo cadastro' || c.status === 'Aguardando contato').length,
      ativos: cadastros.filter(c => c.status === 'Ativo').length,
      aguardando: cadastros.filter(c => c.status === 'Em análise' || c.status === 'Em atendimento').length,
      incompletos: cadastros.filter(c => !c.hasFullRegistration).length,
      docsPendentes: cadastros.filter(c => c.hasFullRegistration && c.status === 'Documentação pendente').length,
    };
  }, [cadastros]);

  const handleOpenFicha = async (aluno: PreCadastro) => {
    setSelectedAluno(aluno);
    if (aluno.hasFullRegistration) {
      handleOpenFullRegistration(aluno.id);
    } else {
      setSelectedFull(null);
    }
  };

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

              <div className="flex items-center justify-between mb-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-[#f5c33b] border-[#f5c33b]' : 'border-[rgba(255,255,255,0.2)] group-hover:border-[rgba(255,255,255,0.4)]'}`}>
                    {rememberMe && <CheckCircle className="w-3.5 h-3.5 text-[#061018]" strokeWidth={3} />}
                  </div>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="hidden"
                  />
                  <span className="text-sm text-[#9dafb9] group-hover:text-white transition-colors">Lembrar credenciais</span>
                </label>
                
                <button 
                  type="button" 
                  onClick={() => alert('Para redefinir sua senha, acesse a aba Authentication no painel do Supabase.')}
                  className="text-sm text-[#f5c33b] hover:text-white transition-colors"
                >
                  Esqueci a senha
                </button>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full min-h-[50px] rounded-xl btn-inspira-gold text-base font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loggingIn ? 'Entrando...' : 'Entrar no painel'}
              </button>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-[rgba(84,160,212,0.11)] relative overflow-hidden group">
              <Users className="w-16 h-16 absolute -right-3 -bottom-3 text-white opacity-5 group-hover:scale-110 transition-transform" />
              <span className="block text-[#9dafb9] text-[11px] uppercase tracking-wider mb-1.5 font-bold">Total Cadastrados</span>
              <strong className="text-2xl sm:text-3xl text-white font-black">{stats.total}</strong>
            </div>
            
            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-[rgba(245,195,59,0.15)] relative overflow-hidden group">
              <UserPlus className="w-16 h-16 absolute -right-3 -bottom-3 text-[#f5c33b] opacity-10 group-hover:scale-110 transition-transform" />
              <span className="block text-[#f5c33b] text-[11px] uppercase tracking-wider mb-1.5 font-bold">Novos Pré-Cadastros</span>
              <strong className="text-2xl sm:text-3xl text-[#f5c33b] font-black">{stats.novosPreCadastros}</strong>
            </div>
            
            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-emerald-500/15 relative overflow-hidden group">
              <UserCheck className="w-16 h-16 absolute -right-3 -bottom-3 text-emerald-400 opacity-10 group-hover:scale-110 transition-transform" />
              <span className="block text-emerald-400 text-[11px] uppercase tracking-wider mb-1.5 font-bold">Alunos Ativos</span>
              <strong className="text-2xl sm:text-3xl text-emerald-400 font-black">{stats.ativos}</strong>
            </div>
            
            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-sky-500/15 relative overflow-hidden group">
              <Clock4 className="w-16 h-16 absolute -right-3 -bottom-3 text-sky-400 opacity-10 group-hover:scale-110 transition-transform" />
              <span className="block text-sky-300 text-[11px] uppercase tracking-wider mb-1.5 font-bold">Em Análise</span>
              <strong className="text-2xl sm:text-3xl text-sky-400 font-black">{stats.aguardando}</strong>
            </div>
            
            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-red-500/15 relative overflow-hidden group">
              <FileWarning className="w-16 h-16 absolute -right-3 -bottom-3 text-red-400 opacity-10 group-hover:scale-110 transition-transform" />
              <span className="block text-red-300 text-[11px] uppercase tracking-wider mb-1.5 font-bold">Incompletos</span>
              <strong className="text-2xl sm:text-3xl text-red-400 font-black">{stats.incompletos}</strong>
            </div>
            
            <div className="p-4 rounded-2xl bg-[linear-gradient(180deg,rgba(15,35,50,0.88),rgba(8,20,30,0.94))] border border-orange-500/15 relative overflow-hidden group">
              <Files className="w-16 h-16 absolute -right-3 -bottom-3 text-orange-400 opacity-10 group-hover:scale-110 transition-transform" />
              <span className="block text-orange-300 text-[11px] uppercase tracking-wider mb-1.5 font-bold">Docs. Pendentes</span>
              <strong className="text-2xl sm:text-3xl text-orange-400 font-black">{stats.docsPendentes}</strong>
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
              <option value="todos">Todos os cadastros</option>
              <option value="Pré-cadastro">Apenas Pré-cadastros</option>
              <option value="Cadastro completo">Cadastros Completos</option>
              <option value="Em análise">Aguardando análise</option>
              <option value="Aprovado">Aprovado</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Novo cadastro">Novo cadastro</option>
              <option value="Primeiro contato realizado">Primeiro contato</option>
              <option value="Aguardando retorno">Aguardando retorno</option>
              <option value="Documentação pendente">Status: Doc. pendente</option>
              <option value="Doc: Pendente">Apenas Docs Pendentes</option>
              <option value="Doc: Em análise">Apenas Docs Em análise</option>
              <option value="Doc: Completo">Apenas Docs Completos</option>
              <option value="Matrícula confirmada">Matrícula confirmada</option>
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
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Data de Cadastro</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Responsável / WhatsApp</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Cidade</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Última Atualização</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold">Status</th>
                    <th className="p-3.5 text-left text-xs uppercase tracking-wider text-[#8fa2ad] font-bold text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(255,255,255,0.05)] text-sm text-[#dce5ea]">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-[rgba(255,255,255,0.02)] transition group">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center shrink-0">
                            <User className="w-5 h-5 text-[#8fa2ad]" />
                          </div>
                          <div>
                            <strong className="block text-white group-hover:text-[#f5c33b] transition-colors">{r.nomeAluno}</strong>
                            <span className="text-[#84949d] text-xs block">{calculateAge(r.nascimentoAluno)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 text-xs text-[#8fa2ad]">
                        {formatDate(r.criadoEm)}
                      </td>
                      <td className="p-3.5">
                        <span className="block text-white text-sm">{r.nomeResponsavel || 'Não informado'}</span>
                        <span className="block font-mono text-xs text-[#8fa2ad] mt-0.5">{r.whatsResponsavel || r.whatsAluno || 'Sem número'}</span>
                      </td>
                      <td className="p-3.5 text-sm">
                        {r.cidadeAluno || '—'}
                      </td>
                      <td className="p-3.5 text-xs text-[#8fa2ad]">
                        {r.ultimoContatoEm ? new Date(r.ultimoContatoEm).toLocaleDateString('pt-BR') : 'Sem registro'}
                      </td>
                      <td className="p-3.5">
                        <div className="flex flex-col gap-1.5 items-start">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${
                            r.status === 'Ativo' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                            r.status === 'Em análise' ? 'bg-sky-500/15 text-sky-300 border-sky-500/30' :
                            r.status === 'Inativo' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
                            r.status.includes('Documentação') ? 'bg-orange-500/15 text-orange-300 border-orange-500/30' :
                            'bg-[#f5c33b]/15 text-[#f5c33b] border-[#f5c33b]/30'
                          }`}>
                            {r.status}
                          </span>
                          {r.hasFullRegistration && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded">
                              <CheckCircle className="w-3 h-3" /> Ficha Enviada
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleOpenFicha(r)}
                            className={`min-h-[32px] px-2.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                              r.hasFullRegistration
                                ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-300 hover:bg-emerald-900/40'
                                : 'border-[#f5c33b]/40 bg-[#f5c33b]/10 text-[#f5c33b] hover:bg-[#f5c33b]/20'
                            }`}
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Abrir Ficha</span>
                          </button>

                          <button
                            onClick={() => handleSendWhatsApp(r)}
                            className="w-8 h-8 rounded-lg border border-[rgba(245,195,59,0.25)] bg-[rgba(245,195,59,0.08)] text-[#ffe27a] hover:bg-[rgba(245,195,59,0.15)] transition flex items-center justify-center cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleCopyLink(r)}
                            className="w-8 h-8 rounded-lg border border-[rgba(255,255,255,0.11)] bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)] transition flex items-center justify-center cursor-pointer"
                            title="Copiar link da ficha"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(r.id)}
                            className="w-8 h-8 rounded-lg border border-red-500/20 bg-red-950/20 text-red-300 hover:bg-red-900/40 transition flex items-center justify-center cursor-pointer"
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

      {/* Modal: Ficha Aluno Unificada */}
      {selectedAluno && (
        <FichaAluno
          preCadastro={selectedAluno}
          cadastroCompleto={selectedFull}
          onClose={() => {
            setSelectedAluno(null);
            setSelectedFull(null);
          }}
          onStatusChange={(status) => handleStatusChange(selectedAluno.id, status)}
          onSendWhatsApp={(phone, isResp) => {
             const url = getWhatsAppUrl(phone, isResp ? "Olá! Somos do Centro de Treinamento Inspira." : "Fala guerreiro! Aqui é do Comando Inspira.");
             if (url) window.open(url, "_blank");
          }}
        />
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