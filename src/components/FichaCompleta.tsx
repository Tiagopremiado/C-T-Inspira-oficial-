import React, { useState, useEffect, useRef } from 'react';
import { Check, ArrowLeft, Upload, FileText, AlertCircle, ShieldCheck } from 'lucide-react';

interface FichaCompletaProps {
  onNavigate: (route: string) => void;
}

export const FichaCompleta: React.FC<FichaCompletaProps> = ({ onNavigate }) => {
  const [refId, setRefId] = useState('');
  
  // Participant Info
  const [nome, setNome] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [whats, setWhats] = useState('');
  const [cidade, setCidade] = useState('');
  const [bairro, setBairro] = useState('');
  const [endereco, setEndereco] = useState('');

  // Studies & Routine
  const [escola, setEscola] = useState('');
  const [curso, setCurso] = useState('');
  const [objetivos, setObjetivos] = useState('');

  // Guardian
  const [responsavel, setResponsavel] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [whatsResponsavel, setWhatsResponsavel] = useState('');

  // Health & Safety
  const [possuiLaudo, setPossuiLaudo] = useState('');
  const [cid, setCid] = useState('');
  const [laudoFile, setLaudoFile] = useState<File | null>(null);
  const [temAlergia, setTemAlergia] = useState('');
  const [alergias, setAlergias] = useState('');
  const [usaMedicamento, setUsaMedicamento] = useState('');
  const [medicamentos, setMedicamentos] = useState('');
  const [restricoes, setRestricoes] = useState('');
  const [condicoesSaude, setCondicoesSaude] = useState('');
  const [emergenciaNome, setEmergenciaNome] = useState('');
  const [emergenciaFone, setEmergenciaFone] = useState('');
  const [orientacaoEmergencia, setOrientacaoEmergencia] = useState('');
  const [seguranca, setSeguranca] = useState('');

  // Authorizations
  const [consentDados, setConsentDados] = useState(false);
  const [consentSaude, setConsentSaude] = useState(false);
  const [consentImagem, setConsentImagem] = useState(false);
  const [consentRegras, setConsentRegras] = useState(false);

  // States
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const successRef = useRef<HTMLDivElement>(null);

  // Read URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref') || '';
    const alunoParam = params.get('aluno') || '';
    const cidadeParam = params.get('cidade') || '';
    const respParam = params.get('responsavel') || '';

    if (refParam) setRefId(refParam);
    if (alunoParam) setNome(alunoParam);
    if (cidadeParam) setCidade(cidadeParam);
    if (respParam) setResponsavel(respParam);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!consentDados || !consentSaude || !consentRegras) {
      setErrorMsg('Por favor, aceite as declarações e autorizações obrigatórias para prosseguir.');
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('ref', refId);
      formData.append('nome', nome.trim());
      formData.append('nascimento', nascimento);
      formData.append('whats', whats.trim());
      formData.append('cidade', cidade.trim());
      formData.append('bairro', bairro.trim());
      formData.append('endereco', endereco.trim());

      formData.append('escola', escola.trim());
      formData.append('curso', curso.trim());
      formData.append('objetivos', objetivos.trim());

      formData.append('responsavel', responsavel.trim());
      formData.append('parentesco', parentesco.trim());
      formData.append('whatsResponsavel', whatsResponsavel.trim());

      formData.append('possuiLaudo', possuiLaudo);
      formData.append('cid', cid.trim());
      if (laudoFile) {
        formData.append('laudoArquivo', laudoFile);
      }

      formData.append('temAlergia', temAlergia);
      formData.append('alergias', alergias.trim());

      formData.append('usaMedicamento', usaMedicamento);
      formData.append('medicamentos', medicamentos.trim());

      formData.append('restricoes', restricoes.trim());
      formData.append('condicoesSaude', condicoesSaude.trim());

      formData.append('emergenciaNome', emergenciaNome.trim());
      formData.append('emergenciaFone', emergenciaFone.trim());
      formData.append('orientacaoEmergencia', orientacaoEmergencia.trim());
      formData.append('seguranca', seguranca.trim());

      formData.append('autorizaImagem', String(consentImagem));

      const res = await fetch('/api/cadastros-completos', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar ficha completa.');
      }

      setSubmitted(true);
      setTimeout(() => {
        successRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao comunicar com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen text-[#f5f7f9] bg-[radial-gradient(circle_at_85%_0%,rgba(22,134,193,0.14),transparent_25%),linear-gradient(180deg,#061018,#07131d)] pb-16">
      {/* Top Header */}
      <header className="border-b border-[rgba(255,255,255,0.09)] py-4 bg-[rgba(6,16,24,0.94)] backdrop-blur-md sticky top-0 z-20">
        <div className="w-[min(780px,calc(100%-24px))] mx-auto flex items-center justify-between">
          <button
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-[#9dafb9] hover:text-white transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao site</span>
          </button>
          <img
            src="/assets/logo-inspira.png"
            alt="Centro de Treinamento Inspira"
            className="h-11 sm:h-12 w-auto object-contain"
          />
          <div className="w-16"></div>
        </div>
      </header>

      {/* Main Card */}
      <main className="pt-8 px-3">
        <div className="w-[min(780px,calc(100%-24px))] mx-auto">
          <div className="p-6 sm:p-8 rounded-3xl bg-[linear-gradient(180deg,rgba(12,27,39,0.97),rgba(8,18,26,0.98))] border border-[rgba(84,160,212,0.14)] shadow-[0_28px_80px_rgba(0,0,0,0.32)]">
            {submitted ? (
              <>
                <span className="text-emerald-400 text-xs font-black uppercase tracking-[0.13em] flex items-center gap-1.5">
                  <Check className="w-4 h-4 stroke-[3]" /> Cadastro Concluído
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-2.5">
                  Ficha finalizada com sucesso!
                </h1>
                <p className="text-[#a7b6bf] leading-relaxed text-sm sm:text-base mb-6">
                  Seus dados foram enviados com sucesso para a coordenação do Inspira. Obrigado por preencher todas as informações.
                </p>
              </>
            ) : (
              <>
                <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.13em]">
                  Cadastro completo
                </span>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white mt-2 mb-2.5">
                  Ficha do participante
                </h1>
                <p className="text-[#a7b6bf] leading-relaxed text-sm sm:text-base mb-6">
                  Complete as informações abaixo para que a equipe do Inspira possa organizar a participação, o contato com a família e as atividades com mais segurança.
                </p>
              </>
            )}

            {submitted ? (
              <div
                ref={successRef}
                className="p-6 rounded-2xl bg-[radial-gradient(circle_at_90%_0%,rgba(245,195,59,0.12),transparent_28%),linear-gradient(145deg,rgba(9,41,46,0.96),rgba(7,24,33,0.98))] border border-[rgba(64,185,198,0.3)] text-[#cef8fb]"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ffe27a] to-[#f5c33b] text-[#181100] flex items-center justify-center font-black text-xl mb-3">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <strong className="block text-xl font-bold text-white mb-2">Ficha enviada com sucesso!</strong>
                <p className="text-[#cef8fb] leading-relaxed text-sm sm:text-base mb-4">
                  A equipe do Inspira recebeu esta etapa do cadastro no banco de dados e dará continuidade ao atendimento com a sua família.
                </p>
                <div className="p-4 rounded-xl bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.07)] text-sm text-[#d8e4e8]">
                  <div className="flex items-center gap-2 text-[#ffe27a] font-bold mb-1">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Dados e informações de saúde protegidos</span>
                  </div>
                  Todas as informações foram arquivadas em conformidade com as diretrizes do Comando Geral do Inspira.
                </div>
                <button
                  onClick={() => onNavigate('landing')}
                  className="mt-6 w-full py-3.5 rounded-xl bg-[linear-gradient(135deg,#ffe27a,#f5c33b)] text-[#171100] font-black text-sm cursor-pointer shadow-lg transition hover:opacity-90"
                >
                  Voltar para a página inicial
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMsg && (
                  <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/40 text-red-200 text-sm flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Seção 1: Dados do Participante */}
                <div>
                  <div className="text-[#ffe27a] text-xs font-black uppercase tracking-wider mb-3">
                    Dados do participante
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label htmlFor="fc-nome" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        Nome completo *
                      </label>
                      <input
                        id="fc-nome"
                        type="text"
                        required
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-nascimento" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Data de nascimento *
                        </label>
                        <input
                          id="fc-nascimento"
                          type="date"
                          required
                          value={nascimento}
                          onChange={(e) => setNascimento(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="fc-whats" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          WhatsApp do participante
                        </label>
                        <input
                          id="fc-whats"
                          type="tel"
                          value={whats}
                          onChange={(e) => setWhats(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-cidade" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Cidade *
                        </label>
                        <input
                          id="fc-cidade"
                          type="text"
                          required
                          value={cidade}
                          onChange={(e) => setCidade(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="fc-bairro" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Bairro
                        </label>
                        <input
                          id="fc-bairro"
                          type="text"
                          value={bairro}
                          onChange={(e) => setBairro(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="fc-endereco" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        Endereço
                      </label>
                      <input
                        id="fc-endereco"
                        type="text"
                        placeholder="Rua, número e complemento"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                        className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 2: Estudos e Rotina */}
                <div className="pt-3">
                  <div className="text-[#ffe27a] text-xs font-black uppercase tracking-wider mb-3">
                    Estudos e rotina
                  </div>

                  <div className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-escola" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Escola / instituição
                        </label>
                        <input
                          id="fc-escola"
                          type="text"
                          value={escola}
                          onChange={(e) => setEscola(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="fc-curso" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Ano / curso
                        </label>
                        <input
                          id="fc-curso"
                          type="text"
                          value={curso}
                          onChange={(e) => setCurso(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="fc-objetivos" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        O que você espera desenvolver no Inspira?
                      </label>
                      <textarea
                        id="fc-objetivos"
                        rows={3}
                        value={objetivos}
                        onChange={(e) => setObjetivos(e.target.value)}
                        placeholder="Ex.: disciplina, confiança, trabalho em equipe, preparo físico, liderança..."
                        className="w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white p-3.5 focus:border-[#f5c33b] focus:outline-none transition resize-y text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 3: Responsável */}
                <div className="pt-3">
                  <div className="text-[#ffe27a] text-xs font-black uppercase tracking-wider mb-3">
                    Responsável
                  </div>

                  <div className="space-y-3.5">
                    <div>
                      <label htmlFor="fc-responsavel" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        Nome completo do responsável
                      </label>
                      <input
                        id="fc-responsavel"
                        type="text"
                        value={responsavel}
                        onChange={(e) => setResponsavel(e.target.value)}
                        className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-parentesco" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Parentesco
                        </label>
                        <input
                          id="fc-parentesco"
                          type="text"
                          value={parentesco}
                          onChange={(e) => setParentesco(e.target.value)}
                          placeholder="Ex.: mãe, pai, tutor"
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="fc-whats-resp" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          WhatsApp do responsável
                        </label>
                        <input
                          id="fc-whats-resp"
                          type="tel"
                          value={whatsResponsavel}
                          onChange={(e) => setWhatsResponsavel(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Seção 4: Saúde e Segurança */}
                <div className="pt-3">
                  <div className="text-[#ffe27a] text-xs font-black uppercase tracking-wider mb-1">
                    Saúde e segurança
                  </div>
                  <p className="text-[#a7b6bf] text-xs sm:text-sm leading-relaxed mb-4">
                    Estas informações serão usadas somente para organização e segurança durante as atividades.
                  </p>

                  <div className="space-y-3.5">
                    {/* Laudo & CID */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-possui-laudo" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Possui laudo ou documento de saúde relevante?
                        </label>
                        <select
                          id="fc-possui-laudo"
                          value={possuiLaudo}
                          onChange={(e) => setPossuiLaudo(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[#0d1a23] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        >
                          <option value="">Selecione</option>
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="fc-cid" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          CID, se houver
                        </label>
                        <input
                          id="fc-cid"
                          type="text"
                          placeholder="Opcional"
                          value={cid}
                          onChange={(e) => setCid(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Upload Real de Laudo */}
                    <div>
                      <label htmlFor="fc-laudo-arquivo" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        Anexar laudo ou documento de saúde
                      </label>
                      <div className="relative border-2 border-dashed border-[rgba(255,255,255,0.15)] rounded-2xl p-4 text-center hover:border-[#f5c33b] transition bg-[rgba(255,255,255,0.02)]">
                        <input
                          id="fc-laudo-arquivo"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setLaudoFile(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                          <Upload className="w-6 h-6 text-[#f5c33b]" />
                          {laudoFile ? (
                            <div className="text-sm font-semibold text-[#ffe27a] flex items-center gap-1.5">
                              <FileText className="w-4 h-4" />
                              <span>{laudoFile.name} ({(laudoFile.size / 1024).toFixed(1)} KB)</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-medium text-white">Clique para selecionar ou arraste o laudo</span>
                              <span className="text-xs text-[#8597a2]">Formatos aceitos: PDF, JPG, PNG (máx. 25MB). Armazenamento protegido.</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Alergias */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-tem-alergia" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Possui alergias?
                        </label>
                        <select
                          id="fc-tem-alergia"
                          value={temAlergia}
                          onChange={(e) => setTemAlergia(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[#0d1a23] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        >
                          <option value="">Selecione</option>
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="fc-alergias" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Quais alergias?
                        </label>
                        <input
                          id="fc-alergias"
                          type="text"
                          placeholder="Ex.: alimento, medicamento, insetos..."
                          value={alergias}
                          onChange={(e) => setAlergias(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Medicamentos */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-usa-medicamento" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Usa medicamento contínuo?
                        </label>
                        <select
                          id="fc-usa-medicamento"
                          value={usaMedicamento}
                          onChange={(e) => setUsaMedicamento(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[#0d1a23] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        >
                          <option value="">Selecione</option>
                          <option value="Não">Não</option>
                          <option value="Sim">Sim</option>
                        </select>
                      </div>

                      <div>
                        <label htmlFor="fc-medicamentos" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Medicamentos em uso
                        </label>
                        <input
                          id="fc-medicamentos"
                          type="text"
                          placeholder="Nome e horário, se necessário"
                          value={medicamentos}
                          onChange={(e) => setMedicamentos(e.target.value)}
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    {/* Restrições */}
                    <div>
                      <label htmlFor="fc-restricoes" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        Possui alguma restrição física, alimentar ou de atividade?
                      </label>
                      <textarea
                        id="fc-restricoes"
                        rows={2}
                        value={restricoes}
                        onChange={(e) => setRestricoes(e.target.value)}
                        placeholder="Ex.: esforço físico, alimentação, mobilidade, exposição ao sol, outras restrições..."
                        className="w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white p-3.5 focus:border-[#f5c33b] focus:outline-none transition resize-y text-sm"
                      />
                    </div>

                    {/* Condições de Saúde */}
                    <div>
                      <label htmlFor="fc-condicoes-saude" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        Há alguma condição de saúde ou orientação importante para participação segura?
                      </label>
                      <textarea
                        id="fc-condicoes-saude"
                        rows={2}
                        value={condicoesSaude}
                        onChange={(e) => setCondicoesSaude(e.target.value)}
                        placeholder="Informe apenas o que a equipe precisa saber para cuidar da segurança do participante."
                        className="w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white p-3.5 focus:border-[#f5c33b] focus:outline-none transition resize-y text-sm"
                      />
                    </div>

                    {/* Emergência */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="fc-emergencia-nome" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Contato de emergência
                        </label>
                        <input
                          id="fc-emergencia-nome"
                          type="text"
                          value={emergenciaNome}
                          onChange={(e) => setEmergenciaNome(e.target.value)}
                          placeholder="Nome da pessoa"
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>

                      <div>
                        <label htmlFor="fc-emergencia-fone" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                          Telefone de emergência
                        </label>
                        <input
                          id="fc-emergencia-fone"
                          type="tel"
                          value={emergenciaFone}
                          onChange={(e) => setEmergenciaFone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="w-full min-h-[48px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="fc-orientacao-emergencia" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        Orientação em caso de emergência
                      </label>
                      <textarea
                        id="fc-orientacao-emergencia"
                        rows={2}
                        value={orientacaoEmergencia}
                        onChange={(e) => setOrientacaoEmergencia(e.target.value)}
                        placeholder="Ex.: conduta recomendada, medicamento de resgate, pessoa a contatar primeiro..."
                        className="w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white p-3.5 focus:border-[#f5c33b] focus:outline-none transition resize-y text-sm"
                      />
                    </div>

                    <div>
                      <label htmlFor="fc-seguranca" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                        Outras informações importantes para a segurança do participante
                      </label>
                      <textarea
                        id="fc-seguranca"
                        rows={2}
                        value={seguranca}
                        onChange={(e) => setSeguranca(e.target.value)}
                        className="w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white p-3.5 focus:border-[#f5c33b] focus:outline-none transition resize-y text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Seção 5: Autorizações */}
                <div className="pt-3 border-t border-[rgba(255,255,255,0.08)]">
                  <div className="text-[#ffe27a] text-xs font-black uppercase tracking-wider mb-3">
                    Autorizações
                  </div>

                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer text-[#cbd5db] text-xs sm:text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        required
                        checked={consentDados}
                        onChange={(e) => setConsentDados(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded accent-[#f5c33b]"
                      />
                      <span>
                        Confirmo que as informações fornecidas são verdadeiras e autorizo seu uso para organização das atividades e contato relacionado ao Inspira. *
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer text-[#cbd5db] text-xs sm:text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        required
                        checked={consentSaude}
                        onChange={(e) => setConsentSaude(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded accent-[#f5c33b]"
                      />
                      <span>
                        Autorizo o tratamento das informações de saúde fornecidas exclusivamente para planejamento, prevenção e segurança durante as atividades do Inspira. *
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer text-[#cbd5db] text-xs sm:text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        checked={consentImagem}
                        onChange={(e) => setConsentImagem(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded accent-[#f5c33b]"
                      />
                      <span>
                        Autorizo o uso de imagem do participante em registros institucionais e divulgação do projeto.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer text-[#cbd5db] text-xs sm:text-sm leading-relaxed">
                      <input
                        type="checkbox"
                        required
                        checked={consentRegras}
                        onChange={(e) => setConsentRegras(e.target.checked)}
                        className="mt-1 w-4 h-4 rounded accent-[#f5c33b]"
                      />
                      <span>
                        Declaro ciência de que a participação seguirá orientações de segurança, disciplina e convivência estabelecidas pela organização. *
                      </span>
                    </label>
                  </div>
                </div>

                <button
                  id="btn-enviar-ficha-completa"
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[54px] rounded-2xl btn-inspira-gold text-base font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Salvando no banco de dados...' : 'Enviar ficha completa'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
