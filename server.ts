import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import cookieParser from 'cookie-parser';
import { createServer as createViteServer } from 'vite';
import { db, hashPassword, verifyPassword } from './server/db.js';
import { dataService } from './server/dataService.js';
import { isSupabaseConfigured, testSupabaseConnection } from './server/supabase.js';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Multer storage for secure medical reports (laudos)
const uploadsDir = path.join(process.cwd(), 'uploads', 'laudos');
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
    const session = await dataService.getSession(token);

    if (!session) {
      res.status(401).json({ error: 'Sessão inválida ou expirada.' });
      return;
    }

    if (new Date(session.expires_at) < new Date()) {
      await dataService.deleteSession(token);
      res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
      return;
    }

    (req as any).user = { id: session.user_id, username: session.username };
    next();
  } catch (err) {
    console.error('Auth verification error:', err);
    res.status(500).json({ error: 'Erro ao verificar autenticação.' });
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
    const user = await dataService.getAdminUserByUsername(username);

    if (!user || !verifyPassword(password, user.password_hash, user.salt)) {
      res.status(401).json({ error: 'Usuário ou senha inválidos.' });
      return;
    }

    // Create session
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    await dataService.createSession(token, user.id, expiresAt);

    // Set secure cookie
    res.cookie('inspira_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, token, username: user.username });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao processar login.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const token = getAuthToken(req);
  if (!token) {
    res.json({ authenticated: false });
    return;
  }

  try {
    const session = await dataService.getSession(token);

    if (!session || new Date(session.expires_at) < new Date()) {
      res.json({ authenticated: false });
      return;
    }

    res.json({ authenticated: true, username: session.username });
  } catch (error: any) {
    res.json({ authenticated: false });
  }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = getAuthToken(req);
  if (token) {
    await dataService.deleteSession(token);
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
    res.status(500).json({ error: 'Erro ao consultar cadastros.' });
  }
});

app.patch('/api/pre-cadastros/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['Aguardando contato', 'Em atendimento', 'Confirmado'];
  if (!validStatuses.includes(status)) {
    res.status(400).json({ error: 'Status inválido.' });
    return;
  }

  try {
    await dataService.updatePreCadastroStatus(id, status);
    res.json({ success: true, status });
  } catch (error: any) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Erro ao atualizar status.' });
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

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
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

startServer();
