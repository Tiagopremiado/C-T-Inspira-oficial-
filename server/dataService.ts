import { db, hashPassword, verifyPassword } from './db.js';
import { isSupabaseConfigured, getSupabase } from './supabase.js';

export interface PreCadastroRecord {
  id: number | string;
  criadoEm: string;
  status: string;
  tipoCadastro?: string;
  nomeAluno: string;
  nascimentoAluno: string;
  cidadeAluno: string;
  whatsAluno?: string;
  nomeResponsavel?: string;
  parentesco?: string;
  whatsResponsavel?: string;
  contatoPreferido?: string;
  observacao?: string;
  hasFullRegistration?: boolean;
  fichaId?: number | string | null;
}

export interface CadastroCompletoRecord {
  id: number | string;
  ref: string;
  enviadoEm: string;
  nome: string;
  nascimento: string;
  whats: string;
  cidade: string;
  bairro: string;
  endereco: string;
  escola: string;
  curso: string;
  objetivos: string;
  responsavel: string;
  parentesco: string;
  whatsResponsavel: string;
  possuiLaudo: string;
  cid: string;
  laudoArquivoNome?: string;
  laudoArquivoPath?: string;
  laudoArquivoMime?: string;
  laudoArquivoSize?: number;
  temAlergia?: string;
  alergias?: string;
  usaMedicamento?: string;
  medicamentos?: string;
  restricoes?: string;
  condicoesSaude?: string;
  emergenciaNome?: string;
  emergenciaFone?: string;
  orientacaoEmergencia?: string;
  seguranca?: string;
  autorizaImagem?: boolean;
}

// -------------------------------------------------------------
// DATA SERVICE IMPLEMENTATION
// -------------------------------------------------------------

export const dataService = {
  getProviderInfo() {
    const isSupa = isSupabaseConfigured();
    return {
      provider: isSupa ? 'supabase' : 'sqlite',
      isSupabase: isSupa,
      label: isSupa ? 'Supabase (Nuvem)' : 'SQLite (Local)',
    };
  },

  // -----------------------------------------------------------
  // AUTH & SESSIONS
  // -----------------------------------------------------------
  async getAdminUserByUsername(username: string) {
    // If Supabase is configured, we use Supabase Auth now, so we bypass querying the public admin_users table.
    // We only use this local fallback if Supabase Auth is not being used.
    try {
      const stmt = db.prepare('SELECT * FROM admin_users WHERE username = ?');
      return stmt.get(username.trim()) as any;
    } catch (e) {
      return null;
    }
  },

  async createSession(token: string, userId: number | string, expiresAt: string) {
    const createdAt = new Date().toISOString();
    // Supabase sessions are now handled by Supabase Auth (JWT). 
    // We only need to store sessions locally if not using Supabase.
    
    try {
      const insertSession = db.prepare(`
        INSERT INTO sessions (token, user_id, created_at, expires_at)
        VALUES (?, ?, ?, ?)
      `);
      insertSession.run(token, Number(userId) || 1, createdAt, expiresAt);
    } catch (e) {
      console.warn('Failed to persist session to local DB:', e);
    }
  },

  async getSession(token: string) {
    // Supabase validation is handled via supabase.auth.getUser() in server.ts
    // This is purely for local fallback
    try {
      const sessionStmt = db.prepare(`
        SELECT s.token, s.expires_at, u.id as user_id, u.username
        FROM sessions s
        JOIN admin_users u ON s.user_id = u.id
        WHERE s.token = ?
      `);
      return sessionStmt.get(token) as any;
    } catch (e) {
      return null;
    }
  },

  async deleteSession(token: string) {
    try {
      db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    } catch (e) {
      // ignore
    }
  },

  async updateAdminPassword(userId: number | string, newPassword: string) {
    const { hash, salt } = hashPassword(newPassword);
    try {
      db.prepare('UPDATE admin_users SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, userId);
    } catch (e) {
      // ignore
    }
  },

  // -----------------------------------------------------------
  // PRÉ-CADASTROS
  // -----------------------------------------------------------
  async createPreCadastro(data: {
    tipoCadastro?: string;
    nomeAluno: string;
    nascimentoAluno: string;
    cidadeAluno: string;
    whatsAluno?: string;
    nomeResponsavel?: string;
    parentesco?: string;
    whatsResponsavel?: string;
    contatoPreferido?: string;
    observacao?: string;
    status?: string;
  }) {
    const criadoEm = new Date().toISOString();
    const status = data.status || 'Aguardando contato';

    let supabaseId: number | null = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: inserted, error } = await supabase
          .from('pre_cadastros')
          .insert({
            criado_em: criadoEm,
            status,
            tipo_cadastro: data.tipoCadastro || 'aluno',
            nome_aluno: data.nomeAluno.trim(),
            nascimento_aluno: data.nascimentoAluno,
            cidade_aluno: data.cidadeAluno.trim(),
            whats_aluno: data.whatsAluno ? data.whatsAluno.trim() : '',
            nome_responsavel: data.nomeResponsavel ? data.nomeResponsavel.trim() : '',
            parentesco: data.parentesco ? data.parentesco.trim() : '',
            whats_responsavel: data.whatsResponsavel ? data.whatsResponsavel.trim() : '',
            contato_preferido: data.contatoPreferido || '',
            observacao: data.observacao ? data.observacao.trim() : '',
          })
          .select('id')
          .single();

        if (error) {
          console.warn('Supabase createPreCadastro error:', error.message);
        } else if (inserted) {
          supabaseId = inserted.id;
        }
      } catch (err) {
        console.warn('Supabase createPreCadastro failed, using SQLite:', err);
      }
    }

    // Always insert locally in SQLite for resilience & backup
    const insertStmt = db.prepare(`
      INSERT INTO pre_cadastros (
        criado_em, status, tipo_cadastro, nome_aluno, nascimento_aluno,
        cidade_aluno, whats_aluno, nome_responsavel, parentesco,
        whats_responsavel, contato_preferido, observacao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertStmt.run(
      criadoEm,
      status,
      data.tipoCadastro || 'aluno',
      data.nomeAluno.trim(),
      data.nascimentoAluno,
      data.cidadeAluno.trim(),
      data.whatsAluno ? data.whatsAluno.trim() : '',
      data.nomeResponsavel ? data.nomeResponsavel.trim() : '',
      data.parentesco ? data.parentesco.trim() : '',
      data.whatsResponsavel ? data.whatsResponsavel.trim() : '',
      data.contatoPreferido || '',
      data.observacao ? data.observacao.trim() : ''
    );

    const finalId = supabaseId || Number(result.lastInsertRowid);
    return { id: finalId, criadoEm, status };
  },

  async getPreCadastros(): Promise<PreCadastroRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        // Fetch pre_cadastros and associated cadastros_completos
        const { data: preList, error } = await supabase
          .from('pre_cadastros')
          .select('*')
          .order('id', { ascending: false });

        if (error) {
          console.warn('Supabase getPreCadastros error, fallback to SQLite:', error.message);
        } else if (preList) {
          // Fetch references in cadastros_completos
          const { data: fullList } = await supabase
            .from('cadastros_completos')
            .select('id, ref, enviado_em');

          const fullMap = new Map<string, { id: any; enviado_em: any }>();
          if (fullList) {
            fullList.forEach((f) => {
              if (f.ref) fullMap.set(String(f.ref), { id: f.id, enviado_em: f.enviado_em });
            });
          }

          return preList.map((r: any) => {
            const full = fullMap.get(String(r.id));
            return {
              id: r.id,
              criadoEm: r.criado_em,
              status: r.status,
              tipoCadastro: r.tipo_cadastro,
              nomeAluno: r.nome_aluno,
              nascimentoAluno: r.nascimento_aluno,
              cidadeAluno: r.cidade_aluno,
              whatsAluno: r.whats_aluno,
              nomeResponsavel: r.nome_responsavel,
              parentesco: r.parentesco,
              whatsResponsavel: r.whats_responsavel,
              contatoPreferido: r.contato_preferido,
              observacao: r.observacao,
              hasFullRegistration: Boolean(full),
              fichaId: full ? full.id : null,
            };
          });
        }
      } catch (err) {
        console.warn('Supabase getPreCadastros exception, falling back to SQLite:', err);
      }
    }

    const query = `
      SELECT 
        p.*,
        f.id as ficha_id,
        f.enviado_em as ficha_enviado_em,
        CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as has_full_registration
      FROM pre_cadastros p
      LEFT JOIN cadastros_completos f ON CAST(p.id AS TEXT) = f.ref
      ORDER BY p.id DESC
    `;
    const rows = db.prepare(query).all() as any[];

    return rows.map((r) => ({
      id: r.id,
      criadoEm: r.criado_em,
      status: r.status,
      tipoCadastro: r.tipo_cadastro,
      nomeAluno: r.nome_aluno,
      nascimentoAluno: r.nascimento_aluno,
      cidadeAluno: r.cidade_aluno,
      whatsAluno: r.whats_aluno,
      nomeResponsavel: r.nome_responsavel,
      parentesco: r.parentesco,
      whatsResponsavel: r.whats_responsavel,
      contatoPreferido: r.contato_preferido,
      observacao: r.observacao,
      hasFullRegistration: Boolean(r.has_full_registration),
      fichaId: r.ficha_id,
    }));
  },

  async updatePreCadastroStatus(id: number | string, status: string) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('pre_cadastros').update({ status }).eq('id', id);
      } catch (err) {
        console.warn('Supabase updatePreCadastroStatus error:', err);
      }
    }

    const updateStmt = db.prepare('UPDATE pre_cadastros SET status = ? WHERE id = ?');
    updateStmt.run(status, id);
  },

  async deletePreCadastro(id: number | string) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('cadastros_completos').delete().eq('ref', String(id));
        await supabase.from('pre_cadastros').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deletePreCadastro error:', err);
      }
    }

    db.prepare('DELETE FROM cadastros_completos WHERE ref = ?').run(String(id));
    db.prepare('DELETE FROM pre_cadastros WHERE id = ?').run(id);
  },

  // -----------------------------------------------------------
  // CADASTROS COMPLETOS
  // -----------------------------------------------------------
  async createCadastroCompleto(data: any) {
    const enviadoEm = new Date().toISOString();

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        if (data.ref) {
          await supabase.from('cadastros_completos').delete().eq('ref', String(data.ref));
        }

        const { error } = await supabase.from('cadastros_completos').insert({
          ref: String(data.ref || ''),
          enviado_em: enviadoEm,
          nome: data.nome,
          nascimento: data.nascimento,
          whats: data.whats,
          cidade: data.cidade,
          bairro: data.bairro,
          endereco: data.endereco,
          escola: data.escola,
          curso: data.curso,
          objetivos: data.objetivos,
          responsavel: data.responsavel,
          parentesco: data.parentesco,
          whats_responsavel: data.whatsResponsavel,
          possui_laudo: data.possuiLaudo,
          cid: data.cid,
          laudo_arquivo_nome: data.laudoArquivoNome || '',
          laudo_arquivo_path: data.laudoArquivoPath || '',
          laudo_arquivo_mime: data.laudoArquivoMime || '',
          laudo_arquivo_size: data.laudoArquivoSize || 0,
          tem_alergia: data.temAlergia,
          alergias: data.alergias,
          usa_medicamento: data.usaMedicamento,
          medicamentos: data.medicamentos,
          restricoes: data.restricoes,
          condicoes_saude: data.condicoesSaude,
          emergencia_nome: data.emergenciaNome,
          emergencia_fone: data.emergenciaFone,
          orientacao_emergencia: data.orientacaoEmergencia,
          seguranca: data.seguranca,
          autoriza_imagem: data.autorizaImagem ? 1 : 0,
        });

        if (error) {
          console.warn('Supabase createCadastroCompleto error:', error.message);
        }

        // Update pre_cadastro status if needed
        if (data.ref) {
          await supabase
            .from('pre_cadastros')
            .update({ status: 'Em atendimento' })
            .eq('id', data.ref)
            .eq('status', 'Aguardando contato');
        }
      } catch (err) {
        console.warn('Supabase createCadastroCompleto failed, storing in SQLite:', err);
      }
    }

    // Always store in SQLite
    if (data.ref) {
      db.prepare('DELETE FROM cadastros_completos WHERE ref = ?').run(String(data.ref));
    }

    const insertStmt = db.prepare(`
      INSERT INTO cadastros_completos (
        ref, enviado_em, nome, nascimento, whats, cidade, bairro, endereco,
        escola, curso, objetivos, responsavel, parentesco, whats_responsavel,
        possui_laudo, cid, laudo_arquivo_nome, laudo_arquivo_path, laudo_arquivo_mime, laudo_arquivo_size,
        tem_alergia, alergias, usa_medicamento, medicamentos, restricoes, condicoes_saude,
        emergencia_nome, emergencia_fone, orientacao_emergencia, seguranca, autoriza_imagem
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
    `);

    insertStmt.run(
      String(data.ref || ''),
      enviadoEm,
      data.nome,
      data.nascimento,
      data.whats,
      data.cidade,
      data.bairro,
      data.endereco,
      data.escola,
      data.curso,
      data.objetivos,
      data.responsavel,
      data.parentesco,
      data.whatsResponsavel,
      data.possuiLaudo,
      data.cid,
      data.laudoArquivoNome || '',
      data.laudoArquivoPath || '',
      data.laudoArquivoMime || '',
      data.laudoArquivoSize || 0,
      data.temAlergia,
      data.alergias,
      data.usaMedicamento,
      data.medicamentos,
      data.restricoes,
      data.condicoesSaude,
      data.emergenciaNome,
      data.emergenciaFone,
      data.orientacaoEmergencia,
      data.seguranca,
      data.autorizaImagem ? 1 : 0
    );

    if (data.ref) {
      db.prepare("UPDATE pre_cadastros SET status = 'Em atendimento' WHERE id = ? AND status = 'Aguardando contato'").run(data.ref);
    }
  },

  async getCadastroCompletoByRef(ref: string | number): Promise<any | null> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('cadastros_completos')
          .select('*')
          .or(`ref.eq.${ref},id.eq.${Number(ref) || 0}`)
          .maybeSingle();

        if (error) {
          console.warn('Supabase getCadastroCompletoByRef error:', error.message);
        } else if (data) {
          return {
            id: data.id,
            ref: data.ref,
            enviadoEm: data.enviado_em,
            nome: data.nome,
            nascimento: data.nascimento,
            whats: data.whats,
            cidade: data.cidade,
            bairro: data.bairro,
            endereco: data.endereco,
            escola: data.escola,
            curso: data.curso,
            objetivos: data.objetivos,
            responsavel: data.responsavel,
            parentesco: data.parentesco,
            whatsResponsavel: data.whats_responsavel,
            possuiLaudo: data.possui_laudo,
            cid: data.cid,
            laudoArquivoNome: data.laudo_arquivo_nome,
            laudoArquivoPath: data.laudo_arquivo_path,
            laudoDownloadUrl: data.laudo_arquivo_path ? `/api/laudos/${data.laudo_arquivo_path.split('/').pop()}` : null,
            temAlergia: data.tem_alergia,
            alergias: data.alergias,
            usaMedicamento: data.usa_medicamento,
            medicamentos: data.medicamentos,
            restricoes: data.restricoes,
            condicoesSaude: data.condicoes_saude,
            emergenciaNome: data.emergencia_nome,
            emergenciaFone: data.emergencia_fone,
            orientacaoEmergencia: data.orientacao_emergencia,
            seguranca: data.seguranca,
            autorizaImagem: Boolean(data.autoriza_imagem),
          };
        }
      } catch (err) {
        console.warn('Supabase getCadastroCompletoByRef error, fallback to SQLite:', err);
      }
    }

    const row = db.prepare('SELECT * FROM cadastros_completos WHERE ref = ? OR id = ?').get(String(ref), Number(ref) || 0) as any;
    if (!row) return null;

    return {
      id: row.id,
      ref: row.ref,
      enviadoEm: row.enviado_em,
      nome: row.nome,
      nascimento: row.nascimento,
      whats: row.whats,
      cidade: row.cidade,
      bairro: row.bairro,
      endereco: row.endereco,
      escola: row.escola,
      curso: row.curso,
      objetivos: row.objetivos,
      responsavel: row.responsavel,
      parentesco: row.parentesco,
      whatsResponsavel: row.whats_responsavel,
      possuiLaudo: row.possui_laudo,
      cid: row.cid,
      laudoArquivoNome: row.laudo_arquivo_nome,
      laudoArquivoPath: row.laudo_arquivo_path,
      laudoDownloadUrl: row.laudo_arquivo_path ? `/api/laudos/${row.laudo_arquivo_path.split('/').pop()}` : null,
      temAlergia: row.tem_alergia,
      alergias: row.alergias,
      usaMedicamento: row.usa_medicamento,
      medicamentos: row.medicamentos,
      restricoes: row.restricoes,
      condicoesSaude: row.condicoes_saude,
      emergenciaNome: row.emergencia_nome,
      emergenciaFone: row.emergencia_fone,
      orientacaoEmergencia: row.orientacao_emergencia,
      seguranca: row.seguranca,
      autorizaImagem: Boolean(row.autoriza_imagem),
    };
  },
};
