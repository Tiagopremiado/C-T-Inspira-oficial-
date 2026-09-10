import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads', 'laudos') : path.join(process.cwd(), 'uploads', 'laudos');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'inspira.db');

// Helper to hash password using PBKDF2
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const calculated = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

// In-memory fallback database for serverless environments where node:sqlite is not available (e.g. Node 20 on Vercel)
class FallbackMemoryDatabase {
  admin_users: any[] = [];
  sessions: any[] = [];
  pre_cadastros: any[] = [];
  cadastros_completos: any[] = [];
  private nextPreId = 1;
  private nextFullId = 1;

  constructor() {
    const defaultPassword = process.env.ADMIN_PASSWORD || 'inspira2026';
    const { hash, salt } = hashPassword(defaultPassword);
    this.admin_users.push({
      id: 1,
      username: 'comando',
      password_hash: hash,
      salt,
      created_at: new Date().toISOString(),
    });
  }

  exec(_sql: string) {
    // DDL statements are safely ignored in memory
  }

  prepare(sql: string) {
    const cleanSql = sql.replace(/\s+/g, ' ').trim();

    return {
      get: (...params: any[]) => {
        if (cleanSql.includes('FROM admin_users WHERE username = ?')) {
          const username = params[0]?.trim();
          return this.admin_users.find((u) => u.username === username) || null;
        }

        if (cleanSql.includes('FROM sessions s') || cleanSql.includes('FROM sessions WHERE token = ?')) {
          const token = params[0];
          const session = this.sessions.find((s) => s.token === token);
          if (!session) return null;
          const user = this.admin_users.find((u) => u.id === session.user_id);
          return {
            token: session.token,
            expires_at: session.expires_at,
            user_id: session.user_id,
            username: user ? user.username : 'comando',
          };
        }

        if (cleanSql.includes('FROM cadastros_completos WHERE ref = ? OR id = ?')) {
          const ref = String(params[0]);
          const id = Number(params[1]);
          return this.cadastros_completos.find((c) => String(c.ref) === ref || c.id === id) || null;
        }

        return null;
      },

      all: (..._params: any[]) => {
        if (cleanSql.includes('FROM pre_cadastros')) {
          return [...this.pre_cadastros].reverse();
        }
        if (cleanSql.includes('FROM cadastros_completos')) {
          return [...this.cadastros_completos].reverse();
        }
        return [];
      },

      run: (...params: any[]) => {
        if (cleanSql.includes('INSERT INTO admin_users')) {
          const [username, password_hash, salt, created_at] = params;
          const existing = this.admin_users.find((u) => u.username === username);
          if (existing) {
            existing.password_hash = password_hash;
            existing.salt = salt;
          } else {
            this.admin_users.push({ id: this.admin_users.length + 1, username, password_hash, salt, created_at });
          }
          return { lastInsertRowid: this.admin_users.length };
        }

        if (cleanSql.includes('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?')) {
          const [hash, salt, userId] = params;
          const user = this.admin_users.find((u) => u.id === Number(userId));
          if (user) {
            user.password_hash = hash;
            user.salt = salt;
          }
          return { changes: 1 };
        }

        if (cleanSql.includes('INSERT INTO sessions')) {
          const [token, user_id, created_at, expires_at] = params;
          this.sessions = this.sessions.filter((s) => s.token !== token);
          this.sessions.push({ token, user_id, created_at, expires_at });
          return { changes: 1 };
        }

        if (cleanSql.includes('DELETE FROM sessions WHERE token = ?')) {
          const token = params[0];
          this.sessions = this.sessions.filter((s) => s.token !== token);
          return { changes: 1 };
        }

        if (cleanSql.includes('INSERT INTO pre_cadastros')) {
          const newId = this.nextPreId++;
          const record = {
            id: newId,
            criado_em: params[0],
            status: params[1],
            tipo_cadastro: params[2],
            nome_aluno: params[3],
            nascimento_aluno: params[4],
            cidade_aluno: params[5],
            whats_aluno: params[6],
            nome_responsavel: params[7],
            parentesco: params[8],
            whats_responsavel: params[9],
            contato_preferido: params[10],
            observacao: params[11],
          };
          this.pre_cadastros.push(record);
          return { lastInsertRowid: newId };
        }

        if (cleanSql.includes('UPDATE pre_cadastros SET status = ? WHERE id = ?')) {
          const [status, id] = params;
          const found = this.pre_cadastros.find((p) => p.id === Number(id));
          if (found) found.status = status;
          return { changes: 1 };
        }

        if (cleanSql.includes('DELETE FROM pre_cadastros WHERE id = ?')) {
          const id = Number(params[0]);
          this.pre_cadastros = this.pre_cadastros.filter((p) => p.id !== id);
          return { changes: 1 };
        }

        if (cleanSql.includes('DELETE FROM cadastros_completos WHERE ref = ?')) {
          const ref = String(params[0]);
          this.cadastros_completos = this.cadastros_completos.filter((c) => String(c.ref) !== ref);
          return { changes: 1 };
        }

        if (cleanSql.includes('INSERT INTO cadastros_completos')) {
          const newId = this.nextFullId++;
          this.cadastros_completos.push({
            id: newId,
            ref: params[0],
            enviado_em: params[1],
            nome: params[2],
            // rest of fields
          });
          return { lastInsertRowid: newId };
        }

        return { changes: 0 };
      },
    };
  }
}

// Safely initialize database
let instanceDb: any = null;

try {
  const req = createRequire(path.join(process.cwd(), 'package.json'));
  const sqlite = req('node:sqlite');
  if (sqlite && sqlite.DatabaseSync) {
    const realDb = new sqlite.DatabaseSync(DB_PATH);
    realDb.exec('PRAGMA journal_mode = WAL;');
    realDb.exec(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES admin_users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS pre_cadastros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        criado_em TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'Aguardando contato',
        tipo_cadastro TEXT,
        nome_aluno TEXT NOT NULL,
        nascimento_aluno TEXT,
        cidade_aluno TEXT,
        whats_aluno TEXT,
        nome_responsavel TEXT,
        parentesco TEXT,
        whats_responsavel TEXT,
        contato_preferido TEXT,
        observacao TEXT
      );

      CREATE TABLE IF NOT EXISTS cadastros_completos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ref TEXT,
        enviado_em TEXT NOT NULL,
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
        laudo_arquivo_size INTEGER,
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

      CREATE INDEX IF NOT EXISTS idx_pre_status ON pre_cadastros(status);
      CREATE INDEX IF NOT EXISTS idx_full_ref ON cadastros_completos(ref);
    `);

    // Seed default admin user 'comando' if none exists
    const checkAdmin = realDb.prepare('SELECT id FROM admin_users WHERE username = ?');
    const defaultUser = checkAdmin.get('comando');

    if (!defaultUser) {
      const defaultPassword = process.env.ADMIN_PASSWORD || 'inspira2026';
      const { hash, salt } = hashPassword(defaultPassword);
      const insertAdmin = realDb.prepare(`
        INSERT INTO admin_users (username, password_hash, salt, created_at)
        VALUES (?, ?, ?, ?)
      `);
      insertAdmin.run('comando', hash, salt, new Date().toISOString());
    }

    instanceDb = realDb;
  }
} catch (err: any) {
  console.warn('Native node:sqlite not available, using fallback memory storage:', err.message);
}

if (!instanceDb) {
  instanceDb = new FallbackMemoryDatabase();
}

export const db = instanceDb;
