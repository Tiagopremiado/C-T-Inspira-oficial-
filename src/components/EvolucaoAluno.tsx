import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, Plus, Edit2, Trash2, Calendar, User, Star, Award, 
  CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, MessageSquare, 
  BarChart3, Sparkles, Target, ShieldCheck, Flag, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import { AvaliacaoAluno, CompetenciasAvaliacao } from '../types.js';

interface EvolucaoAlunoProps {
  alunoId: number;
  nomeAluno: string;
  currentUser?: {
    id?: string;
    username?: string;
    role?: string;
    nome?: string;
  };
}

interface CompetenciaMeta {
  key: keyof CompetenciasAvaliacao;
  commentKey: keyof CompetenciasAvaliacao;
  label: string;
  descricao: string;
}

const COMPETENCIAS_LIST: CompetenciaMeta[] = [
  {
    key: 'disciplina',
    commentKey: 'disciplinaComentario',
    label: 'Disciplina',
    descricao: 'Pontualidade, respeito às regras, postura e autocontrole nas atividades.'
  },
  {
    key: 'responsabilidade',
    commentKey: 'responsabilidadeComentario',
    label: 'Responsabilidade',
    descricao: 'Compromisso com as tarefas, zelo pelo material e deveres atribuídos.'
  },
  {
    key: 'trabalhoEquipe',
    commentKey: 'trabalhoEquipeComentario',
    label: 'Trabalho em Equipe',
    descricao: 'Cooperação, espírito de união, respeito mútuo e apoio aos companheiros.'
  },
  {
    key: 'lideranca',
    commentKey: 'liderancaComentario',
    label: 'Liderança',
    descricao: 'Iniciativa positiva, capacidade de motivar, guiar e dar o exemplo.'
  },
  {
    key: 'comunicacao',
    commentKey: 'comunicacaoComentario',
    label: 'Comunicação',
    descricao: 'Clareza na expressão, escuta atenta e capacidade de transmitir ideias.'
  },
  {
    key: 'participacao',
    commentKey: 'participacaoComentario',
    label: 'Participação',
    descricao: 'Engajamento voluntário, proatividade e energia nas instruções e exercícios.'
  },
  {
    key: 'superacaoDesafios',
    commentKey: 'superacaoDesafiosComentario',
    label: 'Superação de Desafios',
    descricao: 'Resiliência psicológica e física diante das adversidades e esforço contínuo.'
  }
];

export const EvolucaoAluno: React.FC<EvolucaoAlunoProps> = ({
  alunoId,
  nomeAluno,
  currentUser
}) => {
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoAluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal de Avaliação
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Campos do Formulário
  const [formData, setFormData] = useState({
    dataAvaliacao: new Date().toISOString().split('T')[0],
    instrutorNome: currentUser?.nome || currentUser?.username || 'Instrutor',
    observacoesGerais: '',
    competencias: {
      disciplina: 3,
      disciplinaComentario: '',
      responsabilidade: 3,
      responsabilidadeComentario: '',
      trabalhoEquipe: 3,
      trabalhoEquipeComentario: '',
      lideranca: 3,
      liderancaComentario: '',
      comunicacao: 3,
      comunicacaoComentario: '',
      participacao: 3,
      participacaoComentario: '',
      superacaoDesafios: 3,
      superacaoDesafiosComentario: ''
    } as CompetenciasAvaliacao
  });

  // Modal de Exclusão
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; data: string; instrutor: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtro no Gráfico (Média ou competência específica)
  const [graficoFiltro, setGraficoFiltro] = useState<string>('media');
  
  // Card de detalhes expandidos no histórico
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  const isAdmin = currentUser?.role === 'Administrador';
  const isInstrutor = currentUser?.role === 'Instrutor' || !currentUser?.role;

  useEffect(() => {
    fetchAvaliacoes();
  }, [alunoId]);

  const fetchAvaliacoes = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/alunos/${alunoId}/avaliacoes`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        throw new Error('Falha ao carregar as avaliações.');
      }
      const data = await res.json();
      setAvaliacoes(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar avaliações.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      dataAvaliacao: new Date().toISOString().split('T')[0],
      instrutorNome: currentUser?.nome || currentUser?.username || 'Instrutor',
      observacoesGerais: '',
      competencias: {
        disciplina: 3,
        disciplinaComentario: '',
        responsabilidade: 3,
        responsabilidadeComentario: '',
        trabalhoEquipe: 3,
        trabalhoEquipeComentario: '',
        lideranca: 3,
        liderancaComentario: '',
        comunicacao: 3,
        comunicacaoComentario: '',
        participacao: 3,
        participacaoComentario: '',
        superacaoDesafios: 3,
        superacaoDesafiosComentario: ''
      }
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (av: AvaliacaoAluno) => {
    setEditingId(av.id);
    setFormData({
      dataAvaliacao: av.dataAvaliacao,
      instrutorNome: av.instrutorNome,
      observacoesGerais: av.observacoesGerais || '',
      competencias: {
        disciplina: av.competencias.disciplina || 3,
        disciplinaComentario: av.competencias.disciplinaComentario || '',
        responsabilidade: av.competencias.responsabilidade || 3,
        responsabilidadeComentario: av.competencias.responsabilidadeComentario || '',
        trabalhoEquipe: av.competencias.trabalhoEquipe || 3,
        trabalhoEquipeComentario: av.competencias.trabalhoEquipeComentario || '',
        lideranca: av.competencias.lideranca || 3,
        liderancaComentario: av.competencias.liderancaComentario || '',
        comunicacao: av.competencias.comunicacao || 3,
        comunicacaoComentario: av.competencias.comunicacaoComentario || '',
        participacao: av.competencias.participacao || 3,
        participacaoComentario: av.competencias.participacaoComentario || '',
        superacaoDesafios: av.competencias.superacaoDesafios || 3,
        superacaoDesafiosComentario: av.competencias.superacaoDesafiosComentario || ''
      }
    });
    setShowModal(true);
  };

  const canEditAvaliacao = (av: AvaliacaoAluno) => {
    if (isAdmin) return true;
    if (!isInstrutor) return false;
    // Instrutor pode editar suas próprias avaliações
    const currentName = (currentUser?.nome || currentUser?.username || '').toLowerCase();
    const avName = (av.instrutorNome || '').toLowerCase();
    const currentId = currentUser?.id ? String(currentUser.id) : '';
    const avId = av.instrutorId ? String(av.instrutorId) : '';
    return (currentId && avId && currentId === avId) || (currentName && avName && currentName === avName);
  };

  const handleSaveAvaliacao = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const url = editingId ? `/api/avaliacoes/${editingId}` : `/api/alunos/${alunoId}/avaliacoes`;
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          dataAvaliacao: formData.dataAvaliacao,
          instrutorNome: formData.instrutorNome,
          observacoesGerais: formData.observacoesGerais,
          competencias: formData.competencias
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar avaliação.');
      }

      setShowModal(false);
      await fetchAvaliacoes();
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar avaliação.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAvaliacao = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem('inspira_auth_token');
      const res = await fetch(`/api/avaliacoes/${deleteConfirm.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao excluir avaliação.');
      }

      setDeleteConfirm(null);
      await fetchAvaliacoes();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir avaliação.');
    } finally {
      setDeleting(false);
    }
  };

  // Cálculo de média em tempo real no formulário
  const currentModalMedia = useMemo(() => {
    const c = formData.competencias;
    const sum = (c.disciplina || 3) + 
                (c.responsabilidade || 3) + 
                (c.trabalhoEquipe || 3) + 
                (c.lideranca || 3) + 
                (c.comunicacao || 3) + 
                (c.participacao || 3) + 
                (c.superacaoDesafios || 3);
    return (sum / 7).toFixed(1);
  }, [formData.competencias]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    if (avaliacoes.length === 0) return null;
    const sorted = [...avaliacoes].sort((a, b) => new Date(a.dataAvaliacao).getTime() - new Date(b.dataAvaliacao).getTime());
    const primeira = sorted[0];
    const ultima = sorted[sorted.length - 1];
    const mediaGeralUltima = ultima.mediaGeral;
    const diff = Number((ultima.mediaGeral - primeira.mediaGeral).toFixed(2));

    // Médias por competência da última avaliação
    const c = ultima.competencias;
    const compScores = [
      { name: 'Disciplina', score: c.disciplina },
      { name: 'Responsabilidade', score: c.responsabilidade },
      { name: 'Trabalho em Equipe', score: c.trabalhoEquipe },
      { name: 'Liderança', score: c.lideranca },
      { name: 'Comunicação', score: c.comunicacao },
      { name: 'Participação', score: c.participacao },
      { name: 'Superação', score: c.superacaoDesafios },
    ];
    compScores.sort((a, b) => b.score - a.score);
    const pontoForte = compScores[0];
    const pontoDesenvolver = compScores[compScores.length - 1];

    return {
      total: avaliacoes.length,
      primeira,
      ultima,
      mediaGeralUltima,
      diff,
      pontoForte,
      pontoDesenvolver
    };
  }, [avaliacoes]);

  // Lista de avaliações ordenadas para exibição no histórico (mais recente primeiro)
  const historicoOrdenado = useMemo(() => {
    return [...avaliacoes].sort((a, b) => new Date(b.dataAvaliacao).getTime() - new Date(a.dataAvaliacao).getTime() || b.id - a.id);
  }, [avaliacoes]);

  // Dados para o Gráfico Cronológico (ordenado da mais antiga para a mais recente)
  const cronologico = useMemo(() => {
    return [...avaliacoes].sort((a, b) => new Date(a.dataAvaliacao).getTime() - new Date(b.dataAvaliacao).getTime() || a.id - b.id);
  }, [avaliacoes]);

  const toggleExpand = (id: number) => {
    setExpandedCards(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (score >= 3.5) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    if (score >= 2.5) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    return 'text-red-400 bg-red-500/10 border-red-500/20';
  };

  const getScoreBadgeText = (score: number) => {
    if (score >= 4.5) return 'Excelente';
    if (score >= 3.5) return 'Muito Bom';
    if (score >= 2.5) return 'Adequado';
    return 'Atenção';
  };

  return (
    <div className="space-y-6">
      {/* Header com Resumo e Ação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0d1a23] border border-[#1a2e3d] rounded-2xl p-4 sm:p-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[rgba(245,195,59,0.12)] border border-[rgba(245,195,59,0.25)] flex items-center justify-center text-[#f5c33b]">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Evolução e Competências</h3>
              <p className="text-xs text-[#8fa2ad]">
                Acompanhamento do desenvolvimento comportamental e liderança de {nomeAluno}
              </p>
            </div>
          </div>
        </div>

        {(isAdmin || isInstrutor) && (
          <button
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#f5c33b] hover:bg-[#e0b030] text-[#08141e] font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-[#f5c33b]/10 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nova Avaliação</span>
          </button>
        )}
      </div>

      {/* Cards de Métricas Principais */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#0b1720] border border-[#1a2e3d] rounded-xl p-4">
            <span className="text-[11px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Média Atual</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.mediaGeralUltima.toFixed(1)}</span>
              <span className="text-xs text-[#8fa2ad]">/ 5.0</span>
            </div>
            <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[11px] font-bold border ${getScoreColor(stats.mediaGeralUltima)}`}>
              {getScoreBadgeText(stats.mediaGeralUltima)}
            </span>
          </div>

          <div className="bg-[#0b1720] border border-[#1a2e3d] rounded-xl p-4">
            <span className="text-[11px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Avaliações</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-white">{stats.total}</span>
              <span className="text-xs text-[#8fa2ad]">registradas</span>
            </div>
            <p className="text-[11px] text-[#8fa2ad] mt-2 truncate">
              Última: {new Date(stats.ultima.dataAvaliacao + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
          </div>

          <div className="bg-[#0b1720] border border-[#1a2e3d] rounded-xl p-4">
            <span className="text-[11px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Trajetória</span>
            <div className="flex items-center gap-2">
              {stats.diff > 0 ? (
                <div className="flex items-center text-emerald-400 font-black text-xl sm:text-2xl">
                  <ArrowUpRight className="w-5 h-5 mr-0.5" /> +{stats.diff}
                </div>
              ) : stats.diff < 0 ? (
                <div className="flex items-center text-red-400 font-black text-xl sm:text-2xl">
                  <ArrowDownRight className="w-5 h-5 mr-0.5" /> {stats.diff}
                </div>
              ) : (
                <div className="flex items-center text-[#8fa2ad] font-black text-xl sm:text-2xl">
                  <Minus className="w-5 h-5 mr-0.5" /> Estável
                </div>
              )}
            </div>
            <p className="text-[11px] text-[#8fa2ad] mt-2">Desde a 1ª avaliação</p>
          </div>

          <div className="bg-[#0b1720] border border-[#1a2e3d] rounded-xl p-4">
            <span className="text-[11px] font-bold text-[#8fa2ad] uppercase tracking-wider block mb-1">Destaque</span>
            <div className="text-base font-bold text-[#f5c33b] truncate">
              {stats.pontoForte.name}
            </div>
            <p className="text-[11px] text-[#8fa2ad] mt-2">
              Nota {stats.pontoForte.score}/5 na última sessão
            </p>
          </div>
        </div>
      )}

      {/* 4. GRÁFICO SIMPLES DE EVOLUÇÃO */}
      <div className="bg-[#0b1720] border border-[#1a2e3d] rounded-2xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#f5c33b]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Gráfico de Evolução ao Longo do Tempo
            </h4>
          </div>

          {/* Seletor de Métrica para o Gráfico */}
          {cronologico.length > 0 && (
            <select
              value={graficoFiltro}
              onChange={(e) => setGraficoFiltro(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-[rgba(255,255,255,0.1)] bg-[#0d1a23] text-xs font-semibold text-white focus:border-[#f5c33b] focus:outline-none cursor-pointer"
            >
              <option value="media">Média Geral</option>
              {COMPETENCIAS_LIST.map(c => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          )}
        </div>

        {cronologico.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-[#1a2e3d] rounded-xl">
            <TrendingUp className="w-10 h-10 text-[#425867] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#8fa2ad]">Nenhuma avaliação registrada ainda.</p>
            <p className="text-xs text-[#5a7180] mt-1">
              Clique em "+ Nova Avaliação" acima para registrar a primeira nota do aluno.
            </p>
          </div>
        ) : cronologico.length === 1 ? (
          <div className="py-8 px-4 bg-[#0d1a23]/60 border border-[#1a2e3d] rounded-xl flex flex-col items-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#f5c33b]/10 border border-[#f5c33b]/20 flex items-center justify-center text-[#f5c33b]">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div>
              <h5 className="text-sm font-bold text-white">Primeira Avaliação Registrada</h5>
              <p className="text-xs text-[#8fa2ad] mt-0.5">
                Média Geral de <strong>{cronologico[0].mediaGeral.toFixed(1)}/5.0</strong> em {new Date(cronologico[0].dataAvaliacao + 'T12:00:00').toLocaleDateString('pt-BR')}.
              </p>
              <p className="text-xs text-[#5a7180] mt-2">
                Conforme novas avaliações forem realizadas, a curva comparativa de progresso será traçada aqui.
              </p>
            </div>
          </div>
        ) : (
          /* Gráfico Visual Dinâmico SVG */
          <div className="space-y-4">
            <div className="relative w-full h-52 sm:h-64 bg-[#0d1a23] border border-[#1a2e3d] rounded-xl p-4 flex flex-col justify-between overflow-hidden">
              {/* Linhas de Grade de 1 a 5 */}
              <div className="absolute inset-x-8 inset-y-6 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-[#8fa2ad] w-full" />
                <div className="border-b border-[#8fa2ad] w-full" />
                <div className="border-b border-[#8fa2ad] w-full" />
                <div className="border-b border-[#8fa2ad] w-full" />
                <div className="border-b border-[#8fa2ad] w-full" />
              </div>

              {/* Rótulos do Eixo Y */}
              <div className="absolute left-2 inset-y-6 flex flex-col justify-between text-[10px] font-mono text-[#8fa2ad] pointer-events-none">
                <span>5.0</span>
                <span>4.0</span>
                <span>3.0</span>
                <span>2.0</span>
                <span>1.0</span>
              </div>

              {/* Renderização da Linha SVG e Pontos */}
              <div className="relative w-full h-full pl-6 pr-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#f5c33b" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#f5c33b" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Cálculo dos pontos */}
                  {(() => {
                    const count = cronologico.length;
                    const points = cronologico.map((av, index) => {
                      const x = (index / (count - 1)) * 96 + 2; // Margem lateral de 2 a 98%
                      let val = av.mediaGeral;
                      if (graficoFiltro !== 'media') {
                        val = (av.competencias as any)[graficoFiltro] || 3;
                      }
                      // Mapear de 1.0 (bottom, y=95) a 5.0 (top, y=5)
                      const y = 95 - ((val - 1) / 4) * 90;
                      return { x, y, val, av, index };
                    });

                    const pathString = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x},${pt.y}`, '');
                    const areaString = `${pathString} L ${points[points.length - 1].x},100 L ${points[0].x},100 Z`;

                    return (
                      <>
                        <path d={areaString} fill="url(#lineGrad)" />
                        <path d={pathString} fill="none" stroke="#f5c33b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map((pt) => (
                          <g key={pt.av.id}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="3.5"
                              fill="#08141e"
                              stroke="#f5c33b"
                              strokeWidth="2"
                              className="transition hover:scale-150 cursor-pointer"
                            />
                          </g>
                        ))}
                      </>
                    );
                  })()}
                </svg>

                {/* Marcadores e rótulos abaixo de cada avaliação */}
                <div className="absolute inset-x-6 bottom-0 flex justify-between">
                  {cronologico.map((av, idx) => {
                    let val = av.mediaGeral;
                    if (graficoFiltro !== 'media') {
                      val = (av.competencias as any)[graficoFiltro] || 3;
                    }
                    return (
                      <div key={av.id} className="flex flex-col items-center -translate-x-1/2">
                        <span className="text-[11px] font-bold text-white font-mono bg-[#08141e] px-1.5 py-0.5 rounded border border-[#1a2e3d]">
                          {Number(val).toFixed(1)}
                        </span>
                        <span className="text-[9px] text-[#8fa2ad] mt-1 whitespace-nowrap hidden sm:block">
                          Av. {idx + 1} ({new Date(av.dataAvaliacao + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-[#8fa2ad] px-1">
              <span>Evolução contínua ao longo das avaliações</span>
              <span className="text-[#f5c33b] font-medium">
                {graficoFiltro === 'media' ? 'Média Geral de Competências' : COMPETENCIAS_LIST.find(c => c.key === graficoFiltro)?.label}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. HISTÓRICO DE EVOLUÇÃO */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#f5c33b]" />
            <h4 className="text-sm font-bold text-white uppercase tracking-wider">
              Histórico de Avaliações ({historicoOrdenado.length})
            </h4>
          </div>
        </div>

        {historicoOrdenado.length === 0 ? (
          <div className="bg-[#0b1720] border border-[#1a2e3d] rounded-2xl p-8 text-center text-[#8fa2ad]">
            Nenhum registro no histórico.
          </div>
        ) : (
          <div className="space-y-4">
            {historicoOrdenado.map((av, index) => {
              const isExpanded = expandedCards[av.id] ?? (index === 0);
              const canEdit = canEditAvaliacao(av);

              return (
                <div
                  key={av.id}
                  className="bg-[#0b1720] border border-[#1a2e3d] rounded-2xl p-4 sm:p-5 transition hover:border-[#2a455a] space-y-4"
                >
                  {/* Top Bar do Card */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#112331] border border-[#1a2e3d] flex items-center justify-center font-bold text-white">
                        #{historicoOrdenado.length - index}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-white">
                            {new Date(av.dataAvaliacao + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${getScoreColor(av.mediaGeral)}`}>
                            Média {av.mediaGeral.toFixed(1)} / 5.0
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-[#8fa2ad] mt-0.5">
                          <User className="w-3.5 h-3.5" />
                          <span>Instrutor: <strong>{av.instrutorNome}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEditModal(av)}
                          className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] hover:bg-[#f5c33b] hover:text-[#08141e] text-xs font-semibold text-[#8fa2ad] transition flex items-center gap-1 cursor-pointer"
                          title="Editar avaliação"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Editar</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          onClick={() => setDeleteConfirm({ id: av.id, data: av.dataAvaliacao, instrutor: av.instrutorNome })}
                          className="px-2.5 py-1.5 rounded-lg bg-red-950/20 hover:bg-red-500 hover:text-white text-xs font-semibold text-red-400 border border-red-500/10 transition flex items-center gap-1 cursor-pointer"
                          title="Excluir avaliação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Excluir</span>
                        </button>
                      )}

                      <button
                        onClick={() => toggleExpand(av.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.08)] text-xs text-[#8fa2ad] transition flex items-center gap-1 cursor-pointer"
                      >
                        {isExpanded ? (
                          <>
                            <span>Ocultar detalhes</span>
                            <ChevronUp className="w-3.5 h-3.5" />
                          </>
                        ) : (
                          <>
                            <span>Ver notas & comentários</span>
                            <ChevronDown className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Observações Gerais */}
                  {av.observacoesGerais && (
                    <div className="p-3 bg-[#0d1a23] border border-[#1a2e3d] rounded-xl text-xs text-[#d1dee8] leading-relaxed">
                      <strong className="text-[#f5c33b] block mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Parecer Geral do Instrutor:
                      </strong>
                      "{av.observacoesGerais}"
                    </div>
                  )}

                  {/* Detalhes das Competências */}
                  {isExpanded && (
                    <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                      <span className="text-xs font-bold text-[#8fa2ad] uppercase tracking-wider block mb-2">
                        Avaliação por Competências (1 a 5)
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {COMPETENCIAS_LIST.map((comp) => {
                          const nota = (av.competencias as any)[comp.key] || 3;
                          const comentario = (av.competencias as any)[comp.commentKey] || '';

                          return (
                            <div
                              key={comp.key}
                              className="p-3 bg-[#0d1a23]/60 border border-[rgba(255,255,255,0.06)] rounded-xl flex flex-col justify-between gap-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-white">{comp.label}</span>
                                <div className="flex items-center gap-1.5">
                                  <div className="flex">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star
                                        key={star}
                                        className={`w-3.5 h-3.5 ${
                                          star <= nota
                                            ? 'text-[#f5c33b] fill-current'
                                            : 'text-[#2a3c48]'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className="text-xs font-mono font-bold text-[#f5c33b]">
                                    {nota}/5
                                  </span>
                                </div>
                              </div>

                              {comentario ? (
                                <p className="text-[11px] text-[#9bb0be] italic bg-[rgba(255,255,255,0.02)] p-1.5 rounded border border-[rgba(255,255,255,0.04)]">
                                  "{comentario}"
                                </p>
                              ) : (
                                <span className="text-[10px] text-[#4b606e]">Sem observação específica.</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preparação Futura: Metas, Missões e Certificados */}
      <div className="bg-[#0b1720]/50 border border-dashed border-[#1a2e3d] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f5c33b]/10 text-[#f5c33b] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h5 className="text-xs font-bold text-white">Preparado para Próximos Módulos</h5>
            <p className="text-[11px] text-[#8fa2ad]">
              Metas individuais, missões práticas e certificados de evolução prontos para integração.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[11px] text-[#8fa2ad]">
            Metas
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[11px] text-[#8fa2ad]">
            Missões
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-[11px] text-[#8fa2ad]">
            Certificados
          </span>
        </div>
      </div>

      {/* MODAL: NOVA OU EDITAR AVALIAÇÃO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !submitting && setShowModal(false)} />
          <div className="relative w-full max-w-2xl bg-[#0b1b26] border border-[#1a2e3d] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Header Modal */}
            <div className="p-4 sm:p-5 border-b border-[rgba(255,255,255,0.08)] flex items-center justify-between shrink-0 bg-[#08141e]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[rgba(245,195,59,0.15)] text-[#f5c33b] flex items-center justify-center">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingId ? 'Editar Avaliação de Desempenho' : 'Nova Avaliação de Desempenho'}
                  </h3>
                  <p className="text-xs text-[#8fa2ad]">Aluno: {nomeAluno}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-[#8fa2ad] uppercase block">Média Atual</span>
                  <span className="text-base font-black text-[#f5c33b]">{currentModalMedia} / 5.0</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-full bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#9dafb9] flex items-center justify-center cursor-pointer transition"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveAvaliacao} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {/* Campos Gerais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase mb-1.5">
                    Data da Avaliação *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.dataAvaliacao}
                    onChange={(e) => setFormData({ ...formData, dataAvaliacao: e.target.value })}
                    className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#8fa2ad] uppercase mb-1.5">
                    Instrutor Responsável *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.instrutorNome}
                    onChange={(e) => setFormData({ ...formData, instrutorNome: e.target.value })}
                    placeholder="Nome do Instrutor"
                    className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Observações Gerais */}
              <div>
                <label className="block text-xs font-bold text-[#8fa2ad] uppercase mb-1.5">
                  Observações Gerais da Sessão
                </label>
                <textarea
                  rows={3}
                  value={formData.observacoesGerais}
                  onChange={(e) => setFormData({ ...formData, observacoesGerais: e.target.value })}
                  placeholder="Comportamento geral, evolução percebida, orientações dadas ao aluno..."
                  className="w-full bg-[#112331] border border-[#1a2e3d] rounded-xl p-3 text-white text-sm focus:border-[#f5c33b] focus:outline-none transition resize-none"
                />
              </div>

              {/* Competências com Notas de 1 a 5 e Comentário */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.08)] pb-2">
                  <h4 className="text-sm font-bold text-[#f5c33b] uppercase tracking-wider">
                    Avaliação por Competências (1 a 5)
                  </h4>
                  <span className="text-xs text-[#8fa2ad]">
                    Média: <strong className="text-white">{currentModalMedia}</strong>
                  </span>
                </div>

                <div className="space-y-4">
                  {COMPETENCIAS_LIST.map((comp) => {
                    const currentNota = (formData.competencias as any)[comp.key] || 3;
                    const currentComentario = (formData.competencias as any)[comp.commentKey] || '';

                    return (
                      <div
                        key={comp.key}
                        className="p-3.5 bg-[#0d1a23] border border-[#1a2e3d] rounded-xl space-y-2.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-bold text-white block">{comp.label}</span>
                            <span className="text-[11px] text-[#8fa2ad] leading-tight block">
                              {comp.descricao}
                            </span>
                          </div>

                          {/* Seletor de Nota 1 a 5 */}
                          <div className="flex items-center gap-1 self-start sm:self-center shrink-0">
                            {[1, 2, 3, 4, 5].map((nota) => {
                              const isSelected = currentNota === nota;
                              return (
                                <button
                                  type="button"
                                  key={nota}
                                  onClick={() => {
                                    setFormData({
                                      ...formData,
                                      competencias: {
                                        ...formData.competencias,
                                        [comp.key]: nota
                                      }
                                    });
                                  }}
                                  className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#f5c33b] text-[#08141e] shadow-md shadow-[#f5c33b]/20 scale-105'
                                      : 'bg-[#112331] text-[#8fa2ad] hover:text-white hover:bg-[#1a2e3d]'
                                  }`}
                                  title={`Nota ${nota}`}
                                >
                                  {nota}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Campo de Comentário da Competência */}
                        <div>
                          <input
                            type="text"
                            value={currentComentario}
                            onChange={(e) => {
                              setFormData({
                                ...formData,
                                competencias: {
                                  ...formData.competencias,
                                  [comp.commentKey]: e.target.value
                                }
                              });
                            }}
                            placeholder={`Comentário sobre ${comp.label.toLowerCase()} (opcional)...`}
                            className="w-full bg-[#112331]/70 border border-[#1a2e3d] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#4e6473] focus:border-[#f5c33b] focus:outline-none transition"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Botões de Ação do Modal */}
              <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-sm font-semibold text-[#8fa2ad] transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-[#f5c33b] hover:bg-[#e0b030] text-[#08141e] text-sm font-bold shadow-lg shadow-[#f5c33b]/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Salvando...' : 'Salvar Avaliação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setDeleteConfirm(null)} />
          <div className="relative w-full max-w-md bg-[#0b1b26] border border-[#1a2e3d] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Excluir Avaliação?</h3>
                <p className="text-xs text-[#8fa2ad] mt-0.5">
                  Tem certeza que deseja apagar a avaliação de {new Date(deleteConfirm.data + 'T12:00:00').toLocaleDateString('pt-BR')} registrada por {deleteConfirm.instrutor}?
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.1)] text-[#9dafb9] text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteAvaliacao}
                className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg transition"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
