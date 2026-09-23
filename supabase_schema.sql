-- ==========================================================
-- PROJETO INSPIRA - SCHEMA DO BANCO DE DADOS SUPABASE (PostgreSQL)
-- ==========================================================
-- Como usar:
-- 1. Acesse o painel do seu projeto no Supabase (https://supabase.com/dashboard)
-- 2. No menu lateral, clique em "SQL Editor"
-- 3. Crie uma nova query (+ New query), cole todo este conteúdo e clique em "Run"
-- ==========================================================

-- 1. TABELA DE USUÁRIOS ADMINISTRADORES
CREATE TABLE IF NOT EXISTS public.admin_users (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE SESSÕES ATIVAS
CREATE TABLE IF NOT EXISTS public.sessions (
  token TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.admin_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- 3. TABELA DE PRÉ-CADASTROS
CREATE TABLE IF NOT EXISTS public.pre_cadastros (
  id BIGSERIAL PRIMARY KEY,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Aguardando contato',
  tipo_cadastro TEXT DEFAULT 'aluno',
  nome_aluno TEXT NOT NULL,
  nascimento_aluno TEXT NOT NULL,
  cidade_aluno TEXT NOT NULL,
  whats_aluno TEXT,
  nome_responsavel TEXT,
  parentesco TEXT,
  whats_responsavel TEXT,
  contato_preferido TEXT,
  observacao TEXT
);

-- 4. TABELA DE CADASTROS COMPLETOS (FICHAS)
CREATE TABLE IF NOT EXISTS public.cadastros_completos (
  id BIGSERIAL PRIMARY KEY,
  ref TEXT,
  enviado_em TIMESTAMPTZ DEFAULT NOW(),
  nome TEXT NOT NULL,
  nascimento TEXT,
  whats TEXT,
  cidade TEXT,
  bairro TEXT,
  endereco TEXT,
  escola TEXT,
  curso TEXT,
  objetivos TEXT,
  responsavel TEXT,
  parentesco TEXT,
  whats_responsavel TEXT,
  possui_laudo TEXT,
  cid TEXT,
  laudo_arquivo_nome TEXT,
  laudo_arquivo_path TEXT,
  laudo_arquivo_mime TEXT,
  laudo_arquivo_size BIGINT,
  tem_alergia TEXT,
  alergias TEXT,
  usa_medicamento TEXT,
  medicamentos TEXT,
  restricoes TEXT,
  condicoes_saude TEXT,
  emergencia_nome TEXT,
  emergencia_fone TEXT,
  orientacao_emergencia TEXT,
  seguranca TEXT,
  autoriza_imagem INTEGER DEFAULT 0
);

-- 5. ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_pre_status ON public.pre_cadastros(status);
CREATE INDEX IF NOT EXISTS idx_full_ref ON public.cadastros_completos(ref);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_username ON public.admin_users(username);

-- 6. USUÁRIO INICIAL 'comando' (Senha padrão: inspira2026)
-- Caso você mude a senha no painel, ela será atualizada automaticamente.
INSERT INTO public.admin_users (username, password_hash, salt, created_at)
VALUES (
  'comando',
  'a999ad223f0e4b7d5374f16313384f5cc0389c0cb1181ea91423733d7b348188151da72978fe11d1aebd5ec5c6c7fafe5ade2ac17f33039653529a4a43ad4f0c',
  'e29a998cb729c1b747065f4df3f545a1',
  NOW()
)
ON CONFLICT (username) DO UPDATE SET 
  password_hash = EXCLUDED.password_hash, 
  salt = EXCLUDED.salt;

-- 7. CONFIGURAÇÃO DE POLÍTICAS DE ACESSO (RLS - Row Level Security)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pre_cadastros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadastros_completos ENABLE ROW LEVEL SECURITY;

-- Permitir acesso total pela service_role do backend (API Node.js)
CREATE POLICY "Full access to service role" ON public.admin_users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Full access to service role" ON public.sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Full access to service role" ON public.pre_cadastros
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Full access to service role" ON public.cadastros_completos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Permitir inserção pública (anon) caso utilize a chave anônima no backend
CREATE POLICY "Allow anon insert on pre_cadastros" ON public.pre_cadastros
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon insert on cadastros_completos" ON public.cadastros_completos
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon select and manage by service" ON public.pre_cadastros
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon select full by ref" ON public.cadastros_completos
  FOR SELECT TO anon USING (true);

-- 8. CONCESSÃO DE PRIVILÉGIOS (GRANT) PARA AS ROLES DO SUPABASE
-- Essencial para liberar o acesso da API REST (service_role e anon) às tabelas:
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON TABLE public.admin_users TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.sessions TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.pre_cadastros TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.cadastros_completos TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;

-- 9. TABELA DE HISTÓRICO / AUDITORIA
CREATE TABLE IF NOT EXISTS public.historico_aluno (
  id BIGSERIAL PRIMARY KEY,
  aluno_id BIGINT NOT NULL,
  tipo_evento TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_evento TIMESTAMPTZ DEFAULT NOW(),
  usuario TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_historico_aluno_id ON public.historico_aluno(aluno_id);
ALTER TABLE public.historico_aluno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to service role" ON public.historico_aluno FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select and manage by service" ON public.historico_aluno FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.historico_aluno TO postgres, anon, authenticated, service_role;

-- 10. MÓDULO 6 — TABELA DE AVALIAÇÃO E EVOLUÇÃO DO ALUNO
CREATE TABLE IF NOT EXISTS public.avaliacoes_aluno (
  id BIGSERIAL PRIMARY KEY,
  aluno_id BIGINT NOT NULL,
  data_avaliacao DATE NOT NULL DEFAULT CURRENT_DATE,
  instrutor_id TEXT,
  instrutor_nome TEXT NOT NULL,
  observacoes_gerais TEXT,
  nota_disciplina INTEGER NOT NULL DEFAULT 3,
  comentario_disciplina TEXT,
  nota_responsabilidade INTEGER NOT NULL DEFAULT 3,
  comentario_responsabilidade TEXT,
  nota_trabalho_equipe INTEGER NOT NULL DEFAULT 3,
  comentario_trabalho_equipe TEXT,
  nota_lideranca INTEGER NOT NULL DEFAULT 3,
  comentario_lideranca TEXT,
  nota_comunicacao INTEGER NOT NULL DEFAULT 3,
  comentario_comunicacao TEXT,
  nota_participacao INTEGER NOT NULL DEFAULT 3,
  comentario_participacao TEXT,
  nota_superacao INTEGER NOT NULL DEFAULT 3,
  comentario_superacao TEXT,
  media_geral NUMERIC(3,2) NOT NULL DEFAULT 3.00,
  metas JSONB DEFAULT '[]'::jsonb,
  missoes JSONB DEFAULT '[]'::jsonb,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_aluno_id ON public.avaliacoes_aluno(aluno_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_data ON public.avaliacoes_aluno(data_avaliacao);

ALTER TABLE public.avaliacoes_aluno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to service role on avaliacoes" ON public.avaliacoes_aluno FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select and manage by service on avaliacoes" ON public.avaliacoes_aluno FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.avaliacoes_aluno TO postgres, anon, authenticated, service_role;

-- 11. MÓDULO 7 — TABELA DE CONTROLE DE FREQUÊNCIA
CREATE TABLE IF NOT EXISTS public.frequencia_aluno (
  id BIGSERIAL PRIMARY KEY,
  aluno_id BIGINT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  atividade TEXT NOT NULL,
  instrutor_id TEXT,
  instrutor_nome TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Presente', 'Ausente', 'Justificada')),
  observacao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frequencia_aluno_id ON public.frequencia_aluno(aluno_id);
CREATE INDEX IF NOT EXISTS idx_frequencia_data ON public.frequencia_aluno(data);

ALTER TABLE public.frequencia_aluno ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to service role on frequencia" ON public.frequencia_aluno FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select and manage by service on frequencia" ON public.frequencia_aluno FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.frequencia_aluno TO postgres, anon, authenticated, service_role;

-- 12. MÓDULO 8 — TABELA DE COMUNICAÇÃO E AVISOS
CREATE TABLE IF NOT EXISTS public.comunicados (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT NOT NULL CHECK(tipo IN ('Geral', 'Alunos', 'Responsáveis', 'Individual')),
  aluno_id BIGINT,
  aluno_nome TEXT,
  criado_por TEXT NOT NULL,
  criador_id TEXT,
  status TEXT NOT NULL DEFAULT 'Publicado' CHECK(status IN ('Publicado', 'Rascunho', 'Arquivado')),
  observacao_interna TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comunicados_data ON public.comunicados(data);
CREATE INDEX IF NOT EXISTS idx_comunicados_tipo ON public.comunicados(tipo);
CREATE INDEX IF NOT EXISTS idx_comunicados_aluno ON public.comunicados(aluno_id);

ALTER TABLE public.comunicados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to service role on comunicados" ON public.comunicados FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select and manage by service on comunicados" ON public.comunicados FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.comunicados TO postgres, anon, authenticated, service_role;

-- 13. MÓDULO 9 — FINANCEIRO (CONFIGURAÇÃO E HISTÓRICO DE PAGAMENTOS)
CREATE TABLE IF NOT EXISTS public.aluno_financeiro_config (
  aluno_id BIGINT PRIMARY KEY,
  plano TEXT NOT NULL DEFAULT 'Mensalidade Padrão',
  valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  dia_vencimento INTEGER NOT NULL DEFAULT 10,
  status TEXT NOT NULL DEFAULT 'Aguardando' CHECK(status IN ('Pago', 'Aguardando', 'Atrasado')),
  gateway_pagamento TEXT DEFAULT 'manual',
  id_cliente_gateway TEXT,
  id_assinatura_gateway TEXT,
  status_gateway TEXT DEFAULT 'ativo',
  proxima_cobranca DATE,
  ultima_sincronizacao TIMESTAMPTZ,
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir colunas de gateway em tabelas existentes
ALTER TABLE public.aluno_financeiro_config ADD COLUMN IF NOT EXISTS gateway_pagamento TEXT DEFAULT 'manual';
ALTER TABLE public.aluno_financeiro_config ADD COLUMN IF NOT EXISTS id_cliente_gateway TEXT;
ALTER TABLE public.aluno_financeiro_config ADD COLUMN IF NOT EXISTS id_assinatura_gateway TEXT;
ALTER TABLE public.aluno_financeiro_config ADD COLUMN IF NOT EXISTS status_gateway TEXT DEFAULT 'ativo';
ALTER TABLE public.aluno_financeiro_config ADD COLUMN IF NOT EXISTS proxima_cobranca DATE;
ALTER TABLE public.aluno_financeiro_config ADD COLUMN IF NOT EXISTS ultima_sincronizacao TIMESTAMPTZ;

ALTER TABLE public.aluno_financeiro_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to service role on aluno_financeiro_config" ON public.aluno_financeiro_config FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select and manage by service on aluno_financeiro_config" ON public.aluno_financeiro_config FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.aluno_financeiro_config TO postgres, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.pagamentos (
  id BIGSERIAL PRIMARY KEY,
  aluno_id BIGINT NOT NULL,
  aluno_nome TEXT NOT NULL,
  valor NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  data_pagamento DATE NOT NULL DEFAULT CURRENT_DATE,
  mes_referencia TEXT NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'PIX',
  status TEXT NOT NULL DEFAULT 'Pago' CHECK(status IN ('Pago', 'Aguardando', 'Atrasado')),
  observacao TEXT,
  responsavel_registro TEXT NOT NULL,
  responsavel_id TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagamentos_aluno ON public.pagamentos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_data ON public.pagamentos(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_pagamentos_status ON public.pagamentos(status);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to service role on pagamentos" ON public.pagamentos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select and manage by service on pagamentos" ON public.pagamentos FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.pagamentos TO postgres, anon, authenticated, service_role;

-- 14. MÓDULO 9: HISTÓRICO DE EVENTOS FINANCEIROS E INTEGRAÇÃO COM GATEWAYS
CREATE TABLE IF NOT EXISTS public.financeiro_eventos (
  id BIGSERIAL PRIMARY KEY,
  aluno_id BIGINT,
  tipo_evento TEXT NOT NULL, -- pagamento, cancelamento, alteração_plano, cobrança
  gateway TEXT NOT NULL DEFAULT 'manual', -- manual, infinitypay, paggpay, etc.
  valor NUMERIC(10,2) DEFAULT 0.00,
  status TEXT NOT NULL, -- confirmado, pendente, falhou, cancelado, gerada
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_eventos_aluno ON public.financeiro_eventos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_eventos_tipo ON public.financeiro_eventos(tipo_evento);
CREATE INDEX IF NOT EXISTS idx_financeiro_eventos_gateway ON public.financeiro_eventos(gateway);
CREATE INDEX IF NOT EXISTS idx_financeiro_eventos_criado_em ON public.financeiro_eventos(criado_em);

ALTER TABLE public.financeiro_eventos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to service role on financeiro_eventos" ON public.financeiro_eventos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select and manage by service on financeiro_eventos" ON public.financeiro_eventos FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.financeiro_eventos TO postgres, anon, authenticated, service_role;

-- 15. MÓDULO 10: CRONOGRAMA ANUAL DE TREINAMENTOS
CREATE TABLE IF NOT EXISTS public.cronograma_treinamentos (
  id BIGSERIAL PRIMARY KEY,
  titulo TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fim TEXT,
  categoria TEXT NOT NULL,
  local TEXT,
  instrutor_responsavel_id TEXT,
  instrutor_responsavel_nome TEXT,
  descricao TEXT,
  materiais TEXT,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'Planejada' CHECK(status IN ('Planejada', 'Confirmada', 'Realizada', 'Cancelada')),
  criado_por TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_cronograma_data ON public.cronograma_treinamentos(data);
CREATE INDEX IF NOT EXISTS idx_cronograma_categoria ON public.cronograma_treinamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_cronograma_status ON public.cronograma_treinamentos(status);
CREATE INDEX IF NOT EXISTS idx_cronograma_deleted ON public.cronograma_treinamentos(deleted_at);

ALTER TABLE public.cronograma_treinamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Full access to service role on cronograma_treinamentos" ON public.cronograma_treinamentos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon select and manage by service on cronograma_treinamentos" ON public.cronograma_treinamentos FOR ALL TO anon USING (true) WITH CHECK (true);
GRANT ALL ON TABLE public.cronograma_treinamentos TO postgres, anon, authenticated, service_role;
