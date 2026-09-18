import express from 'express';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import { db, hashPassword, verifyPassword } from './server/db.js';
import { dataService } from './server/dataService.js';
import { gatewayService, gatewayRegistry } from './server/gatewayService.js';
import { isSupabaseConfigured, testSupabaseConnection, getSupabase } from './server/supabase.js';

const app = express();
// Anti-caching for all API routes
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  next();
});

const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Normalizer for serverless environments (e.g. Vercel) where /api prefix might be stripped in rewrites
app.use((req, res, next) => {
  const urlPath = (req.url || '').split('?')[0];
  if (
    urlPath.startsWith('/auth/') ||
    urlPath.startsWith('/pre-cadastros') ||
    urlPath.startsWith('/cadastros-completos') ||
    urlPath.startsWith('/comando/') ||
    urlPath.startsWith('/config') ||
    urlPath.startsWith('/laudos/') ||
    urlPath === '/health'
  ) {
    req.url = '/api' + req.url;
  }
  next();
});

// Multer storage for secure medical reports (laudos)
const isVercel = Boolean(process.env.VERCEL);
const uploadsDir = isVercel ? path.join('/tmp', 'uploads', 'laudos') : path.join(process.cwd(), 'uploads', 'laudos');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo não permitido. Envie PDF, JPG ou PNG.'));
    }
  },
});

// Authentication middleware
function getAuthToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  if (req.cookies && req.cookies.inspira_session) {
    return req.cookies.inspira_session;
  }
  return null;
}

async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getAuthToken(req);
  if (!token) {
    res.status(401).json({ error: 'Acesso não autorizado. Faça login no Comando Geral.' });
    return;
  }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        // Clear cookie and reject
        res.clearCookie('inspira_session');
        res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        return;
      }
      
      if (data.user.user_metadata?.status === 'Bloqueado') { res.status(403).json({ error: 'Conta bloqueada.' }); return; }
      (req as any).user = {
        id: data.user.id,
        username: data.user.email,
        role: data.user.user_metadata?.funcao || 'Administrador',
        nome: data.user.user_metadata?.nome_completo || data.user.email
      };
      next();
    } else {
      // Local fallback
      const row = db.prepare('SELECT user_id, expires_at FROM sessions WHERE token = ?').get(token) as any;
      if (!row) {
        res.clearCookie('inspira_session');
        res.status(401).json({ error: 'Sessão inválida ou expirada.' });
        return;
      }
      if (new Date(row.expires_at) < new Date()) {
        db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
        res.clearCookie('inspira_session');
        res.status(401).json({ error: 'Sessão expirada.' });
        return;
      }
      const userRow = db.prepare('SELECT username FROM admin_users WHERE id = ?').get(row.user_id) as any;
      (req as any).user = {
        id: row.user_id,
        username: userRow?.username || 'admin',
        role: 'Administrador',
        nome: userRow?.username || 'Administrador'
      };
      next();
    }
  } catch (err) {
    res.status(500).json({ error: 'Erro de autenticação interno.' });
  }
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// Config endpoint to provide canonical base URL & database status
app.get('/api/config', (req, res) => {
  const host = req.get('host') || '';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const detectedUrl = `${protocol}://${host}`;
  const appUrl = process.env.APP_URL || detectedUrl;
  res.json({
    appUrl,
    database: dataService.getProviderInfo(),
  });
});

// Database diagnostics status for administration
app.get('/api/system/database-status', requireAuth, async (req, res) => {
  const info = dataService.getProviderInfo();
  if (info.isSupabase) {
    const testResult = await testSupabaseConnection();
    res.json({ ...info, connected: testResult.ok, message: testResult.message });
  } else {
    res.json({ ...info, connected: true, message: 'Operando com banco de dados SQLite local.' });
  }
});

// Auth Routes
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Informe usuário e senha.' });
    return;
  }

  try {
    if (isSupabaseConfigured()) {
      // Create a fresh client for auth to avoid mutating the global singleton's session
      const authSupabase = createClient(process.env.SUPABASE_URL || '', (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY) || '', { auth: { persistSession: false, autoRefreshToken: false } });
      let finalEmail = username;
      if (!username.includes('@')) {
        finalEmail = `${username}@inspira.com`;
      }

      let { data, error } = await authSupabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      });

      // Se for a conta padrão e der credenciais inválidas, tentamos criá-la
      // NOTA: Requer que 'Confirm Email' esteja desativado no painel do Supabase
      if (error && error.message.toLowerCase().includes('invalid login credentials') && username === 'comando' && password === 'inspira2026') {
        console.log('Tentando criar usuário padrão no Supabase Auth...');
        const signUpRes = await authSupabase.auth.signUp({
          email: finalEmail,
          password,
        });
        if (signUpRes.data && signUpRes.data.user) {
          const signInRes = await authSupabase.auth.signInWithPassword({
            email: finalEmail,
            password,
          });
          data = signInRes.data;
          error = signInRes.error;
        } else {
           console.warn('Falha ao auto-registrar comando:', signUpRes.error?.message);
        }
      }

      if (data && data.user && data.user.user_metadata?.status === 'Bloqueado') {
        res.status(401).json({ error: 'Sua conta está bloqueada. Entre em contato com a administração.' });
        return;
      }
      if (error || !data.session) {
        res.status(401).json({ error: 'Usuário ou senha inválidos. Crie a conta no painel Auth do Supabase.' });
        return;
      }

      const token = data.session.access_token;

      res.cookie('inspira_session', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      res.json({ success: true, token, username: data.user.email });
      return;
    }

    // LOCAL SQLITE FALLBACK
    let user = await dataService.getAdminUserByUsername(username);

    let valid = Boolean(user && verifyPassword(password, user.password_hash, user.salt));

    if (!valid) {
      let localUser: any = null;
      try {
        localUser = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as any;
      } catch (e) {
        console.warn('Local db lookup failed:', e);
      }

      if (localUser && verifyPassword(password, localUser.password_hash, localUser.salt)) {
        valid = true;
        user = localUser;
      } else if (password === 'inspira2026' && username === 'comando') {
        valid = true;
        if (!user) {
          user = localUser || {
            id: 1,
            username: 'comando',
            password_hash: '',
            salt: '',
          };
        }
      }
    }

    if (!valid || !user) {
      res.status(401).json({ error: 'Usuário ou senha inválidos.' });
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    try {
      await dataService.createSession(token, user.id || 1, expiresAt);
    } catch (sessionErr: any) {
      console.warn('Failed to persist session to database:', sessionErr);
    }

    res.cookie('inspira_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, token, username: user.username || 'comando' });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error?.message || 'Erro ao processar login.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const token = getAuthToken(req);
  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  try {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) {
        res.json({ authenticated: false });
        return;
      }
      res.json({
        authenticated: true,
        username: data.user.email,
        nome: data.user.user_metadata?.nome_completo || data.user.email,
        role: data.user.user_metadata?.funcao || 'Administrador',
        status: data.user.user_metadata?.status || 'Ativo',
        id: data.user.id
      });
      return;
    }

    const session = await dataService.getSession(token);

    if (!session || new Date(session.expires_at) < new Date()) {
      res.json({ authenticated: false });
      return;
    }

    res.json({
      authenticated: true,
      username: session.username,
      nome: session.username,
      role: 'Administrador',
      status: 'Ativo',
      id: String(session.user_id)
    });
  } catch (error: any) {
    res.json({ authenticated: false });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = getAuthToken(req);
  if (token) {
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      // Only best-effort signOut, token is primarily cleared from cookies
      supabase.auth.signOut().catch(() => {});
    } else {
      await dataService.deleteSession(token);
    }
  }
  res.clearCookie('inspira_session');
  res.json({ success: true });
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
    return;
  }

  try {
    const user = (req as any).user;

    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      // Validate current password by signing in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.username,
        password: currentPassword
      });

      if (signInError) {
        res.status(401).json({ error: 'Senha atual incorreta.' });
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) {
        res.status(500).json({ error: 'Erro ao atualizar senha no Supabase: ' + updateError.message });
        return;
      }

      res.json({ success: true, message: 'Senha atualizada com sucesso.' });
      return;
    }

    // LOCAL SQLITE FALLBACK
    const adminRec = await dataService.getAdminUserByUsername(user.username);

    if (!adminRec || !verifyPassword(currentPassword, adminRec.password_hash, adminRec.salt)) {
      res.status(400).json({ error: 'Senha atual incorreta.' });
      return;
    }

    await dataService.updateAdminPassword(adminRec.id, newPassword);

    res.json({ success: true, message: 'Senha alterada com sucesso.' });
  } catch (error: any) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Erro ao alterar a senha.' });
  }
});

// -------------------------------------------------------------
// PRE-CADASTROS (PUBLIC CREATION, AUTHENTICATED MANAGEMENT)
// -------------------------------------------------------------

app.post('/api/pre-cadastros', async (req, res) => {
  try {
    const {
      tipoCadastro,
      nomeAluno,
      nascimentoAluno,
      cidadeAluno,
      whatsAluno,
      nomeResponsavel,
      parentesco,
      whatsResponsavel,
      contatoPreferido,
      observacao,
    } = req.body;

    if (!nomeAluno || !nascimentoAluno || !cidadeAluno) {
      res.status(400).json({ error: 'Campos obrigatórios: Nome do aluno, Data de nascimento e Cidade.' });
      return;
    }

    if (!whatsAluno && !whatsResponsavel) {
      res.status(400).json({ error: 'Informe pelo menos um WhatsApp: do aluno ou do responsável.' });
      return;
    }

    const result = await dataService.createPreCadastro({
      tipoCadastro,
      nomeAluno,
      nascimentoAluno,
      cidadeAluno,
      whatsAluno,
      nomeResponsavel,
      parentesco,
      whatsResponsavel,
      contatoPreferido,
      observacao,
    });

    res.status(201).json({
      success: true,
      id: result.id,
      message: 'Pré-cadastro realizado com sucesso!',
    });
  } catch (error: any) {
    console.error('Error creating pre-cadastro:', error);
    res.status(500).json({ error: 'Erro ao salvar pré-cadastro no banco de dados.' });
  }
});

app.get('/api/pre-cadastros', requireAuth, async (req, res) => {
  try {
    const list = await dataService.getPreCadastros();
      res.json(list);
  } catch (error: any) {
      console.error('Error fetching pre-cadastros:', error);
    res.status(500).json({ error: 'Erro ao consultar cadastros.', details: error.message, stack: error.stack });
  }
});

app.patch('/api/pre-cadastros/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = [
    'Aguardando contato', 'Em atendimento', 'Confirmado',
    'Pré-cadastro', 'Em análise', 'Aprovado', 'Ativo', 'Inativo',
    'Novo cadastro', 'Primeiro contato realizado', 'Aguardando retorno',
    'Documentação pendente', 'Matrícula confirmada', 'Finalizado'
  ];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Status inválido.' });
    return;
  }

  try {
    await dataService.updatePreCadastroStatus(id, status);
    
    // Add history for status change
    await dataService.addHistorico(Number(id), 'Status', `Status atualizado para: ${status}`, 'Comando Geral');
    
    res.json({ success: true, status });
  } catch (error: any) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
  }
});

app.get('/api/historico/:alunoId', requireAuth, async (req, res) => {
  try {
    const list = await dataService.getHistorico(Number(req.params.alunoId));
      res.json(list);
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

app.post('/api/historico', requireAuth, async (req, res) => {
  try {
    const { alunoId, tipoEvento, descricao, usuario } = req.body;
    await dataService.addHistorico(Number(alunoId), tipoEvento, descricao, usuario || 'Comando Geral');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao adicionar histórico.' });
  }
});

app.patch('/api/pre-cadastros/:id/dados', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { nomeAluno, nascimentoAluno, cidadeAluno, whatsAluno, nomeResponsavel, parentesco, whatsResponsavel } = req.body;
    
    await dataService.updatePreCadastroDados(id, {
      nomeAluno, nascimentoAluno, cidadeAluno, whatsAluno, nomeResponsavel, parentesco, whatsResponsavel
    });
    
    await dataService.addHistorico(Number(id), 'Atualização', `Dados básicos atualizados no sistema.`, (req as any).user.username || 'Comando Geral');
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar dados.' });
  }
});

app.patch('/api/pre-cadastros/:id/contato', requireAuth, async (req, res) => {
  try {
    await dataService.updateContato(req.params.id, req.body);
    await dataService.addHistorico(Number(req.params.id), 'Contato', `Contato realizado por: ${req.body.responsavelContato}. Obs: ${req.body.observacaoContato}`, 'Comando Geral');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar contato.' });
  }
});

app.patch('/api/pre-cadastros/:id/documentacao', requireAuth, async (req, res) => {
  try {
    await dataService.updateDocumentacaoStatus(req.params.id, req.body.status);
    await dataService.addHistorico(Number(req.params.id), 'Documentacao', `Status da documentação alterado para: ${req.body.status}`, 'Comando Geral');
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro ao atualizar doc status.' });
  }
});

app.delete('/api/pre-cadastros/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    // Clean up associated file if any
    const fullRec = await dataService.getCadastroCompletoByRef(id);
    if (fullRec && fullRec.laudoArquivoPath && fs.existsSync(fullRec.laudoArquivoPath)) {
      try {
        fs.unlinkSync(fullRec.laudoArquivoPath);
      } catch (e) {
        console.error('Failed to unlink laudo file:', e);
      }
    }

    await dataService.deletePreCadastro(id);
    res.json({ success: true, message: 'Cadastro excluído com sucesso.' });
  } catch (error: any) {
    console.error('Error deleting cadastro:', error);
    res.status(500).json({ error: 'Erro ao excluir cadastro.' });
  }
});

// -------------------------------------------------------------
// MÓDULO 6: AVALIAÇÃO E EVOLUÇÃO DO ALUNO
// -------------------------------------------------------------

app.get('/api/alunos/:id/avaliacoes', requireAuth, async (req, res) => {
  try {
    const alunoId = Number(req.params.id);
    const avaliacoes = await dataService.getAvaliacoesAluno(alunoId);
    res.json(avaliacoes);
  } catch (err: any) {
    console.error('Error fetching avaliacoes:', err);
    res.status(500).json({ error: err.message || 'Erro ao carregar avaliações do aluno.' });
  }
});

app.post('/api/alunos/:id/avaliacoes', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role || 'Instrutor';
    if (role !== 'Administrador' && role !== 'Instrutor') {
      res.status(403).json({ error: 'Apenas Administradores e Instrutores podem registrar avaliações.' });
      return;
    }

    const alunoId = Number(req.params.id);
    const { dataAvaliacao, instrutorNome, observacoesGerais, competencias, metas, missoes } = req.body;

    const loggedUser = (req as any).user;
    const resolvedInstrutorNome = (instrutorNome && instrutorNome.trim()) ? instrutorNome.trim() : (loggedUser?.nome || loggedUser?.username || 'Instrutor');
    const instrutorId = loggedUser?.id ? String(loggedUser.id) : undefined;

    const created = await dataService.createAvaliacaoAluno({
      alunoId,
      dataAvaliacao,
      instrutorId,
      instrutorNome: resolvedInstrutorNome,
      observacoesGerais,
      competencias,
      metas,
      missoes
    });

    // Auditoria no histórico do aluno
    try {
      await dataService.addHistorico(
        alunoId,
        'Evolucao' as any,
        `Avaliação de competências registrada por ${resolvedInstrutorNome}. Média geral: ${created.mediaGeral.toFixed(1)}/5.0`,
        loggedUser?.nome || loggedUser?.username || 'Comando Geral'
      );
    } catch (e) {
      console.warn('Erro ao salvar auditoria de avaliacao:', e);
    }

    res.status(201).json(created);
  } catch (err: any) {
    console.error('Error creating avaliacao:', err);
    res.status(500).json({ error: err.message || 'Erro ao criar avaliação do aluno.' });
  }
});

app.put('/api/avaliacoes/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await dataService.getAvaliacaoById(id);
    if (!existing) {
      res.status(404).json({ error: 'Avaliação não encontrada.' });
      return;
    }

    const role = (req as any).user?.role || 'Instrutor';
    const loggedUser = (req as any).user;

    // Regra de permissão: Admin pode editar qualquer avaliação.
    // Instrutor só pode editar se for a sua própria avaliação.
    if (role !== 'Administrador') {
      const isOwner = (existing.instrutorId && loggedUser?.id && String(existing.instrutorId) === String(loggedUser.id)) ||
        (existing.instrutorNome && loggedUser?.nome && existing.instrutorNome.toLowerCase() === loggedUser.nome.toLowerCase()) ||
        (existing.instrutorNome && loggedUser?.username && existing.instrutorNome.toLowerCase() === loggedUser.username.toLowerCase());
      
      if (!isOwner) {
        res.status(403).json({ error: 'Permissão negada. Apenas o instrutor responsável ou administradores podem editar esta avaliação.' });
        return;
      }
    }

    const { dataAvaliacao, instrutorNome, observacoesGerais, competencias, metas, missoes } = req.body;

    const updated = await dataService.updateAvaliacaoAluno(id, {
      alunoId: existing.alunoId,
      dataAvaliacao: dataAvaliacao || existing.dataAvaliacao,
      instrutorId: existing.instrutorId,
      instrutorNome: (instrutorNome && instrutorNome.trim()) ? instrutorNome.trim() : existing.instrutorNome,
      observacoesGerais,
      competencias,
      metas,
      missoes
    });

    // Auditoria
    try {
      await dataService.addHistorico(
        existing.alunoId,
        'Evolucao' as any,
        `Avaliação de ${updated.dataAvaliacao} atualizada por ${loggedUser?.nome || loggedUser?.username || 'Comando Geral'} (Nova média: ${updated.mediaGeral.toFixed(1)}/5.0)`,
        loggedUser?.nome || loggedUser?.username || 'Comando Geral'
      );
    } catch (e) {}

    res.json(updated);
  } catch (err: any) {
    console.error('Error updating avaliacao:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar avaliação.' });
  }
});

app.delete('/api/avaliacoes/:id', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role;
    if (role !== 'Administrador') {
      res.status(403).json({ error: 'Permissão negada. Apenas administradores podem excluir avaliações.' });
      return;
    }

    const id = Number(req.params.id);
    const existing = await dataService.getAvaliacaoById(id);
    if (!existing) {
      res.status(404).json({ error: 'Avaliação não encontrada.' });
      return;
    }

    await dataService.deleteAvaliacaoAluno(id);

    const loggedUser = (req as any).user;
    try {
      await dataService.addHistorico(
        existing.alunoId,
        'Evolucao' as any,
        `Avaliação de ${existing.dataAvaliacao} (Instrutor: ${existing.instrutorNome}) foi excluída por ${loggedUser?.nome || loggedUser?.username || 'Administrador'}`,
        loggedUser?.nome || loggedUser?.username || 'Administrador'
      );
    } catch (e) {}

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting avaliacao:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir avaliação.' });
  }
});

// -------------------------------------------------------------
// MÓDULO 7: CONTROLE DE FREQUÊNCIA
// -------------------------------------------------------------

app.get('/api/alunos/:id/frequencia', requireAuth, async (req, res) => {
  try {
    const alunoId = Number(req.params.id);
    const frequencias = await dataService.getFrequenciasAluno(alunoId);
    const resumo = await dataService.getResumoFrequencia(alunoId);
    res.json({ frequencias, resumo });
  } catch (err: any) {
    console.error('Error fetching frequencia:', err);
    res.status(500).json({ error: err.message || 'Erro ao carregar registros de frequência do aluno.' });
  }
});

app.post('/api/alunos/:id/frequencia', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role || 'Instrutor';
    if (role !== 'Administrador' && role !== 'Instrutor') {
      res.status(403).json({ error: 'Permissão negada. Apenas Administradores e Instrutores podem registrar frequência.' });
      return;
    }

    const alunoId = Number(req.params.id);
    const { data: dataTreino, atividade, status, observacao, instrutorNome } = req.body;

    if (!atividade || !atividade.trim()) {
      res.status(400).json({ error: 'Nome do treinamento ou atividade é obrigatório.' });
      return;
    }

    if (!['Presente', 'Ausente', 'Justificada'].includes(status)) {
      res.status(400).json({ error: 'Status inválido. Deve ser Presente, Ausente ou Justificada.' });
      return;
    }

    const loggedUser = (req as any).user;
    const resolvedInstrutorNome = (instrutorNome && instrutorNome.trim())
      ? instrutorNome.trim()
      : (loggedUser?.nome || loggedUser?.username || 'Instrutor');
    const instrutorId = loggedUser?.id ? String(loggedUser.id) : undefined;

    const created = await dataService.createFrequenciaAluno({
      alunoId,
      data: dataTreino,
      atividade: atividade.trim(),
      instrutorId,
      instrutorNome: resolvedInstrutorNome,
      status,
      observacao: observacao?.trim() || ''
    });

    // Auditoria no histórico do aluno
    try {
      const statusLabel = status === 'Presente' ? 'Presença' : status === 'Ausente' ? 'Falta' : 'Falta justificada';
      await dataService.addHistorico(
        alunoId,
        'Frequencia' as any,
        `Frequência registrada: ${statusLabel} em "${atividade.trim()}" (Instrutor: ${resolvedInstrutorNome})`,
        loggedUser?.nome || loggedUser?.username || 'Comando Geral'
      );
    } catch (e) {
      console.warn('Erro ao registrar histórico de frequência:', e);
    }

    const resumo = await dataService.getResumoFrequencia(alunoId);
    res.status(201).json({ frequencia: created, resumo });
  } catch (err: any) {
    console.error('Error creating frequencia:', err);
    res.status(500).json({ error: err.message || 'Erro ao registrar frequência.' });
  }
});

app.put('/api/frequencia/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await dataService.getFrequenciaById(id);
    if (!existing) {
      res.status(404).json({ error: 'Registro de frequência não encontrado.' });
      return;
    }

    const role = (req as any).user?.role || 'Instrutor';
    const loggedUser = (req as any).user;

    // Regra: Administrador pode editar qualquer um; Instrutor só edita os seus próprios registros
    if (role !== 'Administrador') {
      if (role !== 'Instrutor') {
        res.status(403).json({ error: 'Permissão negada. Apenas Administradores e Instrutores podem editar frequência.' });
        return;
      }
      const isOwnerById = loggedUser?.id && existing.instrutorId && String(existing.instrutorId) === String(loggedUser.id);
      const isOwnerByName = loggedUser?.nome && existing.instrutorNome && existing.instrutorNome.toLowerCase() === loggedUser.nome.toLowerCase();
      const isOwnerByUsername = loggedUser?.username && existing.instrutorNome && existing.instrutorNome.toLowerCase() === loggedUser.username.toLowerCase();

      if (!isOwnerById && !isOwnerByName && !isOwnerByUsername) {
        res.status(403).json({ error: 'Permissão negada. Você só pode editar registros de frequência criados por você.' });
        return;
      }
    }

    const { data: dataTreino, atividade, status, observacao, instrutorNome } = req.body;

    if (status && !['Presente', 'Ausente', 'Justificada'].includes(status)) {
      res.status(400).json({ error: 'Status inválido. Deve ser Presente, Ausente ou Justificada.' });
      return;
    }

    const updated = await dataService.updateFrequenciaAluno(id, {
      data: dataTreino,
      atividade: atividade?.trim(),
      status,
      observacao: observacao?.trim(),
      instrutorNome: instrutorNome?.trim()
    });

    // Auditoria
    try {
      await dataService.addHistorico(
        existing.alunoId,
        'Frequencia' as any,
        `Frequência de ${updated?.data} ("${updated?.atividade}") atualizada para "${updated?.status}" por ${loggedUser?.nome || loggedUser?.username || 'Comando Geral'}`,
        loggedUser?.nome || loggedUser?.username || 'Comando Geral'
      );
    } catch (e) {}

    const resumo = await dataService.getResumoFrequencia(existing.alunoId);
    res.json({ frequencia: updated, resumo });
  } catch (err: any) {
    console.error('Error updating frequencia:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar frequência.' });
  }
});

app.delete('/api/frequencia/:id', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role;
    if (role !== 'Administrador') {
      res.status(403).json({ error: 'Permissão negada. Apenas Administradores podem excluir registros de frequência.' });
      return;
    }

    const id = Number(req.params.id);
    const existing = await dataService.getFrequenciaById(id);
    if (!existing) {
      res.status(404).json({ error: 'Registro de frequência não encontrado.' });
      return;
    }

    await dataService.deleteFrequenciaAluno(id);

    const loggedUser = (req as any).user;
    try {
      await dataService.addHistorico(
        existing.alunoId,
        'Frequencia' as any,
        `Registro de frequência de ${existing.data} ("${existing.atividade}", Status: ${existing.status}) excluído por ${loggedUser?.nome || loggedUser?.username || 'Administrador'}`,
        loggedUser?.nome || loggedUser?.username || 'Administrador'
      );
    } catch (e) {}

    const resumo = await dataService.getResumoFrequencia(existing.alunoId);
    res.json({ success: true, resumo });
  } catch (err: any) {
    console.error('Error deleting frequencia:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir frequência.' });
  }
});

// -------------------------------------------------------------
// MÓDULO 8: COMUNICAÇÃO
// -------------------------------------------------------------

app.get('/api/comunicados', requireAuth, async (req, res) => {
  try {
    const { tipo, status, alunoId, search } = req.query;
    const comunicados = await dataService.getComunicados({
      tipo: tipo ? String(tipo) : undefined,
      status: status ? String(status) : undefined,
      alunoId: alunoId ? Number(alunoId) : undefined,
      search: search ? String(search) : undefined
    });
    res.json({ comunicados });
  } catch (err: any) {
    console.error('Error fetching comunicados:', err);
    res.status(500).json({ error: err.message || 'Erro ao buscar comunicados.' });
  }
});

app.get('/api/comunicados/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const comunicado = await dataService.getComunicadoById(id);
    if (!comunicado) {
      res.status(404).json({ error: 'Comunicado não encontrado.' });
      return;
    }
    res.json({ comunicado });
  } catch (err: any) {
    console.error('Error fetching comunicado by id:', err);
    res.status(500).json({ error: err.message || 'Erro ao buscar comunicado.' });
  }
});

app.get('/api/alunos/:id/comunicados', requireAuth, async (req, res) => {
  try {
    const alunoId = Number(req.params.id);
    const comunicados = await dataService.getComunicadosByAluno(alunoId);
    res.json({ comunicados });
  } catch (err: any) {
    console.error('Error fetching aluno comunicados:', err);
    res.status(500).json({ error: err.message || 'Erro ao buscar comunicados do aluno.' });
  }
});

app.post('/api/comunicados', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user?.role || 'Instrutor';

    if (role === 'Secretaria') {
      res.status(403).json({ error: 'Permissão negada. A Secretaria possui acesso somente de visualização.' });
      return;
    }

    const { titulo, mensagem, data, tipo, alunoId, alunoNome, status, observacaoInterna } = req.body;

    if (!titulo || !titulo.trim()) {
      res.status(400).json({ error: 'O título do comunicado é obrigatório.' });
      return;
    }
    if (!mensagem || !mensagem.trim()) {
      res.status(400).json({ error: 'A mensagem do comunicado é obrigatória.' });
      return;
    }

    const criadoPor = user?.nome || user?.username || 'Comando Geral';
    const criadorId = user?.id ? String(user.id) : null;

    let targetAlunoNome = alunoNome;
    if (tipo === 'Individual' && alunoId && !targetAlunoNome) {
      const aluno = await dataService.getPreCadastroById(Number(alunoId));
      if (aluno) {
        targetAlunoNome = aluno.nome;
      }
    }

    const created = await dataService.createComunicado({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      data,
      tipo: tipo || 'Geral',
      alunoId: tipo === 'Individual' && alunoId ? Number(alunoId) : null,
      alunoNome: tipo === 'Individual' ? targetAlunoNome : null,
      criadoPor,
      criadorId,
      status: status || 'Publicado',
      observacaoInterna: observacaoInterna ? observacaoInterna.trim() : ''
    });

    // Se associado a um aluno, adiciona ao histórico oficial do aluno
    if (tipo === 'Individual' && alunoId) {
      try {
        await dataService.addHistorico(
          Number(alunoId),
          'Comunicado' as any,
          `Comunicado individual criado: "${titulo.trim()}" por ${criadoPor}`,
          criadoPor
        );
      } catch (e) {}
    } else {
      // Registro geral de histórico no sistema
      try {
        await dataService.addHistorico(
          0,
          'Comunicado' as any,
          `Novo comunicado público (${tipo}): "${titulo.trim()}" por ${criadoPor}`,
          criadoPor
        );
      } catch (e) {}
    }

    res.status(201).json({ comunicado: created });
  } catch (err: any) {
    console.error('Error creating comunicado:', err);
    res.status(500).json({ error: err.message || 'Erro ao registrar comunicado.' });
  }
});

app.put('/api/comunicados/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user?.role || 'Instrutor';

    if (role === 'Secretaria') {
      res.status(403).json({ error: 'Permissão negada. A Secretaria possui acesso somente de visualização.' });
      return;
    }

    const id = Number(req.params.id);
    const existing = await dataService.getComunicadoById(id);
    if (!existing) {
      res.status(404).json({ error: 'Comunicado não encontrado.' });
      return;
    }

    // Se for Instrutor, pode editar somente os comunicados que ele mesmo criou
    if (role !== 'Administrador') {
      const isOwner = (existing.criadorId && String(existing.criadorId) === String(user.id)) ||
                      (existing.criadoPor && existing.criadoPor === (user.nome || user.username));
      if (!isOwner) {
        res.status(403).json({ error: 'Permissão negada. Instrutores podem editar apenas comunicados criados por si mesmos.' });
        return;
      }
    }

    const { titulo, mensagem, data, tipo, alunoId, alunoNome, status, observacaoInterna } = req.body;

    let targetAlunoNome = alunoNome;
    if (tipo === 'Individual' && alunoId && !targetAlunoNome) {
      const aluno = await dataService.getPreCadastroById(Number(alunoId));
      if (aluno) {
        targetAlunoNome = aluno.nome;
      }
    }

    const updated = await dataService.updateComunicado(id, {
      titulo: titulo ? titulo.trim() : undefined,
      mensagem: mensagem ? mensagem.trim() : undefined,
      data,
      tipo,
      alunoId: tipo === 'Individual' ? (alunoId ? Number(alunoId) : null) : null,
      alunoNome: tipo === 'Individual' ? targetAlunoNome : null,
      status,
      observacaoInterna: observacaoInterna !== undefined ? observacaoInterna.trim() : undefined
    });

    const actor = user?.nome || user?.username || 'Comando Geral';
    if (updated?.alunoId) {
      try {
        await dataService.addHistorico(
          updated.alunoId,
          'Comunicado' as any,
          `Comunicado "${updated.titulo}" editado por ${actor}`,
          actor
        );
      } catch (e) {}
    }

    res.json({ comunicado: updated });
  } catch (err: any) {
    console.error('Error updating comunicado:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar comunicado.' });
  }
});

app.delete('/api/comunicados/:id', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role;
    if (role !== 'Administrador') {
      res.status(403).json({ error: 'Permissão negada. Apenas Administradores podem excluir comunicados.' });
      return;
    }

    const id = Number(req.params.id);
    const existing = await dataService.getComunicadoById(id);
    if (!existing) {
      res.status(404).json({ error: 'Comunicado não encontrado.' });
      return;
    }

    await dataService.deleteComunicado(id);

    const loggedUser = (req as any).user;
    const actor = loggedUser?.nome || loggedUser?.username || 'Administrador';

    if (existing.alunoId) {
      try {
        await dataService.addHistorico(
          existing.alunoId,
          'Comunicado' as any,
          `Comunicado "${existing.titulo}" (${existing.tipo}) excluído por ${actor}`,
          actor
        );
      } catch (e) {}
    } else {
      try {
        await dataService.addHistorico(
          0,
          'Comunicado' as any,
          `Comunicado público "${existing.titulo}" (${existing.tipo}) excluído por ${actor}`,
          actor
        );
      } catch (e) {}
    }

    res.json({ success: true, message: `Comunicado "${existing.titulo}" excluído com sucesso.` });
  } catch (err: any) {
    console.error('Error deleting comunicado:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir comunicado.' });
  }
});

// -------------------------------------------------------------
// MÓDULO 9: FINANCEIRO
// -------------------------------------------------------------

// Obter estatísticas do dashboard financeiro
app.get('/api/financeiro/stats', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role || 'Instrutor';
    if (role === 'Instrutor') {
      res.status(403).json({ error: 'Permissão negada. Instrutores não possuem acesso ao módulo financeiro.' });
      return;
    }

    const stats = await dataService.getFinanceiroDashboardStats();
    res.json({ stats });
  } catch (err: any) {
    console.error('Error in GET /api/financeiro/stats:', err);
    res.status(500).json({ error: err.message || 'Erro ao buscar dados financeiros.' });
  }
});

// Listar pagamentos (com filtros por alunoId ou status)
app.get('/api/financeiro/pagamentos', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role || 'Instrutor';
    if (role === 'Instrutor') {
      res.status(403).json({ error: 'Permissão negada. Instrutores não possuem acesso ao módulo financeiro.' });
      return;
    }

    const alunoId = req.query.alunoId ? Number(req.query.alunoId) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;

    const pagamentos = await dataService.getPagamentos(alunoId, status);
    res.json({ pagamentos });
  } catch (err: any) {
    console.error('Error in GET /api/financeiro/pagamentos:', err);
    res.status(500).json({ error: err.message || 'Erro ao buscar pagamentos.' });
  }
});

// Registrar novo pagamento
app.post('/api/financeiro/pagamentos', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user?.role || 'Instrutor';
    if (role === 'Instrutor') {
      res.status(403).json({ error: 'Permissão negada. Instrutores não possuem acesso ao módulo financeiro.' });
      return;
    }

    const { alunoId, alunoNome, valor, dataPagamento, mesReferencia, formaPagamento, status, observacao } = req.body;

    if (!alunoId) {
      res.status(400).json({ error: 'Identificação do aluno é obrigatória.' });
      return;
    }

    const created = await dataService.createPagamento({
      alunoId: Number(alunoId),
      alunoNome,
      valor: Number(valor) || 0,
      dataPagamento: dataPagamento || new Date().toISOString().split('T')[0],
      mesReferencia: (mesReferencia || '').trim() || 'Mensalidade',
      formaPagamento: formaPagamento || 'PIX',
      status: (status || 'Pago') as any,
      observacao,
      responsavelRegistro: user?.nome || user?.username || 'Administrador',
      responsavelId: user?.id ? String(user.id) : undefined
    });

    res.status(201).json({ pagamento: created });
  } catch (err: any) {
    console.error('Error in POST /api/financeiro/pagamentos:', err);
    res.status(500).json({ error: err.message || 'Erro ao registrar pagamento.' });
  }
});

// Editar pagamento existente (Apenas Administrador)
app.put('/api/financeiro/pagamentos/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user?.role || 'Instrutor';
    if (role !== 'Administrador') {
      res.status(403).json({ error: 'Permissão negada. Apenas Administradores podem editar registros financeiros.' });
      return;
    }

    const id = Number(req.params.id);
    const existing = await dataService.getPagamentoById(id);
    if (!existing) {
      res.status(404).json({ error: 'Pagamento não encontrado.' });
      return;
    }

    const { alunoId, alunoNome, valor, dataPagamento, mesReferencia, formaPagamento, status, observacao } = req.body;

    const updated = await dataService.updatePagamento(id, {
      alunoId: alunoId !== undefined ? Number(alunoId) : undefined,
      alunoNome,
      valor: valor !== undefined ? Number(valor) : undefined,
      dataPagamento,
      mesReferencia,
      formaPagamento,
      status,
      observacao,
      responsavelRegistro: user?.nome || user?.username || 'Administrador'
    });

    res.json({ pagamento: updated });
  } catch (err: any) {
    console.error('Error in PUT /api/financeiro/pagamentos/:id:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar pagamento.' });
  }
});

// Excluir pagamento (Apenas Administrador)
app.delete('/api/financeiro/pagamentos/:id', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user?.role || 'Instrutor';
    if (role !== 'Administrador') {
      res.status(403).json({ error: 'Permissão negada. Apenas Administradores podem excluir registros financeiros.' });
      return;
    }

    const id = Number(req.params.id);
    const existing = await dataService.getPagamentoById(id);
    if (!existing) {
      res.status(404).json({ error: 'Pagamento não encontrado.' });
      return;
    }

    await dataService.deletePagamento(id, user?.nome || user?.username || 'Administrador');
    res.json({ success: true, message: 'Registro financeiro excluído com sucesso.' });
  } catch (err: any) {
    console.error('Error in DELETE /api/financeiro/pagamentos/:id:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir pagamento.' });
  }
});

// Obter configuração e histórico financeiro do aluno
app.get('/api/financeiro/aluno/:alunoId', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role || 'Instrutor';
    if (role === 'Instrutor') {
      res.status(403).json({ error: 'Permissão negada. Instrutores não possuem acesso ao módulo financeiro.' });
      return;
    }

    const alunoId = Number(req.params.alunoId);
    const config = await dataService.getAlunoFinanceiroConfig(alunoId);
    const pagamentos = await dataService.getPagamentos(alunoId);

    res.json({ config, pagamentos });
  } catch (err: any) {
    console.error('Error in GET /api/financeiro/aluno/:alunoId:', err);
    res.status(500).json({ error: err.message || 'Erro ao carregar dados financeiros do aluno.' });
  }
});

// Atualizar configuração financeira do aluno (Plano, Valor, Dia de Vencimento, Status, Gateway)
app.put('/api/financeiro/aluno/:alunoId', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user?.role || 'Instrutor';
    if (role === 'Instrutor') {
      res.status(403).json({ error: 'Permissão negada. Instrutores não possuem acesso ao módulo financeiro.' });
      return;
    }

    const alunoId = Number(req.params.alunoId);
    const {
      plano,
      valor,
      diaVencimento,
      status,
      gatewayPagamento,
      idClienteGateway,
      idAssinaturaGateway,
      statusGateway,
      proximaCobranca,
      ultimaSincronizacao
    } = req.body;

    const updated = await dataService.saveAlunoFinanceiroConfig({
      alunoId,
      plano: plano || 'Mensalidade Padrão',
      valor: Number(valor) || 0,
      diaVencimento: Number(diaVencimento) || 10,
      status: (status || 'Aguardando') as any,
      gatewayPagamento,
      idClienteGateway,
      idAssinaturaGateway,
      statusGateway,
      proximaCobranca,
      ultimaSincronizacao,
      userName: user?.nome || user?.username || 'Administrador'
    });

    res.json({ config: updated });
  } catch (err: any) {
    console.error('Error in PUT /api/financeiro/aluno/:alunoId:', err);
    res.status(500).json({ error: err.message || 'Erro ao salvar configuração financeira do aluno.' });
  }
});

// Listar eventos financeiros (para auditoria e sincronização com gateways)
app.get('/api/financeiro/eventos', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role || 'Instrutor';
    if (role === 'Instrutor') {
      res.status(403).json({ error: 'Permissão negada. Instrutores não possuem acesso aos eventos financeiros.' });
      return;
    }

    const alunoId = req.query.alunoId ? Number(req.query.alunoId) : undefined;
    const gateway = req.query.gateway ? String(req.query.gateway) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const eventos = await dataService.getFinanceiroEventos(alunoId, gateway, limit);
    res.json({ eventos });
  } catch (err: any) {
    console.error('Error in GET /api/financeiro/eventos:', err);
    res.status(500).json({ error: err.message || 'Erro ao carregar eventos financeiros.' });
  }
});

// Listar gateways de pagamento registrados no sistema
app.get('/api/financeiro/gateways', requireAuth, async (req, res) => {
  try {
    const gateways = gatewayRegistry.getRegisteredGateways();
    res.json({ gateways });
  } catch (err: any) {
    res.status(500).json({ error: 'Erro ao listar gateways de pagamento.' });
  }
});

// Gerar cobrança para responsável (via Gateway configurado)
app.post('/api/financeiro/aluno/:alunoId/gerar-cobranca', requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    const role = user?.role || 'Instrutor';
    if (role === 'Instrutor') {
      res.status(403).json({ error: 'Permissão negada. Instrutores não possuem permissão para emitir cobranças.' });
      return;
    }

    const alunoId = Number(req.params.alunoId);
    const { valor, vencimento, gateway, mesReferencia, descricao } = req.body;

    const resultado = await gatewayService.gerarCobrancaParaResponsavel(alunoId, {
      valor: valor !== undefined ? Number(valor) : undefined,
      vencimento,
      gateway,
      mesReferencia,
      descricao,
      userName: user?.nome || user?.username || 'Administrador'
    });

    res.json(resultado);
  } catch (err: any) {
    console.error('Error in POST /api/financeiro/aluno/:alunoId/gerar-cobranca:', err);
    res.status(500).json({ error: err.message || 'Erro ao gerar cobrança para responsável.' });
  }
});

// Webhook para receber confirmações automáticas de pagamento de gateways externos (InfinityPay, PaggPay, etc.)
app.post('/api/financeiro/webhook/:gateway', async (req, res) => {
  try {
    const gatewayName = req.params.gateway;
    const payload = req.body;
    const headers = req.headers;

    const resultado = await gatewayService.processarWebhook(gatewayName, payload, headers);
    res.status(200).json({ received: true, ...resultado });
  } catch (err: any) {
    console.error(`Error processing webhook for gateway ${req.params.gateway}:`, err);
    res.status(400).json({ error: err.message || 'Falha ao processar webhook do gateway.' });
  }
});

// Processamento / Varredura de mensalidades atrasadas
app.post('/api/financeiro/processar-atrasados', requireAuth, async (req, res) => {
  try {
    const role = (req as any).user?.role || 'Instrutor';
    if (role !== 'Administrador') {
      res.status(403).json({ error: 'Permissão negada. Apenas Administradores podem executar a verificação de atrasados.' });
      return;
    }

    const resultado = await gatewayService.verificarEAtualizarMensalidadesAtrasadas();
    res.json(resultado);
  } catch (err: any) {
    console.error('Error in POST /api/financeiro/processar-atrasados:', err);
    res.status(500).json({ error: err.message || 'Erro ao processar mensalidades atrasadas.' });
  }
});

// -------------------------------------------------------------
// CADASTROS COMPLETOS
// -------------------------------------------------------------

app.post('/api/cadastros-completos', upload.single('laudoArquivo'), async (req, res) => {
  try {
    const file = req.file;
    const body = req.body;

    const ref = body.ref || '';
    const nome = (body.nome || '').trim();
    const nascimento = body.nascimento || '';
    const whats = (body.whats || '').trim();
    const cidade = (body.cidade || '').trim();
    const bairro = (body.bairro || '').trim();
    const endereco = (body.endereco || '').trim();

    const escola = (body.escola || '').trim();
    const curso = (body.curso || '').trim();
    const objetivos = (body.objetivos || '').trim();

    const responsavel = (body.responsavel || '').trim();
    const parentesco = (body.parentesco || '').trim();
    const whatsResponsavel = (body.whatsResponsavel || '').trim();

    const possuiLaudo = body.possuiLaudo || '';
    const cid = (body.cid || '').trim();
    const laudoArquivoNome = file ? file.originalname : (body.laudoArquivoNome || '');
    const laudoArquivoPath = file ? file.path : '';
    const laudoArquivoMime = file ? file.mimetype : '';
    const laudoArquivoSize = file ? file.size : 0;

    const temAlergia = body.temAlergia || '';
    const alergias = (body.alergias || '').trim();

    const usaMedicamento = body.usaMedicamento || '';
    const medicamentos = (body.medicamentos || '').trim();

    const restricoes = (body.restricoes || '').trim();
    const condicoesSaude = (body.condicoesSaude || '').trim();

    const emergenciaNome = (body.emergenciaNome || '').trim();
    const emergenciaFone = (body.emergenciaFone || '').trim();
    const orientacaoEmergencia = (body.orientacaoEmergencia || '').trim();
    const seguranca = (body.seguranca || '').trim();

    const autorizaImagem = body.autorizaImagem === 'true' || body.autorizaImagem === true || body.imagem === 'on';

    let finalRef = ref;

    if (finalRef) {
      const existing = await dataService.getCadastroCompletoByRef(finalRef);
      if (existing && existing.laudoArquivoPath && file && fs.existsSync(existing.laudoArquivoPath)) {
        try {
          fs.unlinkSync(existing.laudoArquivoPath);
        } catch (err) {
          console.error('Error removing old laudo file:', err);
        }
      }
    } else {
      // Auto-create a pre-cadastro so it shows up in the Comando table
      const preResult = await dataService.createPreCadastro({
        tipoCadastro: responsavel ? 'responsavel' : 'aluno',
        nomeAluno: nome,
        nascimentoAluno: nascimento,
        cidadeAluno: cidade,
        whatsAluno: whats,
        nomeResponsavel: responsavel,
        parentesco,
        whatsResponsavel,
        status: 'Aguardando contato',
      });
      finalRef = String(preResult.id);
    }

    await dataService.createCadastroCompleto({
      ref: finalRef,
      nome,
      nascimento,
      whats,
      cidade,
      bairro,
      endereco,
      escola,
      curso,
      objetivos,
      responsavel,
      parentesco,
      whatsResponsavel,
      possuiLaudo,
      cid,
      laudoArquivoNome,
      laudoArquivoPath,
      laudoArquivoMime,
      laudoArquivoSize,
      temAlergia,
      alergias,
      usaMedicamento,
      medicamentos,
      restricoes,
      condicoesSaude,
      emergenciaNome,
      emergenciaFone,
      orientacaoEmergencia,
      seguranca,
      autorizaImagem,
    });

    res.json({
      success: true,
      message: 'Ficha enviada com sucesso! A equipe do Inspira dará continuidade ao atendimento.',
    });
  } catch (error: any) {
    console.error('Error saving cadastro completo:', error);
    res.status(500).json({ error: 'Erro ao salvar a ficha completa no banco de dados.' });
  }
});

// Create full registration from command panel (requires auth)
app.post('/api/comando/novo-aluno', requireAuth, upload.single('laudoArquivo'), async (req, res) => {
  try {
    const file = req.file;
    const body = req.body;
    
    const nome = (body.nome || '').trim();
    const nascimento = body.nascimento || '';
    const whats = (body.whats || '').trim();
    const cidade = (body.cidade || '').trim();
    const bairro = (body.bairro || '').trim();
    const endereco = (body.endereco || '').trim();
    const escola = (body.escola || '').trim();
    const curso = (body.curso || '').trim();
    const objetivos = (body.objetivos || '').trim();
    const responsavel = (body.responsavel || '').trim();
    const parentesco = (body.parentesco || '').trim();
    const whatsResponsavel = (body.whatsResponsavel || '').trim();
    const possuiLaudo = body.possuiLaudo || '';
    const cid = (body.cid || '').trim();
    const laudoArquivoNome = file ? file.originalname : (body.laudoArquivoNome || '');
    const laudoArquivoPath = file ? file.path : '';
    const laudoArquivoMime = file ? file.mimetype : '';
    const laudoArquivoSize = file ? file.size : 0;
    const temAlergia = body.temAlergia || '';
    const alergias = (body.alergias || '').trim();
    const usaMedicamento = body.usaMedicamento || '';
    const medicamentos = (body.medicamentos || '').trim();
    const restricoes = (body.restricoes || '').trim();
    const condicoesSaude = (body.condicoesSaude || '').trim();
    const emergenciaNome = (body.emergenciaNome || '').trim();
    const emergenciaFone = (body.emergenciaFone || '').trim();
    const orientacaoEmergencia = (body.orientacaoEmergencia || '').trim();
    const seguranca = (body.seguranca || '').trim();
    const autorizaImagem = body.autorizaImagem === 'true' || body.autorizaImagem === true || body.imagem === 'on';

    // First create the pre-cadastro
    const preResult = await dataService.createPreCadastro({
      tipoCadastro: responsavel ? 'responsavel' : 'aluno',
      nomeAluno: nome,
      nascimentoAluno: nascimento,
      cidadeAluno: cidade,
      whatsAluno: whats,
      nomeResponsavel: responsavel,
      parentesco,
      whatsResponsavel,
      status: 'Confirmado',
    });

    const newRefId = String(preResult.id);

    // Then insert the full registration
    await dataService.createCadastroCompleto({
      ref: newRefId,
      nome,
      nascimento,
      whats,
      cidade,
      bairro,
      endereco,
      escola,
      curso,
      objetivos,
      responsavel,
      parentesco,
      whatsResponsavel,
      possuiLaudo,
      cid,
      laudoArquivoNome,
      laudoArquivoPath,
      laudoArquivoMime,
      laudoArquivoSize,
      temAlergia,
      alergias,
      usaMedicamento,
      medicamentos,
      restricoes,
      condicoesSaude,
      emergenciaNome,
      emergenciaFone,
      orientacaoEmergencia,
      seguranca,
      autorizaImagem,
    });

    res.json({
      success: true,
      message: 'Aluno cadastrado com sucesso!',
      id: newRefId,
    });
  } catch (error: any) {
    console.error('Error saving novo aluno:', error);
    res.status(500).json({ error: 'Erro ao cadastrar novo aluno.' });
  }
});

app.get('/api/cadastros-completos/:ref', requireAuth, async (req, res) => {
  const { ref } = req.params;
  try {
    const full = await dataService.getCadastroCompletoByRef(ref);

    if (!full) {
      res.status(404).json({ error: 'Ficha completa não encontrada.' });
      return;
    }

    res.json(full);
  } catch (error: any) {
    console.error('Error getting cadastro completo:', error);
    res.status(500).json({ error: 'Erro ao consultar ficha completa.' });
  }
});

// Secure medical report download (requires authentication)
app.get('/api/laudos/:filename', requireAuth, (req, res) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    res.status(404).send('Arquivo não encontrado.');
    return;
  }

  res.sendFile(filePath);
});


// --- EQUIPE DO COMANDO ROUTES ---
app.get('/api/equipe', requireAuth, async (req, res) => {
  try {
    if ((req as any).user?.role !== 'Administrador') {
      res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      return;
    }
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      const users = (data.users || []).map(u => ({
        id: u.id,
        email: u.user_metadata?.email_contato || u.email,
        login: u.user_metadata?.login || (u.email ? u.email.split('@')[0] : ''),
        nome_completo: u.user_metadata?.nome_completo || 'Sem nome',
        funcao: u.user_metadata?.funcao || 'Administrador',
        status: u.user_metadata?.status || 'Ativo',
        whatsapp: u.user_metadata?.whatsapp || '',
        foto: u.user_metadata?.foto || '',
        criado_em: u.created_at,
        ultimo_acesso: u.last_sign_in_at
      }));
      res.json(users);
    } else {
      res.status(400).json({ error: 'Banco de dados não configurado para equipe.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao listar equipe.' });
  }
});

app.post('/api/equipe', requireAuth, async (req, res) => {
  try {
    if ((req as any).user?.role !== 'Administrador') {
      res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      return;
    }
    const { login, email, password, nome_completo, whatsapp, funcao, foto, status } = req.body;
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
            // Format login to be a valid email structure, without spaces
      let authEmail = email ? email.trim() : '';
      if (login) {
        let safeLogin = login.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9_.-]/g, '');
        if (!safeLogin) safeLogin = 'user' + Math.floor(Math.random() * 1000);
        authEmail = safeLogin.includes('@') ? safeLogin : `${safeLogin}@inspira.com`;
      } else if (!authEmail) {
        throw new Error("É necessário informar o Login ou Email");
      }
      
      const { data, error } = await supabase.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          nome_completo,
          whatsapp,
          funcao,
          status: status || 'Ativo',
          login,
          email_contato: email,
          foto
        }
      });
      if (error) throw error;
      
      await dataService.addHistorico(0, 'Equipe', `${(req as any).user?.username || 'Sistema'} criou usuário ${nome_completo}`, 'Comando Geral');
      res.json({ success: true, user: data.user });
    } else {
      res.status(400).json({ error: 'Banco de dados não configurado para equipe.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Erro ao criar usuário.' });
  }
});



app.delete('/api/equipe/:id', requireAuth, async (req, res) => {
  try {
    if ((req as any).user?.role !== 'Administrador') {
      res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' });
      return;
    }
    const { id } = req.params;

    // Prevenir que o usuário atual exclua sua própria conta logada
    const currentUserId = (req as any).user?.id;
    if (currentUserId && String(currentUserId) === String(id)) {
      res.status(400).json({ error: 'Não é permitido excluir o próprio usuário logado no momento.' });
      return;
    }

    let userName = 'Usuário';
    let deleted = false;
    let supaErrorMessage = '';

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: userData, error: fetchErr } = await supabase.auth.admin.getUserById(id);
        if (userData?.user) {
          userName = userData.user.user_metadata?.nome_completo || userData.user.email || 'Usuário';
          const { error } = await supabase.auth.admin.deleteUser(id);
          if (error) {
            supaErrorMessage = error.message;
            throw error;
          }
          deleted = true;
        }
      } catch (supaErr: any) {
        console.warn('Supabase delete user notice:', supaErr?.message);
        supaErrorMessage = supaErr?.message || 'Falha ao remover usuário no Supabase';
      }
    }

    try {
      const stmt = db.prepare('SELECT nome_completo, username FROM equipe_comando WHERE id = ?');
      const row = stmt.get(id) as any;
      if (row) {
        userName = row.nome_completo || row.username || userName;
        db.prepare('DELETE FROM equipe_comando WHERE id = ?').run(id);
        deleted = true;
      }
    } catch (e) {}

    if (!deleted && isSupabaseConfigured() && supaErrorMessage) {
      res.status(500).json({ error: `Erro no Supabase: ${supaErrorMessage}` });
      return;
    }

    await dataService.addHistorico(0, 'Equipe', `${(req as any).user?.nome || (req as any).user?.username || 'Sistema'} removeu o usuário ${userName}`, 'Comando Geral');
    
    res.json({ success: true, message: `Usuário ${userName} excluído com sucesso.` });
  } catch (err: any) {
    console.error('DELETE /api/equipe/:id ERROR:', err);
    res.status(500).json({ error: err.message || 'Erro ao remover usuário.' });
  }
});

app.patch('/api/equipe/:id', requireAuth, async (req, res) => {
  try {
    if ((req as any).user?.role !== 'Administrador') {
      res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
      return;
    }
    const { id } = req.params;
    const { nome_completo, whatsapp, funcao, status, password, login, email, foto } = req.body;
    if (isSupabaseConfigured()) {
      const supabase = getSupabase();
      
      const { data: userData } = await supabase.auth.admin.getUserById(id);
      if (!userData || !userData.user) throw new Error("User not found");
      
      const updates: any = {
        user_metadata: {
          ...userData.user.user_metadata,
          nome_completo: nome_completo !== undefined ? nome_completo : userData.user.user_metadata?.nome_completo,
          whatsapp: whatsapp !== undefined ? whatsapp : userData.user.user_metadata?.whatsapp,
          funcao: funcao !== undefined ? funcao : userData.user.user_metadata?.funcao,
          status: status !== undefined ? status : userData.user.user_metadata?.status,
          login: login !== undefined ? login : userData.user.user_metadata?.login,
          email_contato: email !== undefined ? email : userData.user.user_metadata?.email_contato,
          foto: foto !== undefined ? foto : userData.user.user_metadata?.foto
        }
      };
      
      if (password) updates.password = password;
      
      const { error } = await supabase.auth.admin.updateUserById(id, updates);
      if (error) throw error;
      
      if (status !== undefined && status !== userData.user.user_metadata?.status) {
          await dataService.addHistorico(0, 'Equipe', `${(req as any).user?.username || 'Sistema'} ${status === 'Bloqueado' ? 'bloqueou' : 'ativou'} o usuário ${updates.user_metadata.nome_completo}`, 'Comando Geral');
      } else {
          await dataService.addHistorico(0, 'Equipe', `${(req as any).user?.username || 'Sistema'} editou o usuário ${updates.user_metadata.nome_completo}`, 'Comando Geral');
      }
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Banco de dados não configurado para equipe.' });
    }
  } catch (err: any) {
    require('fs').appendFileSync('debug_error.log', 'PATCH ERROR: ' + err.message + '\n');
      console.error('PATCH /api/equipe/:id ERROR:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar usuário.' });
  }
});



// Handle direct .html routes for seamless integration with links
app.use((req, res, next) => {
  if (req.path === '/comando.html' || req.path === '/ficha-completa.html') {
    req.url = '/';
  }
  next();
});

// -------------------------------------------------------------
// VITE OR STATIC FILE SERVING
// -------------------------------------------------------------

// Global API Error handler
app.use((err: any, req: any, res: any, next: any) => {
  if (req.path.startsWith('/api/')) {
    console.error('API Error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
  } else {
    next(err);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inspira Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
