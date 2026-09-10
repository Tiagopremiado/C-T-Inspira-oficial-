import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

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
export const db = new DatabaseSync(DB_PATH);

// Enable WAL mode for better concurrency and durability
db.exec('PRAGMA journal_mode = WAL;');

// Initialize tables
db.exec(`
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

// Helper to hash password using PBKDF2
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, generatedSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const calculated = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(calculated, 'hex'), Buffer.from(hash, 'hex'));
}

// Seed default admin user 'comando' if none exists
const checkAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?');
const defaultUser = checkAdmin.get('comando');

if (!defaultUser) {
  const defaultPassword = process.env.ADMIN_PASSWORD || 'inspira2026';
  const { hash, salt } = hashPassword(defaultPassword);
  const insertAdmin = db.prepare(`
    INSERT INTO admin_users (username, password_hash, salt, created_at)
    VALUES (?, ?, ?, ?)
  `);
  insertAdmin.run('comando', hash, salt, new Date().toISOString());
  console.log("Default admin account 'comando' initialized successfully.");
}
