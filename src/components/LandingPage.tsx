import React, { useState, useEffect } from 'react';
import { ArrowRight, Check, X, Shield, Star, Users, Compass, Award, Heart, Lock, Calendar, Phone, MapPin, User, MessageSquare } from 'lucide-react';

interface LandingPageProps {
  onNavigate: (route: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoCadastro, setTipoCadastro] = useState<'aluno' | 'responsavel'>('aluno');
  const [nomeAluno, setNomeAluno] = useState('');
  const [nascimentoAluno, setNascimentoAluno] = useState('');
  const [cidadeAluno, setCidadeAluno] = useState('');
  const [whatsAluno, setWhatsAluno] = useState('');
  const [nomeResponsavel, setNomeResponsavel] = useState('');
  const [parentesco, setParentesco] = useState('');
  const [whatsResponsavel, setWhatsResponsavel] = useState('');
  const [contatoPreferido, setContatoPreferido] = useState('');
  const [observacao, setObservacao] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!whatsAluno.trim() && !whatsResponsavel.trim()) {
      setErrorMsg('Informe pelo menos um WhatsApp: do aluno ou do responsável.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/pre-cadastros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoCadastro,
          nomeAluno: nomeAluno.trim(),
          nascimentoAluno,
          cidadeAluno: cidadeAluno.trim(),
          whatsAluno: whatsAluno.trim(),
          nomeResponsavel: nomeResponsavel.trim(),
          parentesco: parentesco.trim(),
          whatsResponsavel: whatsResponsavel.trim(),
          contatoPreferido,
          observacao: observacao.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar cadastro');
      }

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de conexão com o servidor.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setNomeAluno('');
    setNascimentoAluno('');
    setCidadeAluno('');
    setWhatsAluno('');
    setNomeResponsavel('');
    setParentesco('');
    setWhatsResponsavel('');
    setContatoPreferido('');
    setObservacao('');
    setConsentimento(false);
    setSubmitted(false);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen text-[#f6f8fa] relative">
      {/* Top Floating Navigation */}
      <header className="absolute top-3 left-0 right-0 z-20">
        <div className="w-[min(1160px,calc(100%-28px))] mx-auto">
          <div className="w-full max-w-[620px] mx-auto py-1.5 px-3 rounded-2xl bg-[linear-gradient(180deg,rgba(10,22,32,0.92),rgba(6,14,21,0.86))] border border-[rgba(84,160,212,0.16)] backdrop-blur-md shadow-lg flex items-center justify-between gap-3">
            <a href="#inicio" className="flex items-center gap-2">
              <img src="/assets/logo-inspira.png" alt="Logo Centro de Treinamento Inspira" className="h-10 sm:h-12 w-auto object-contain" />
            </a>
            <button
              id="btn-nav-comando"
              onClick={() => onNavigate('comando')}
              className="btn-inspira-outline px-4 py-1.5 rounded-xl text-sm font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Shield className="w-4 h-4 text-[#f5c33b]" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="inicio" className="min-h-[100svh] relative flex items-center justify-center pt-28 pb-14 px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(26,139,200,0.18),transparent_35%),linear-gradient(180deg,rgba(5,10,16,0.94),rgba(8,17,27,0.85)_40%,rgba(7,17,28,0.98))]"></div>
        <div className="absolute left-0 right-0 bottom-0 h-44 -z-10 bg-gradient-to-b from-transparent to-[#061018]"></div>

        <div className="w-[min(1160px,calc(100%-28px))] mx-auto flex flex-col items-center text-center">
          {/* Hero Kicker Badge */}
          <div className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full border border-[rgba(245,195,59,0.25)] bg-[rgba(245,195,59,0.08)] text-[#ffe27a] text-xs font-black uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-[#f5c33b] animate-pulse"></span>
            <span>Centro de Treinamento Inspira</span>
          </div>

          {/* Hero Poster */}
          <div className="w-full max-w-[430px] p-2 rounded-3xl bg-[linear-gradient(180deg,rgba(11,26,39,0.95),rgba(6,13,20,0.97))] border border-[rgba(91,164,214,0.18)] shadow-[0_26px_70px_rgba(0,0,0,0.4),0_0_34px_rgba(21,118,181,0.14)]">
            <div className="aspect-[4/5] rounded-2xl overflow-hidden relative bg-[#091f2e]">
              <img
                src="/assets/766599195_122104169685421550_6270541774438738076_n.jpg"
                alt="Centro de Treinamento Inspira"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Hero CTA Button */}
          <div className="w-full max-w-[430px] mt-4">
            <button
              id="btn-hero-cadastro"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="w-full min-h-[54px] rounded-2xl btn-inspira-gold text-base font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Quero fazer parte</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <p className="max-w-[620px] mx-auto mt-4 text-[#d6e0e5] leading-relaxed text-sm sm:text-base">
            Uma experiência para adolescentes e jovens crescerem com <strong className="text-[#ffe27a]">disciplina, confiança, amizade e propósito</strong>.
          </p>
        </div>
      </section>

      {/* Section: Uma Experiência Completa */}
      <section id="sobre" className="py-20 border-t border-[rgba(255,255,255,0.05)]">
        <div className="w-[min(1160px,calc(100%-28px))] mx-auto">
          <div className="max-w-[760px] mx-auto text-center mb-10">
            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Uma experiência completa</span>
            <h2 className="mt-2.5 mb-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Formação que desenvolve disciplina, coragem e capacidade de superar desafios.
            </h2>
            <p className="text-[#a8b7c0] leading-relaxed text-base">
              Um ambiente criado para ajudar adolescentes e jovens a desenvolverem responsabilidade,
              foco, disciplina, confiança e trabalho em equipe. Por meio de desafios, aprendizado prático
              e convivência, o Inspira estimula cada participante a sair da zona de conforto, descobrir
              seu potencial e se preparar melhor para os desafios da vida, dos estudos e do futuro.
            </p>
          </div>

          {/* 4 Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <article className="rounded-3xl overflow-hidden bg-[linear-gradient(180deg,rgba(11,27,40,0.92),rgba(8,18,27,0.95))] border border-[rgba(84,160,212,0.14)] shadow-[0_0_22px_rgba(21,118,181,0.05)] flex flex-col">
              <div className="aspect-[4/3] overflow-hidden bg-[#0b2738]">
                <img src="/assets/card-pre-militar.jpg" alt="Metodologia pré-militar" className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Metodologia pré-militar</h3>
                  <p className="text-[#a8b7c0] text-sm leading-relaxed">
                    Metodologia pré-militar que desenvolve disciplina, concentração e preparação para a vida profissional.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl overflow-hidden bg-[linear-gradient(180deg,rgba(11,27,40,0.92),rgba(8,18,27,0.95))] border border-[rgba(84,160,212,0.14)] shadow-[0_0_22px_rgba(21,118,181,0.05)] flex flex-col">
              <div className="aspect-[4/3] overflow-hidden bg-[#0b2738]">
                <img src="/assets/card-disciplina.jpg" alt="Disciplina" className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Disciplina</h3>
                  <p className="text-[#a8b7c0] text-sm leading-relaxed">
                    Desafios que estimulam responsabilidade, constância, coragem e superação diária.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl overflow-hidden bg-[linear-gradient(180deg,rgba(11,27,40,0.92),rgba(8,18,27,0.95))] border border-[rgba(84,160,212,0.14)] shadow-[0_0_22px_rgba(21,118,181,0.05)] flex flex-col">
              <div className="aspect-[4/3] overflow-hidden bg-[#0b2738]">
                <img src="/assets/card-amizade.jpg" alt="Amizade" className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Amizade</h3>
                  <p className="text-[#a8b7c0] text-sm leading-relaxed">
                    Um ambiente para criar vínculos reais, caminhar em equipe e construir memórias marcantes.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-3xl overflow-hidden bg-[linear-gradient(180deg,rgba(11,27,40,0.92),rgba(8,18,27,0.95))] border border-[rgba(84,160,212,0.14)] shadow-[0_0_22px_rgba(21,118,181,0.05)] flex flex-col">
              <div className="aspect-[4/3] overflow-hidden bg-[#0b2738]">
                <img src="/assets/card-proposito.jpg" alt="Propósito" className="w-full h-full object-cover" />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Propósito</h3>
                  <p className="text-[#a8b7c0] text-sm leading-relaxed">
                    Direção para transformar potencial em atitude e viver uma história com significado e valor.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* Section: Por que o Inspira? */}
      <section className="py-20 border-t border-[rgba(255,255,255,0.05)] bg-[linear-gradient(180deg,transparent,#07141e_50%,transparent)]">
        <div className="w-[min(1160px,calc(100%-28px))] mx-auto">
          <div className="max-w-[860px] mx-auto text-center">
            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Por que o Inspira?</span>
            <h2 className="mt-2.5 mb-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Porque crescer é mais fácil quando se tem direção, desafio e pessoas ao lado.
            </h2>
            <p className="max-w-[760px] mx-auto text-[#a8b7c0] leading-relaxed text-base">
              O Inspira cria um ambiente onde adolescentes e jovens podem desenvolver confiança,
              disciplina, responsabilidade e capacidade de enfrentar desafios. Aqui, cada experiência
              é uma oportunidade de aprender, evoluir e descobrir até onde é possível chegar.
            </p>

            {/* 4 Mini Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mt-8 text-left">
              <div className="overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(10,22,33,0.90),rgba(8,16,24,0.92))] border border-[rgba(84,160,212,0.12)]">
                <div className="aspect-[4/3] overflow-hidden bg-[#0b2738]">
                  <img src="/assets/card-desafios-reais.jpg" alt="Desafios reais" className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <strong className="block text-[#ffe27a] font-bold text-sm mb-1">Desafios reais</strong>
                  <span className="text-[#a8b7c0] text-xs sm:text-sm leading-relaxed block">Experiências que tiram da zona de conforto.</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(10,22,33,0.90),rgba(8,16,24,0.92))] border border-[rgba(84,160,212,0.12)]">
                <div className="aspect-[4/3] overflow-hidden bg-[#0b2738]">
                  <img src="/assets/card-vida-equipe.jpg" alt="Vida em equipe" className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <strong className="block text-[#ffe27a] font-bold text-sm mb-1">Vida em equipe</strong>
                  <span className="text-[#a8b7c0] text-xs sm:text-sm leading-relaxed block">Convivência, apoio e construção de confiança.</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(10,22,33,0.90),rgba(8,16,24,0.92))] border border-[rgba(84,160,212,0.12)]">
                <div className="aspect-[4/3] overflow-hidden bg-[#0b2738]">
                  <img src="/assets/card-valores-cristaos.jpg" alt="Valores cristãos" className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <strong className="block text-[#ffe27a] font-bold text-sm mb-1">Valores cristãos</strong>
                  <span className="text-[#a8b7c0] text-xs sm:text-sm leading-relaxed block">Princípios fundamentais aplicados no dia a dia.</span>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-[linear-gradient(180deg,rgba(10,22,33,0.90),rgba(8,16,24,0.92))] border border-[rgba(84,160,212,0.12)]">
                <div className="aspect-[4/3] overflow-hidden bg-[#0b2738]">
                  <img src="/assets/card-ambiente-seguro.jpg" alt="Ambiente seguro" className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <strong className="block text-[#ffe27a] font-bold text-sm mb-1">Ambiente seguro</strong>
                  <span className="text-[#a8b7c0] text-xs sm:text-sm leading-relaxed block">Organização pensada para acolher e desenvolver.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final Panel */}
      <section className="py-20 border-t border-[rgba(255,255,255,0.05)]">
        <div className="w-[min(1160px,calc(100%-28px))] mx-auto">
          <div className="text-center p-8 sm:p-14 lg:p-16 rounded-3xl bg-[radial-gradient(circle_at_80%_10%,rgba(26,139,200,0.12),transparent_25%),linear-gradient(125deg,rgba(10,17,24,0.98),rgba(8,33,46,0.96))] border border-[rgba(84,160,212,0.14)] shadow-2xl">
            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Seu próximo passo</span>
            <h2 className="mt-2.5 mb-3 text-3xl sm:text-4xl font-extrabold text-white">
              Existe um lugar para você no Inspira.
            </h2>
            <p className="max-w-[680px] mx-auto text-[#cbd7dd] leading-relaxed text-sm sm:text-base">
              Faça seu pré-cadastro e nossa equipe entrará em contato pelo WhatsApp para apresentar os próximos passos.
            </p>
            <div className="mt-6 flex justify-center">
              <button
                id="btn-cta-cadastro"
                onClick={() => {
                  resetForm();
                  setModalOpen(true);
                }}
                className="btn-inspira-gold px-8 py-3.5 rounded-2xl text-base font-black flex items-center gap-2 cursor-pointer"
              >
                <span>Fazer pré-cadastro</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-[rgba(255,255,255,0.09)] text-[#8fa0a9] text-sm">
        <div className="w-[min(1160px,calc(100%-28px))] mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <a href="#inicio" className="flex items-center gap-2">
            <img src="/assets/logo-inspira.png" alt="Logo Inspira" className="h-12 sm:h-14 w-auto object-contain" />
          </a>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
            <button
              onClick={() => onNavigate('comando')}
              className="text-[#9dafb9] hover:text-[#f5c33b] font-medium transition flex items-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Login - Aluno / Comando</span>
            </button>
            <div className="text-center sm:text-right">
              © {new Date().getFullYear()} Centro de Treinamento Inspira.
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Pré-Cadastro */}
      {modalOpen && (
        <div
          id="modal-cadastro-overlay"
          className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalOpen(false);
          }}
        >
          <div className="w-full max-w-[620px] max-h-[92svh] overflow-y-auto p-6 sm:p-7 rounded-3xl bg-[#0b1721] border border-[rgba(255,255,255,0.12)] shadow-[0_28px_90px_rgba(0,0,0,0.65)] relative my-auto">
            {/* Close button */}
            <button
              id="btn-modal-close"
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 w-9 h-9 rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] text-white hover:bg-[rgba(255,255,255,0.1)] flex items-center justify-center cursor-pointer transition"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-[#f5c33b] text-xs font-black uppercase tracking-[0.14em]">Pré-cadastro Inspira</span>
            <h3 className="text-2xl sm:text-3xl font-bold text-white mt-1.5 mb-1">Quero fazer parte</h3>
            <p className="text-[#a8b7c0] text-sm leading-relaxed mb-5">
              Preencha os dados iniciais. A equipe do Inspira entrará em contato pelo WhatsApp para orientar os próximos passos.
            </p>

            {submitted ? (
              <div className="p-5 rounded-2xl bg-[radial-gradient(circle_at_90%_0%,rgba(245,195,59,0.12),transparent_30%),linear-gradient(145deg,rgba(9,41,46,0.96),rgba(7,24,33,0.98))] border border-[rgba(63,184,201,0.28)] text-[#cef8fb]">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ffe27a] to-[#f5c33b] text-[#181100] flex items-center justify-center font-black text-xl mb-3">
                  <Check className="w-6 h-6 stroke-[3]" />
                </div>
                <strong className="block text-xl font-bold text-white mb-1.5">Seu primeiro passo já foi dado.</strong>
                <p className="text-[#bde8ed] text-sm leading-relaxed">
                  Seu pré-cadastro foi recebido e registrado em nosso sistema. Em breve, a equipe do Inspira entrará em contato pelo WhatsApp informado para apresentar os próximos passos.
                </p>

                <div className="mt-4 p-3.5 rounded-xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]">
                  <b className="block text-[#ffe27a] text-xs uppercase tracking-wider mb-1.5">Agora imagine o próximo capítulo</b>
                  <p className="text-[#e6eef2] text-sm leading-relaxed">
                    Novos desafios, novas amizades, mais disciplina, confiança e histórias que você vai lembrar por muito tempo. O Inspira é um lugar para quem quer crescer, se superar e descobrir do que é capaz.
                  </p>
                </div>

                <div className="grid gap-2 mt-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[rgba(255,255,255,0.04)]">
                    <span className="w-6 h-6 rounded-full bg-[rgba(245,195,59,0.15)] text-[#ffe27a] flex items-center justify-center font-bold">1</span>
                    <span className="text-[#d8e4e8]">Pré-cadastro salvo no banco de dados</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[rgba(255,255,255,0.04)]">
                    <span className="w-6 h-6 rounded-full bg-[rgba(245,195,59,0.15)] text-[#ffe27a] flex items-center justify-center font-bold">2</span>
                    <span className="text-[#d8e4e8]">Nossa equipe entra em contato com você</span>
                  </div>
                  <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[rgba(255,255,255,0.04)]">
                    <span className="w-6 h-6 rounded-full bg-[rgba(245,195,59,0.15)] text-[#ffe27a] flex items-center justify-center font-bold">3</span>
                    <span className="text-[#d8e4e8]">Você conhece os próximos passos e a ficha completa</span>
                  </div>
                </div>

                <button
                  onClick={() => setModalOpen(false)}
                  className="mt-5 w-full py-3 rounded-xl bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.15)] text-white font-bold text-sm cursor-pointer transition"
                >
                  Concluir
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3.5 rounded-xl bg-red-900/30 border border-red-500/40 text-red-200 text-sm">
                    {errorMsg}
                  </div>
                )}

                {/* Quem está preenchendo */}
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-2">
                    Quem está preenchendo este pré-cadastro?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className={`block p-3 rounded-xl border cursor-pointer transition ${tipoCadastro === 'aluno' ? 'bg-[linear-gradient(180deg,rgba(13,31,45,0.85),rgba(7,17,25,0.95))] border-[#f5c33b] shadow-[0_0_0_2px_rgba(245,195,59,0.15)]' : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.1)]'}`}>
                      <input
                        type="radio"
                        name="tipoCadastro"
                        value="aluno"
                        checked={tipoCadastro === 'aluno'}
                        onChange={() => setTipoCadastro('aluno')}
                        className="sr-only"
                      />
                      <strong className="block text-white text-sm font-bold">Sou o aluno</strong>
                      <small className="text-[#a8b7c0] text-xs block mt-0.5">Estou fazendo meu próprio pré-cadastro.</small>
                    </label>

                    <label className={`block p-3 rounded-xl border cursor-pointer transition ${tipoCadastro === 'responsavel' ? 'bg-[linear-gradient(180deg,rgba(13,31,45,0.85),rgba(7,17,25,0.95))] border-[#f5c33b] shadow-[0_0_0_2px_rgba(245,195,59,0.15)]' : 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.1)]'}`}>
                      <input
                        type="radio"
                        name="tipoCadastro"
                        value="responsavel"
                        checked={tipoCadastro === 'responsavel'}
                        onChange={() => setTipoCadastro('responsavel')}
                        className="sr-only"
                      />
                      <strong className="block text-white text-sm font-bold">Sou responsável</strong>
                      <small className="text-[#a8b7c0] text-xs block mt-0.5">Estou cadastrando um adolescente ou jovem.</small>
                    </label>
                  </div>
                </div>

                {/* Divider: Dados do aluno */}
                <div className="pt-2 text-[#ffe27a] text-xs font-black uppercase tracking-wider">
                  Dados do aluno
                </div>

                <div>
                  <label htmlFor="input-nome-aluno" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                    Nome completo do aluno *
                  </label>
                  <input
                    id="input-nome-aluno"
                    type="text"
                    required
                    value={nomeAluno}
                    onChange={(e) => setNomeAluno(e.target.value)}
                    placeholder="Nome e sobrenome"
                    className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-nasc-aluno" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                      Data de nascimento *
                    </label>
                    <input
                      id="input-nasc-aluno"
                      type="date"
                      required
                      value={nascimentoAluno}
                      onChange={(e) => setNascimentoAluno(e.target.value)}
                      className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-cidade-aluno" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                      Cidade *
                    </label>
                    <input
                      id="input-cidade-aluno"
                      type="text"
                      required
                      value={cidadeAluno}
                      onChange={(e) => setCidadeAluno(e.target.value)}
                      placeholder="Ex.: Pelotas"
                      className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="input-whats-aluno" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                    WhatsApp do aluno
                  </label>
                  <input
                    id="input-whats-aluno"
                    type="tel"
                    inputMode="tel"
                    placeholder="(00) 00000-0000"
                    value={whatsAluno}
                    onChange={(e) => setWhatsAluno(e.target.value)}
                    className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                  />
                  <small className="text-[#8597a2] text-xs mt-1 block">
                    Se o aluno não possuir WhatsApp, informe o contato do responsável abaixo.
                  </small>
                </div>

                {/* Divider: Dados do responsável */}
                <div className="pt-2 text-[#ffe27a] text-xs font-black uppercase tracking-wider">
                  Dados do responsável
                </div>

                <div>
                  <label htmlFor="input-nome-resp" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                    Nome do responsável {tipoCadastro === 'responsavel' && '*'}
                  </label>
                  <input
                    id="input-nome-resp"
                    type="text"
                    required={tipoCadastro === 'responsavel'}
                    value={nomeResponsavel}
                    onChange={(e) => setNomeResponsavel(e.target.value)}
                    placeholder="Nome completo do pai, mãe ou tutor"
                    className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="input-parentesco" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                      Parentesco
                    </label>
                    <input
                      id="input-parentesco"
                      type="text"
                      value={parentesco}
                      onChange={(e) => setParentesco(e.target.value)}
                      placeholder="Ex.: mãe, pai, tutor"
                      className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label htmlFor="input-whats-resp" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                      WhatsApp do responsável {tipoCadastro === 'responsavel' && '*'}
                    </label>
                    <input
                      id="input-whats-resp"
                      type="tel"
                      inputMode="tel"
                      required={tipoCadastro === 'responsavel'}
                      placeholder="(00) 00000-0000"
                      value={whatsResponsavel}
                      onChange={(e) => setWhatsResponsavel(e.target.value)}
                      className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Divider: Contato */}
                <div className="pt-2 text-[#ffe27a] text-xs font-black uppercase tracking-wider">
                  Contato
                </div>

                <div>
                  <label htmlFor="select-contato-pref" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                    Com quem o Inspira deve falar primeiro? *
                  </label>
                  <select
                    id="select-contato-pref"
                    required
                    value={contatoPreferido}
                    onChange={(e) => setContatoPreferido(e.target.value)}
                    className="w-full min-h-[46px] rounded-xl border border-[rgba(255,255,255,0.10)] bg-[#0d1a23] text-white px-3.5 focus:border-[#f5c33b] focus:outline-none transition"
                  >
                    <option value="">Selecione</option>
                    <option value="aluno">Com o aluno</option>
                    <option value="responsavel">Com o responsável</option>
                    <option value="ambos">Com ambos</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="input-observacao" className="block text-xs sm:text-sm font-bold text-[#dce5ea] mb-1">
                    Há alguma informação importante que devemos saber?
                  </label>
                  <textarea
                    id="input-observacao"
                    rows={2}
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Opcional: disponibilidade, dúvidas ou observações importantes..."
                    className="w-full rounded-xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-white p-3 focus:border-[#f5c33b] focus:outline-none transition resize-y text-sm"
                  />
                </div>

                <label className="flex items-start gap-2.5 cursor-pointer text-[#cbd5db] text-xs sm:text-sm leading-relaxed pt-1">
                  <input
                    type="checkbox"
                    required
                    checked={consentimento}
                    onChange={(e) => setConsentimento(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded accent-[#f5c33b]"
                  />
                  <span>Autorizo o contato da equipe do Inspira pelos números informados neste pré-cadastro.</span>
                </label>

                <button
                  id="btn-enviar-pre-cadastro"
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[50px] rounded-xl btn-inspira-gold text-base font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Salvando no banco...' : 'Enviar pré-cadastro'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
