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
