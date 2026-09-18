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
          console.error('Supabase createPreCadastro error:', error);
          throw new Error('Database Error: ' + error.message);
        } else if (inserted) {
          supabaseId = inserted.id;
        }
      } catch (err) {
        console.error('Supabase createPreCadastro failed:', err);
        throw err;
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
          console.error('CRITICAL SUPABASE ERROR IN getPreCadastros:', error);
   throw new Error('Supabase select failed: ' + error.message);
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
              documentacaoStatus: r.documentacao_status || 'Pendente',
              ultimoContatoEm: r.ultimo_contato_em,
              responsavelContato: r.responsavel_contato,
              proximoPasso: r.proximo_passo,
              observacaoContato: r.observacao_contato,
            };
          });
        }
      } catch (err) {
        console.error('CRITICAL SUPABASE EXCEPTION IN getPreCadastros:', err);
   throw err;
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
      documentacaoStatus: r.documentacao_status || 'Pendente',
      ultimoContatoEm: r.ultimo_contato_em,
      responsavelContato: r.responsavel_contato,
      proximoPasso: r.proximo_passo,
      observacaoContato: r.observacao_contato,
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

  async getPreCadastroById(id: number | string) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('pre_cadastros').select('*').eq('id', id).single();
        if (!error && data) {
          return {
            id: data.id,
            nome: data.nome_aluno,
            nomeAluno: data.nome_aluno,
            cidadeAluno: data.cidade_aluno,
            whatsAluno: data.whats_aluno
          };
        }
      } catch (err) {
        // Fallback to SQLite
      }
    }

    try {
      const row = db.prepare('SELECT * FROM pre_cadastros WHERE id = ?').get(id) as any;
      if (row) {
        return {
          id: row.id,
          nome: row.nome_aluno,
          nomeAluno: row.nome_aluno,
          cidadeAluno: row.cidade_aluno,
          whatsAluno: row.whats_aluno
        };
      }
    } catch (e) {
      return null;
    }
    return null;
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
          console.error('Supabase createCadastroCompleto error:', error);
          throw new Error('Database Error: ' + error.message);
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
        console.error('Supabase createCadastroCompleto failed:', err);
        throw err;
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

  async addHistorico(alunoId: number, tipoEvento: string, descricao: string, usuario: string) {
    const dataEvento = new Date().toISOString();
    let supabaseId = null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('historico_aluno').insert({
          aluno_id: alunoId,
          tipo_evento: tipoEvento,
          descricao,
          data_evento: dataEvento,
          usuario
        }).select('id').single();
        if (data) supabaseId = data.id;
      } catch (e) {
        console.warn('Supabase historico err', e);
      }
    }

    const insert = db.prepare('INSERT INTO historico_aluno (aluno_id, tipo_evento, descricao, data_evento, usuario) VALUES (?, ?, ?, ?, ?)');
    insert.run(alunoId, tipoEvento, descricao, dataEvento, usuario);
  },

  async getHistorico(alunoId: number) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.from('historico_aluno').select('*').eq('aluno_id', alunoId).order('id', { ascending: false });
        if (data) {
          return data.map((r: any) => ({
            id: r.id, alunoId: r.aluno_id, tipoEvento: r.tipo_evento, descricao: r.descricao, dataEvento: r.data_evento, usuario: r.usuario
          }));
        }
      } catch (e) {}
    }

    const stmt = db.prepare('SELECT * FROM historico_aluno WHERE aluno_id = ? ORDER BY id DESC');
    return stmt.all(alunoId).map((r: any) => ({
      id: r.id, alunoId: r.aluno_id, tipoEvento: r.tipo_evento, descricao: r.descricao, dataEvento: r.data_evento, usuario: r.usuario
    }));
  },

  async updateDocumentacaoStatus(id: number | string, status: string) {
    if (isSupabaseConfigured()) {
      try {
        await getSupabase().from('pre_cadastros').update({ documentacao_status: status }).eq('id', id);
      } catch (e) {}
    }
    db.prepare('UPDATE pre_cadastros SET documentacao_status = ? WHERE id = ?').run(status, id);
  },

  async updatePreCadastroDados(id: number | string, data: any) {
    if (isSupabaseConfigured()) {
      try {
        await getSupabase().from('pre_cadastros').update({
          nome_aluno: data.nomeAluno,
          nascimento_aluno: data.nascimentoAluno,
          cidade_aluno: data.cidadeAluno,
          whats_aluno: data.whatsAluno,
          nome_responsavel: data.nomeResponsavel,
          parentesco: data.parentesco,
          whats_responsavel: data.whatsResponsavel
        }).eq('id', id);
        
        await getSupabase().from('cadastros_completos').update({
          nome: data.nomeAluno,
          nascimento: data.nascimentoAluno,
          cidade: data.cidadeAluno,
          whats: data.whatsAluno,
          responsavel: data.nomeResponsavel,
          parentesco: data.parentesco,
          whats_responsavel: data.whatsResponsavel
        }).eq('ref', id);
      } catch (e) {}
    }
    db.prepare(`UPDATE pre_cadastros SET 
      nome_aluno = ?, nascimento_aluno = ?, cidade_aluno = ?, whats_aluno = ?, 
      nome_responsavel = ?, parentesco = ?, whats_responsavel = ? 
      WHERE id = ?`)
      .run(data.nomeAluno, data.nascimentoAluno, data.cidadeAluno, data.whatsAluno, data.nomeResponsavel, data.parentesco, data.whatsResponsavel, id);
      
    try {
      db.prepare(`UPDATE cadastros_completos SET 
        nome = ?, nascimento = ?, cidade = ?, whats = ?, 
        responsavel = ?, parentesco = ?, whats_responsavel = ? 
        WHERE ref = ?`)
        .run(data.nomeAluno, data.nascimentoAluno, data.cidadeAluno, data.whatsAluno, data.nomeResponsavel, data.parentesco, data.whatsResponsavel, id);
    } catch(e) {}
  },

  async updateContato(id: number | string, data: { responsavelContato: string, proximoPasso: string, observacaoContato: string }) {
    const d = new Date().toISOString();
    if (isSupabaseConfigured()) {
      try {
        await getSupabase().from('pre_cadastros').update({
          ultimo_contato_em: d,
          responsavel_contato: data.responsavelContato,
          proximo_passo: data.proximoPasso,
          observacao_contato: data.observacaoContato
        }).eq('id', id);
      } catch (e) {}
    }
    db.prepare('UPDATE pre_cadastros SET ultimo_contato_em = ?, responsavel_contato = ?, proximo_passo = ?, observacao_contato = ? WHERE id = ?')
      .run(d, data.responsavelContato, data.proximoPasso, data.observacaoContato, id);
  },

  // MÓDULO 6: AVALIAÇÕES E EVOLUÇÃO DO ALUNO
  async getAvaliacoesAluno(alunoId: number) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('avaliacoes_aluno')
          .select('*')
          .eq('aluno_id', alunoId)
          .order('data_avaliacao', { ascending: true })
          .order('id', { ascending: true });
        if (!error && data && data.length > 0) {
          return data.map((r: any) => ({
            id: r.id,
            alunoId: r.aluno_id,
            dataAvaliacao: r.data_avaliacao,
            instrutorId: r.instrutor_id,
            instrutorNome: r.instrutor_nome,
            observacoesGerais: r.observacoes_gerais || '',
            competencias: {
              disciplina: Number(r.nota_disciplina) || 3,
              disciplinaComentario: r.comentario_disciplina || '',
              responsabilidade: Number(r.nota_responsabilidade) || 3,
              responsabilidadeComentario: r.comentario_responsabilidade || '',
              trabalhoEquipe: Number(r.nota_trabalho_equipe) || 3,
              trabalhoEquipeComentario: r.comentario_trabalho_equipe || '',
              lideranca: Number(r.nota_lideranca) || 3,
              liderancaComentario: r.comentario_lideranca || '',
              comunicacao: Number(r.nota_comunicacao) || 3,
              comunicacaoComentario: r.comentario_comunicacao || '',
              participacao: Number(r.nota_participacao) || 3,
              participacaoComentario: r.comentario_participacao || '',
              superacaoDesafios: Number(r.nota_superacao) || 3,
              superacaoDesafiosComentario: r.comentario_superacao || '',
            },
            mediaGeral: Number(Number(r.media_geral).toFixed(2)) || 3.0,
            metas: typeof r.metas === 'string' ? JSON.parse(r.metas || '[]') : (r.metas || []),
            missoes: typeof r.missoes === 'string' ? JSON.parse(r.missoes || '[]') : (r.missoes || []),
            criadoEm: r.criado_em,
            atualizadoEm: r.atualizado_em
          }));
        }
      } catch (e) {
        // Fallback to SQLite
      }
    }

    try {
      const stmt = db.prepare('SELECT * FROM avaliacoes_aluno WHERE aluno_id = ? ORDER BY data_avaliacao ASC, id ASC');
      const rows = stmt.all(alunoId) as any[];
      return rows.map((r: any) => ({
        id: r.id,
        alunoId: r.aluno_id,
        dataAvaliacao: r.data_avaliacao,
        instrutorId: r.instrutor_id,
        instrutorNome: r.instrutor_nome,
        observacoesGerais: r.observacoes_gerais || '',
        competencias: {
          disciplina: Number(r.nota_disciplina) || 3,
          disciplinaComentario: r.comentario_disciplina || '',
          responsabilidade: Number(r.nota_responsabilidade) || 3,
          responsabilidadeComentario: r.comentario_responsabilidade || '',
          trabalhoEquipe: Number(r.nota_trabalho_equipe) || 3,
          trabalhoEquipeComentario: r.comentario_trabalho_equipe || '',
          lideranca: Number(r.nota_lideranca) || 3,
          liderancaComentario: r.comentario_lideranca || '',
          comunicacao: Number(r.nota_comunicacao) || 3,
          comunicacaoComentario: r.comentario_comunicacao || '',
          participacao: Number(r.nota_participacao) || 3,
          participacaoComentario: r.comentario_participacao || '',
          superacaoDesafios: Number(r.nota_superacao) || 3,
          superacaoDesafiosComentario: r.comentario_superacao || '',
        },
        mediaGeral: Number(Number(r.media_geral).toFixed(2)) || 3.0,
        metas: typeof r.metas === 'string' ? JSON.parse(r.metas || '[]') : (r.metas || []),
        missoes: typeof r.missoes === 'string' ? JSON.parse(r.missoes || '[]') : (r.missoes || []),
        criadoEm: r.criado_em,
        atualizadoEm: r.atualizado_em
      }));
    } catch (e) {
      return [];
    }
  },

  async getAvaliacaoById(id: number) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('avaliacoes_aluno').select('*').eq('id', id).single();
        if (!error && data) {
          return {
            id: data.id,
            alunoId: data.aluno_id,
            dataAvaliacao: data.data_avaliacao,
            instrutorId: data.instrutor_id,
            instrutorNome: data.instrutor_nome,
            observacoesGerais: data.observacoes_gerais || '',
            competencias: {
              disciplina: Number(data.nota_disciplina) || 3,
              disciplinaComentario: data.comentario_disciplina || '',
              responsabilidade: Number(data.nota_responsabilidade) || 3,
              responsabilidadeComentario: data.comentario_responsabilidade || '',
              trabalhoEquipe: Number(data.nota_trabalho_equipe) || 3,
              trabalhoEquipeComentario: data.comentario_trabalho_equipe || '',
              lideranca: Number(data.nota_lideranca) || 3,
              liderancaComentario: data.comentario_lideranca || '',
              comunicacao: Number(data.nota_comunicacao) || 3,
              comunicacaoComentario: data.comentario_comunicacao || '',
              participacao: Number(data.nota_participacao) || 3,
              participacaoComentario: data.comentario_participacao || '',
              superacaoDesafios: Number(data.nota_superacao) || 3,
              superacaoDesafiosComentario: data.comentario_superacao || '',
            },
            mediaGeral: Number(Number(data.media_geral).toFixed(2)) || 3.0,
            metas: typeof data.metas === 'string' ? JSON.parse(data.metas || '[]') : (data.metas || []),
            missoes: typeof data.missoes === 'string' ? JSON.parse(data.missoes || '[]') : (data.missoes || []),
            criadoEm: data.criado_em,
            atualizadoEm: data.atualizado_em
          };
        }
      } catch (e) {}
    }

    try {
      const stmt = db.prepare('SELECT * FROM avaliacoes_aluno WHERE id = ?');
      const r = stmt.get(id) as any;
      if (!r) return null;
      return {
        id: r.id,
        alunoId: r.aluno_id,
        dataAvaliacao: r.data_avaliacao,
        instrutorId: r.instrutor_id,
        instrutorNome: r.instrutor_nome,
        observacoesGerais: r.observacoes_gerais || '',
        competencias: {
          disciplina: Number(r.nota_disciplina) || 3,
          disciplinaComentario: r.comentario_disciplina || '',
          responsabilidade: Number(r.nota_responsabilidade) || 3,
          responsabilidadeComentario: r.comentario_responsabilidade || '',
          trabalhoEquipe: Number(r.nota_trabalho_equipe) || 3,
          trabalhoEquipeComentario: r.comentario_trabalho_equipe || '',
          lideranca: Number(r.nota_lideranca) || 3,
          liderancaComentario: r.comentario_lideranca || '',
          comunicacao: Number(r.nota_comunicacao) || 3,
          comunicacaoComentario: r.comentario_comunicacao || '',
          participacao: Number(r.nota_participacao) || 3,
          participacaoComentario: r.comentario_participacao || '',
          superacaoDesafios: Number(r.nota_superacao) || 3,
          superacaoDesafiosComentario: r.comentario_superacao || '',
        },
        mediaGeral: Number(Number(r.media_geral).toFixed(2)) || 3.0,
        metas: typeof r.metas === 'string' ? JSON.parse(r.metas || '[]') : (r.metas || []),
        missoes: typeof r.missoes === 'string' ? JSON.parse(r.missoes || '[]') : (r.missoes || []),
        criadoEm: r.criado_em,
        atualizadoEm: r.atualizado_em
      };
    } catch (e) {
      return null;
    }
  },

  async createAvaliacaoAluno(data: any) {
    const comps = data.competencias || {};
    const d = comps.disciplina || 3;
    const r = comps.responsabilidade || 3;
    const t = comps.trabalhoEquipe || 3;
    const l = comps.lideranca || 3;
    const c = comps.comunicacao || 3;
    const p = comps.participacao || 3;
    const s = comps.superacaoDesafios || 3;

    const mediaGeral = Math.round(((d + r + t + l + c + p + s) / 7) * 100) / 100;
    const now = new Date().toISOString();
    const dataAvaliacao = data.dataAvaliacao || now.split('T')[0];
    const metasStr = JSON.stringify(data.metas || []);
    const missoesStr = JSON.stringify(data.missoes || []);

    let insertedId = 0;

    // 1. Try SQLite
    try {
      const stmt = db.prepare(`
        INSERT INTO avaliacoes_aluno (
          aluno_id, data_avaliacao, instrutor_id, instrutor_nome, observacoes_gerais,
          nota_disciplina, comentario_disciplina,
          nota_responsabilidade, comentario_responsabilidade,
          nota_trabalho_equipe, comentario_trabalho_equipe,
          nota_lideranca, comentario_lideranca,
          nota_comunicacao, comentario_comunicacao,
          nota_participacao, comentario_participacao,
          nota_superacao, comentario_superacao,
          media_geral, metas, missoes, criado_em, atualizado_em
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?
        )
      `);
      const info = stmt.run(
        data.alunoId, dataAvaliacao, data.instrutorId || '', data.instrutorNome, data.observacoesGerais || '',
        d, comps.disciplinaComentario || '',
        r, comps.responsabilidadeComentario || '',
        t, comps.trabalhoEquipeComentario || '',
        l, comps.liderancaComentario || '',
        c, comps.comunicacaoComentario || '',
        p, comps.participacaoComentario || '',
        s, comps.superacaoDesafiosComentario || '',
        mediaGeral, metasStr, missoesStr, now, now
      );
      insertedId = Number(info.lastInsertRowid);
    } catch (e) {
      console.error('Error inserting into SQLite avaliacoes_aluno:', e);
    }

    // 2. Try Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: supaData, error } = await supabase.from('avaliacoes_aluno').insert({
          aluno_id: data.alunoId,
          data_avaliacao: dataAvaliacao,
          instrutor_id: data.instrutorId || null,
          instrutor_nome: data.instrutorNome,
          observacoes_gerais: data.observacoesGerais || null,
          nota_disciplina: d,
          comentario_disciplina: comps.disciplinaComentario || null,
          nota_responsabilidade: r,
          comentario_responsabilidade: comps.responsabilidadeComentario || null,
          nota_trabalho_equipe: t,
          comentario_trabalho_equipe: comps.trabalhoEquipeComentario || null,
          nota_lideranca: l,
          comentario_lideranca: comps.liderancaComentario || null,
          nota_comunicacao: c,
          comentario_comunicacao: comps.comunicacaoComentario || null,
          nota_participacao: p,
          comentario_participacao: comps.participacaoComentario || null,
          nota_superacao: s,
          comentario_superacao: comps.superacaoDesafiosComentario || null,
          media_geral: mediaGeral,
          metas: data.metas || [],
          missoes: data.missoes || [],
          criado_em: now,
          atualizado_em: now
        }).select('id').single();

        if (supaData && supaData.id) {
          if (!insertedId) insertedId = supaData.id;
        }
      } catch (e) {
        console.warn('Supabase avaliacoes insert warning (table might not exist in Supabase yet):', e);
      }
    }

    return {
      id: insertedId,
      alunoId: data.alunoId,
      dataAvaliacao,
      instrutorId: data.instrutorId,
      instrutorNome: data.instrutorNome,
      observacoesGerais: data.observacoesGerais || '',
      competencias: comps,
      mediaGeral,
      metas: data.metas || [],
      missoes: data.missoes || [],
      criadoEm: now,
      atualizadoEm: now
    };
  },

  async updateAvaliacaoAluno(id: number, data: any) {
    const comps = data.competencias || {};
    const d = comps.disciplina || 3;
    const r = comps.responsabilidade || 3;
    const t = comps.trabalhoEquipe || 3;
    const l = comps.lideranca || 3;
    const c = comps.comunicacao || 3;
    const p = comps.participacao || 3;
    const s = comps.superacaoDesafios || 3;

    const mediaGeral = Math.round(((d + r + t + l + c + p + s) / 7) * 100) / 100;
    const now = new Date().toISOString();
    const dataAvaliacao = data.dataAvaliacao || now.split('T')[0];
    const metasStr = JSON.stringify(data.metas || []);
    const missoesStr = JSON.stringify(data.missoes || []);

    try {
      const stmt = db.prepare(`
        UPDATE avaliacoes_aluno SET
          data_avaliacao = ?, instrutor_nome = ?, observacoes_gerais = ?,
          nota_disciplina = ?, comentario_disciplina = ?,
          nota_responsabilidade = ?, comentario_responsabilidade = ?,
          nota_trabalho_equipe = ?, comentario_trabalho_equipe = ?,
          nota_lideranca = ?, comentario_lideranca = ?,
          nota_comunicacao = ?, comentario_comunicacao = ?,
          nota_participacao = ?, comentario_participacao = ?,
          nota_superacao = ?, comentario_superacao = ?,
          media_geral = ?, metas = ?, missoes = ?, atualizado_em = ?
        WHERE id = ?
      `);
      stmt.run(
        dataAvaliacao, data.instrutorNome, data.observacoesGerais || '',
        d, comps.disciplinaComentario || '',
        r, comps.responsabilidadeComentario || '',
        t, comps.trabalhoEquipeComentario || '',
        l, comps.liderancaComentario || '',
        c, comps.comunicacaoComentario || '',
        p, comps.participacaoComentario || '',
        s, comps.superacaoDesafiosComentario || '',
        mediaGeral, metasStr, missoesStr, now, id
      );
    } catch (e) {
      console.error('Error updating SQLite avaliacoes_aluno:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('avaliacoes_aluno').update({
          data_avaliacao: dataAvaliacao,
          instrutor_nome: data.instrutorNome,
          observacoes_gerais: data.observacoesGerais || null,
          nota_disciplina: d,
          comentario_disciplina: comps.disciplinaComentario || null,
          nota_responsabilidade: r,
          comentario_responsabilidade: comps.responsabilidadeComentario || null,
          nota_trabalho_equipe: t,
          comentario_trabalho_equipe: comps.trabalhoEquipeComentario || null,
          nota_lideranca: l,
          comentario_lideranca: comps.liderancaComentario || null,
          nota_comunicacao: c,
          comentario_comunicacao: comps.comunicacaoComentario || null,
          nota_participacao: p,
          comentario_participacao: comps.participacaoComentario || null,
          nota_superacao: s,
          comentario_superacao: comps.superacaoDesafiosComentario || null,
          media_geral: mediaGeral,
          metas: data.metas || [],
          missoes: data.missoes || [],
          atualizado_em: now
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase avaliacoes update warning:', e);
      }
    }

    return {
      id,
      alunoId: data.alunoId,
      dataAvaliacao,
      instrutorId: data.instrutorId,
      instrutorNome: data.instrutorNome,
      observacoesGerais: data.observacoesGerais || '',
      competencias: comps,
      mediaGeral,
      metas: data.metas || [],
      missoes: data.missoes || [],
      atualizadoEm: now
    };
  },

  async deleteAvaliacaoAluno(id: number) {
    try {
      db.prepare('DELETE FROM avaliacoes_aluno WHERE id = ?').run(id);
    } catch (e) {
      console.error('Error deleting from SQLite avaliacoes_aluno:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('avaliacoes_aluno').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase avaliacoes delete warning:', e);
      }
    }

    return { success: true };
  },

  // ==========================================
  // MÓDULO 7: CONTROLE DE FREQUÊNCIA
  // ==========================================

  async getFrequenciasAluno(alunoId: number) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('frequencia_aluno')
          .select('*')
          .eq('aluno_id', alunoId)
          .order('data', { ascending: false })
          .order('id', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((r: any) => ({
            id: r.id,
            alunoId: r.aluno_id,
            data: r.data,
            atividade: r.atividade,
            instrutorId: r.instrutor_id,
            instrutorNome: r.instrutor_nome,
            status: r.status,
            observacao: r.observacao || '',
            criadoEm: r.criado_em,
            atualizadoEm: r.atualizado_em
          }));
        }
      } catch (e) {
        // Fallback to SQLite
      }
    }

    try {
      const stmt = db.prepare('SELECT * FROM frequencia_aluno WHERE aluno_id = ? ORDER BY data DESC, id DESC');
      const rows = stmt.all(alunoId) as any[];
      return rows.map((r: any) => ({
        id: r.id,
        alunoId: r.aluno_id,
        data: r.data,
        atividade: r.atividade,
        instrutorId: r.instrutor_id,
        instrutorNome: r.instrutor_nome,
        status: r.status,
        observacao: r.observacao || '',
        criadoEm: r.criado_em,
        atualizadoEm: r.atualizado_em
      }));
    } catch (e) {
      return [];
    }
  },

  async getFrequenciaById(id: number) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('frequencia_aluno').select('*').eq('id', id).single();
        if (!error && data) {
          return {
            id: data.id,
            alunoId: data.aluno_id,
            data: data.data,
            atividade: data.atividade,
            instrutorId: data.instrutor_id,
            instrutorNome: data.instrutor_nome,
            status: data.status,
            observacao: data.observacao || '',
            criadoEm: data.criado_em,
            atualizadoEm: data.atualizado_em
          };
        }
      } catch (e) {
        // Fallback to SQLite
      }
    }

    try {
      const r = db.prepare('SELECT * FROM frequencia_aluno WHERE id = ?').get(id) as any;
      if (!r) return null;
      return {
        id: r.id,
        alunoId: r.aluno_id,
        data: r.data,
        atividade: r.atividade,
        instrutorId: r.instrutor_id,
        instrutorNome: r.instrutor_nome,
        status: r.status,
        observacao: r.observacao || '',
        criadoEm: r.criado_em,
        atualizadoEm: r.atualizado_em
      };
    } catch (e) {
      return null;
    }
  },

  async getResumoFrequencia(alunoId: number) {
    const list = await this.getFrequenciasAluno(alunoId);
    const totalTreinamentos = list.length;
    let presentes = 0;
    let faltas = 0;
    let justificadas = 0;

    for (const item of list) {
      if (item.status === 'Presente') presentes++;
      else if (item.status === 'Ausente') faltas++;
      else if (item.status === 'Justificada') justificadas++;
    }

    const percentualPresenca = totalTreinamentos > 0
      ? Math.round((presentes / totalTreinamentos) * 100)
      : 100;

    const ultimosRegistros = list.slice(0, 5).map(item => ({
      id: item.id,
      data: item.data,
      atividade: item.atividade,
      status: item.status
    }));

    return {
      totalTreinamentos,
      presentes,
      faltas,
      justificadas,
      percentualPresenca,
      ultimosRegistros
    };
  },

  async createFrequenciaAluno(data: any) {
    const now = new Date().toISOString();
    const dataRegistro = data.data || now.split('T')[0];
    let insertedId = 0;

    // 1. SQLite
    try {
      const stmt = db.prepare(`
        INSERT INTO frequencia_aluno (
          aluno_id, data, atividade, instrutor_id, instrutor_nome, status, observacao, criado_em, atualizado_em
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);
      const info = stmt.run(
        data.alunoId,
        dataRegistro,
        data.atividade || 'Treinamento Geral',
        data.instrutorId || '',
        data.instrutorNome || 'Instrutor',
        data.status || 'Presente',
        data.observacao || '',
        now,
        now
      );
      insertedId = Number(info.lastInsertRowid);
    } catch (e) {
      console.error('Error inserting SQLite frequencia_aluno:', e);
    }

    // 2. Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: supaData, error } = await supabase.from('frequencia_aluno').insert({
          aluno_id: data.alunoId,
          data: dataRegistro,
          atividade: data.atividade || 'Treinamento Geral',
          instrutor_id: data.instrutorId || null,
          instrutor_nome: data.instrutorNome || 'Instrutor',
          status: data.status || 'Presente',
          observacao: data.observacao || null,
          criado_em: now,
          atualizado_em: now
        }).select('id').single();

        if (!error && supaData?.id) {
          insertedId = supaData.id;
        }
      } catch (e) {
        console.warn('Supabase frequencia insert warning:', e);
      }
    }

    return {
      id: insertedId,
      alunoId: data.alunoId,
      data: dataRegistro,
      atividade: data.atividade || 'Treinamento Geral',
      instrutorId: data.instrutorId || '',
      instrutorNome: data.instrutorNome || 'Instrutor',
      status: data.status || 'Presente',
      observacao: data.observacao || '',
      criadoEm: now,
      atualizadoEm: now
    };
  },

  async updateFrequenciaAluno(id: number, data: any) {
    const now = new Date().toISOString();
    const existing = await this.getFrequenciaById(id);
    if (!existing) return null;

    const dataRegistro = data.data || existing.data;
    const atividade = data.atividade !== undefined ? data.atividade : existing.atividade;
    const instrutorNome = data.instrutorNome !== undefined ? data.instrutorNome : existing.instrutorNome;
    const status = data.status !== undefined ? data.status : existing.status;
    const observacao = data.observacao !== undefined ? data.observacao : existing.observacao;

    // SQLite
    try {
      db.prepare(`
        UPDATE frequencia_aluno SET
          data = ?,
          atividade = ?,
          instrutor_nome = ?,
          status = ?,
          observacao = ?,
          atualizado_em = ?
        WHERE id = ?
      `).run(dataRegistro, atividade, instrutorNome, status, observacao || '', now, id);
    } catch (e) {
      console.error('Error updating SQLite frequencia_aluno:', e);
    }

    // Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('frequencia_aluno').update({
          data: dataRegistro,
          atividade,
          instrutor_nome: instrutorNome,
          status,
          observacao: observacao || null,
          atualizado_em: now
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase frequencia update warning:', e);
      }
    }

    return {
      ...existing,
      data: dataRegistro,
      atividade,
      instrutorNome,
      status,
      observacao,
      atualizadoEm: now
    };
  },

  async deleteFrequenciaAluno(id: number) {
    try {
      db.prepare('DELETE FROM frequencia_aluno WHERE id = ?').run(id);
    } catch (e) {
      console.error('Error deleting SQLite frequencia_aluno:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('frequencia_aluno').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase frequencia delete warning:', e);
      }
    }

    return { success: true };
  },

  // ==========================================
  // MÓDULO 8: COMUNICAÇÃO
  // ==========================================

  async getComunicados(filtros?: { tipo?: string; alunoId?: number; status?: string; search?: string }) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        let query = supabase
          .from('comunicados')
          .select('*')
          .order('data', { ascending: false })
          .order('id', { ascending: false });

        if (filtros?.tipo && filtros.tipo !== 'todos') {
          query = query.eq('tipo', filtros.tipo);
        }
        if (filtros?.status && filtros.status !== 'todos') {
          query = query.eq('status', filtros.status);
        }
        if (filtros?.alunoId) {
          query = query.eq('aluno_id', filtros.alunoId);
        }

        const { data, error } = await query;
        if (!error && data && data.length > 0) {
          let list = data.map((r: any) => ({
            id: r.id,
            titulo: r.titulo,
            mensagem: r.mensagem,
            data: r.data,
            tipo: r.tipo,
            alunoId: r.aluno_id ? Number(r.aluno_id) : null,
            alunoNome: r.aluno_nome || null,
            criadoPor: r.criado_por,
            criadorId: r.criador_id || null,
            status: r.status || 'Publicado',
            observacaoInterna: r.observacao_interna || '',
            criadoEm: r.criado_em,
            atualizadoEm: r.atualizado_em
          }));

          if (filtros?.search && filtros.search.trim()) {
            const term = filtros.search.trim().toLowerCase();
            list = list.filter((item: any) =>
              item.titulo.toLowerCase().includes(term) ||
              item.mensagem.toLowerCase().includes(term) ||
              item.criadoPor.toLowerCase().includes(term) ||
              (item.alunoNome && item.alunoNome.toLowerCase().includes(term))
            );
          }
          return list;
        }
      } catch (e) {
        // Fallback to SQLite
      }
    }

    try {
      let sql = 'SELECT * FROM comunicados WHERE 1=1';
      const params: any[] = [];

      if (filtros?.tipo && filtros.tipo !== 'todos') {
        sql += ' AND tipo = ?';
        params.push(filtros.tipo);
      }
      if (filtros?.status && filtros.status !== 'todos') {
        sql += ' AND status = ?';
        params.push(filtros.status);
      }
      if (filtros?.alunoId) {
        sql += ' AND aluno_id = ?';
        params.push(filtros.alunoId);
      }

      sql += ' ORDER BY data DESC, id DESC';
      const rows = db.prepare(sql).all(...params) as any[];

      let list = rows.map((r: any) => ({
        id: r.id,
        titulo: r.titulo,
        mensagem: r.mensagem,
        data: r.data,
        tipo: r.tipo,
        alunoId: r.aluno_id ? Number(r.aluno_id) : null,
        alunoNome: r.aluno_nome || null,
        criadoPor: r.criado_por,
        criadorId: r.criador_id || null,
        status: r.status || 'Publicado',
        observacaoInterna: r.observacao_interna || '',
        criadoEm: r.criado_em,
        atualizadoEm: r.atualizado_em
      }));

      if (filtros?.search && filtros.search.trim()) {
        const term = filtros.search.trim().toLowerCase();
        list = list.filter((item: any) =>
          item.titulo.toLowerCase().includes(term) ||
          item.mensagem.toLowerCase().includes(term) ||
          item.criadoPor.toLowerCase().includes(term) ||
          (item.alunoNome && item.alunoNome.toLowerCase().includes(term))
        );
      }
      return list;
    } catch (e) {
      return [];
    }
  },

  async getComunicadoById(id: number) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('comunicados')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return {
            id: data.id,
            titulo: data.titulo,
            mensagem: data.mensagem,
            data: data.data,
            tipo: data.tipo,
            alunoId: data.aluno_id ? Number(data.aluno_id) : null,
            alunoNome: data.aluno_nome || null,
            criadoPor: data.criado_por,
            criadorId: data.criador_id || null,
            status: data.status || 'Publicado',
            observacaoInterna: data.observacao_interna || '',
            criadoEm: data.criado_em,
            atualizadoEm: data.atualizado_em
          };
        }
      } catch (e) {
        // Fallback to SQLite
      }
    }

    try {
      const row = db.prepare('SELECT * FROM comunicados WHERE id = ?').get(id) as any;
      if (!row) return null;
      return {
        id: row.id,
        titulo: row.titulo,
        mensagem: row.mensagem,
        data: row.data,
        tipo: row.tipo,
        alunoId: row.aluno_id ? Number(row.aluno_id) : null,
        alunoNome: row.aluno_nome || null,
        criadoPor: row.criado_por,
        criadorId: row.criador_id || null,
        status: row.status || 'Publicado',
        observacaoInterna: row.observacao_interna || '',
        criadoEm: row.criado_em,
        atualizadoEm: row.atualizado_em
      };
    } catch (e) {
      return null;
    }
  },

  async getComunicadosByAluno(alunoId: number) {
    // Retorna comunicados individuais deste aluno E comunicados gerais (Geral, Alunos, Responsáveis)
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('comunicados')
          .select('*')
          .or(`aluno_id.eq.${alunoId},tipo.in.("Geral","Alunos","Responsáveis")`)
          .order('data', { ascending: false })
          .order('id', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((r: any) => ({
            id: r.id,
            titulo: r.titulo,
            mensagem: r.mensagem,
            data: r.data,
            tipo: r.tipo,
            alunoId: r.aluno_id ? Number(r.aluno_id) : null,
            alunoNome: r.aluno_nome || null,
            criadoPor: r.criado_por,
            criadorId: r.criador_id || null,
            status: r.status || 'Publicado',
            observacaoInterna: r.observacao_interna || '',
            criadoEm: r.criado_em,
            atualizadoEm: r.atualizado_em
          }));
        }
      } catch (e) {
        // Fallback to SQLite
      }
    }

    try {
      const rows = db.prepare(`
        SELECT * FROM comunicados 
        WHERE aluno_id = ? OR tipo IN ('Geral', 'Alunos', 'Responsáveis')
        ORDER BY data DESC, id DESC
      `).all(alunoId) as any[];

      return rows.map((r: any) => ({
        id: r.id,
        titulo: r.titulo,
        mensagem: r.mensagem,
        data: r.data,
        tipo: r.tipo,
        alunoId: r.aluno_id ? Number(r.aluno_id) : null,
        alunoNome: r.aluno_nome || null,
        criadoPor: r.criado_por,
        criadorId: r.criador_id || null,
        status: r.status || 'Publicado',
        observacaoInterna: r.observacao_interna || '',
        criadoEm: r.criado_em,
        atualizadoEm: r.atualizado_em
      }));
    } catch (e) {
      return [];
    }
  },

  async createComunicado(data: {
    titulo: string;
    mensagem: string;
    data?: string;
    tipo: string;
    alunoId?: number | null;
    alunoNome?: string | null;
    criadoPor: string;
    criadorId?: string | null;
    status?: string;
    observacaoInterna?: string;
  }) {
    const now = new Date().toISOString();
    const dataComunicado = data.data || now.split('T')[0];
    const tipo = data.tipo || 'Geral';
    const status = data.status || 'Publicado';
    const alunoId = tipo === 'Individual' && data.alunoId ? Number(data.alunoId) : null;
    const alunoNome = tipo === 'Individual' && data.alunoNome ? data.alunoNome : null;
    let insertedId = 0;

    // 1. SQLite
    try {
      const stmt = db.prepare(`
        INSERT INTO comunicados (
          titulo, mensagem, data, tipo, aluno_id, aluno_nome, criado_por, criador_id, status, observacao_interna, criado_em, atualizado_em
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);
      const info = stmt.run(
        data.titulo,
        data.mensagem,
        dataComunicado,
        tipo,
        alunoId,
        alunoNome,
        data.criadoPor,
        data.criadorId || null,
        status,
        data.observacaoInterna || '',
        now,
        now
      );
      insertedId = Number(info.lastInsertRowid);
    } catch (e) {
      console.error('Error inserting SQLite comunicado:', e);
    }

    // 2. Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: supaData, error } = await supabase.from('comunicados').insert({
          titulo: data.titulo,
          mensagem: data.mensagem,
          data: dataComunicado,
          tipo,
          aluno_id: alunoId,
          aluno_nome: alunoNome,
          criado_por: data.criadoPor,
          criador_id: data.criadorId || null,
          status,
          observacao_interna: data.observacaoInterna || null,
          criado_em: now,
          atualizado_em: now
        }).select('id').single();

        if (!error && supaData?.id) {
          insertedId = supaData.id;
        }
      } catch (e) {
        console.warn('Supabase comunicado insert warning:', e);
      }
    }

    return {
      id: insertedId,
      titulo: data.titulo,
      mensagem: data.mensagem,
      data: dataComunicado,
      tipo,
      alunoId,
      alunoNome,
      criadoPor: data.criadoPor,
      criadorId: data.criadorId || null,
      status,
      observacaoInterna: data.observacaoInterna || '',
      criadoEm: now,
      atualizadoEm: now
    };
  },

  async updateComunicado(id: number, data: any) {
    const now = new Date().toISOString();
    const existing = await this.getComunicadoById(id);
    if (!existing) return null;

    const titulo = data.titulo !== undefined ? data.titulo : existing.titulo;
    const mensagem = data.mensagem !== undefined ? data.mensagem : existing.mensagem;
    const dataComunicado = data.data !== undefined ? data.data : existing.data;
    const tipo = data.tipo !== undefined ? data.tipo : existing.tipo;
    const alunoId = tipo === 'Individual' ? (data.alunoId !== undefined ? (data.alunoId ? Number(data.alunoId) : null) : existing.alunoId) : null;
    const alunoNome = tipo === 'Individual' ? (data.alunoNome !== undefined ? data.alunoNome : existing.alunoNome) : null;
    const status = data.status !== undefined ? data.status : existing.status;
    const observacaoInterna = data.observacaoInterna !== undefined ? data.observacaoInterna : existing.observacaoInterna;

    // 1. SQLite
    try {
      db.prepare(`
        UPDATE comunicados SET
          titulo = ?,
          mensagem = ?,
          data = ?,
          tipo = ?,
          aluno_id = ?,
          aluno_nome = ?,
          status = ?,
          observacao_interna = ?,
          atualizado_em = ?
        WHERE id = ?
      `).run(
        titulo,
        mensagem,
        dataComunicado,
        tipo,
        alunoId,
        alunoNome,
        status,
        observacaoInterna || '',
        now,
        id
      );
    } catch (e) {
      console.error('Error updating SQLite comunicado:', e);
    }

    // 2. Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('comunicados').update({
          titulo,
          mensagem,
          data: dataComunicado,
          tipo,
          aluno_id: alunoId,
          aluno_nome: alunoNome,
          status,
          observacao_interna: observacaoInterna || null,
          atualizado_em: now
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase comunicado update warning:', e);
      }
    }

    return {
      ...existing,
      titulo,
      mensagem,
      data: dataComunicado,
      tipo,
      alunoId,
      alunoNome,
      status,
      observacaoInterna,
      atualizadoEm: now
    };
  },

  async deleteComunicado(id: number) {
    try {
      db.prepare('DELETE FROM comunicados WHERE id = ?').run(id);
    } catch (e) {
      console.error('Error deleting SQLite comunicado:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('comunicados').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase comunicado delete warning:', e);
      }
    }

    return { success: true };
  },

  // -----------------------------------------------------------
  // MÓDULO 9: FINANCEIRO
  // -----------------------------------------------------------

  async getAlunoFinanceiroConfig(alunoId: number | string) {
    const idNum = Number(alunoId);
    const defaultConfig = {
      alunoId: idNum,
      plano: 'Mensalidade Padrão',
      valor: 150.00,
      diaVencimento: 10,
      status: 'Aguardando' as const,
      gatewayPagamento: 'manual',
      idClienteGateway: null,
      idAssinaturaGateway: null,
      statusGateway: 'ativo',
      proximaCobranca: null,
      ultimaSincronizacao: null,
      atualizadoEm: new Date().toISOString()
    };

    let localRow: any = null;
    try {
      localRow = db.prepare('SELECT * FROM aluno_financeiro_config WHERE aluno_id = ?').get(idNum) as any;
    } catch (e) {
      console.warn('Error reading SQLite aluno_financeiro_config:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('aluno_financeiro_config')
          .select('*')
          .eq('aluno_id', idNum)
          .single();

        if (!error && data) {
          // Mesclar dados do Supabase com os locais (preservando gateway se já atualizado localmente)
          return {
            alunoId: Number(data.aluno_id),
            plano: localRow?.plano ?? data.plano ?? 'Mensalidade Padrão',
            valor: Number(localRow?.valor ?? data.valor ?? 150.00),
            diaVencimento: Number(localRow?.dia_vencimento ?? data.dia_vencimento ?? 10),
            status: (localRow?.status ?? data.status ?? 'Aguardando') as 'Pago' | 'Aguardando' | 'Atrasado',
            gatewayPagamento: localRow?.gateway_pagamento ?? data.gateway_pagamento ?? 'manual',
            idClienteGateway: localRow?.id_cliente_gateway ?? data.id_cliente_gateway ?? null,
            idAssinaturaGateway: localRow?.id_assinatura_gateway ?? data.id_assinatura_gateway ?? null,
            statusGateway: localRow?.status_gateway ?? data.status_gateway ?? 'ativo',
            proximaCobranca: localRow?.proxima_cobranca ?? data.proxima_cobranca ?? null,
            ultimaSincronizacao: localRow?.ultima_sincronizacao ?? data.ultima_sincronizacao ?? null,
            atualizadoEm: localRow?.atualizado_em ?? data.atualizado_em
          };
        }
      } catch (err) {
        // Fallback to localRow
      }
    }

    if (localRow) {
      return {
        alunoId: Number(localRow.aluno_id),
        plano: localRow.plano || 'Mensalidade Padrão',
        valor: Number(localRow.valor ?? 150.00),
        diaVencimento: Number(localRow.dia_vencimento ?? 10),
        status: (localRow.status || 'Aguardando') as 'Pago' | 'Aguardando' | 'Atrasado',
        gatewayPagamento: localRow.gateway_pagamento || 'manual',
        idClienteGateway: localRow.id_cliente_gateway || null,
        idAssinaturaGateway: localRow.id_assinatura_gateway || null,
        statusGateway: localRow.status_gateway || 'ativo',
        proximaCobranca: localRow.proxima_cobranca || null,
        ultimaSincronizacao: localRow.ultima_sincronizacao || null,
        atualizadoEm: localRow.atualizado_em
      };
    }

    return defaultConfig;
  },

  async saveAlunoFinanceiroConfig(data: {
    alunoId: number | string;
    plano: string;
    valor: number;
    diaVencimento: number;
    status: 'Pago' | 'Aguardando' | 'Atrasado';
    gatewayPagamento?: string;
    idClienteGateway?: string | null;
    idAssinaturaGateway?: string | null;
    statusGateway?: string;
    proximaCobranca?: string | null;
    ultimaSincronizacao?: string | null;
    userName?: string;
  }) {
    const alunoId = Number(data.alunoId);
    const plano = (data.plano || 'Mensalidade Padrão').trim();
    const valor = Number(data.valor) || 0;
    const diaVencimento = Number(data.diaVencimento) || 10;
    const status = data.status || 'Aguardando';
    const gatewayPagamento = data.gatewayPagamento || 'manual';
    const idClienteGateway = data.idClienteGateway || null;
    const idAssinaturaGateway = data.idAssinaturaGateway || null;
    const statusGateway = data.statusGateway || 'ativo';
    const proximaCobranca = data.proximaCobranca || null;
    const ultimaSincronizacao = data.ultimaSincronizacao || null;
    const now = new Date().toISOString();

    // 1. SQLite
    try {
      db.prepare(`
        INSERT INTO aluno_financeiro_config (
          aluno_id, plano, valor, dia_vencimento, status,
          gateway_pagamento, id_cliente_gateway, id_assinatura_gateway,
          status_gateway, proxima_cobranca, ultima_sincronizacao, atualizado_em
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(aluno_id) DO UPDATE SET
          plano = excluded.plano,
          valor = excluded.valor,
          dia_vencimento = excluded.dia_vencimento,
          status = excluded.status,
          gateway_pagamento = excluded.gateway_pagamento,
          id_cliente_gateway = excluded.id_cliente_gateway,
          id_assinatura_gateway = excluded.id_assinatura_gateway,
          status_gateway = excluded.status_gateway,
          proxima_cobranca = excluded.proxima_cobranca,
          ultima_sincronizacao = excluded.ultima_sincronizacao,
          atualizado_em = excluded.atualizado_em
      `).run(
        alunoId,
        plano,
        valor,
        diaVencimento,
        status,
        gatewayPagamento,
        idClienteGateway,
        idAssinaturaGateway,
        statusGateway,
        proximaCobranca,
        ultimaSincronizacao,
        now
      );
    } catch (e) {
      console.error('Error saving SQLite aluno_financeiro_config:', e);
    }

    // 2. Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { error } = await supabase.from('aluno_financeiro_config').upsert({
          aluno_id: alunoId,
          plano,
          valor,
          dia_vencimento: diaVencimento,
          status,
          gateway_pagamento: gatewayPagamento,
          id_cliente_gateway: idClienteGateway,
          id_assinatura_gateway: idAssinaturaGateway,
          status_gateway: statusGateway,
          proxima_cobranca: proximaCobranca,
          ultima_sincronizacao: ultimaSincronizacao,
          atualizado_em: now
        }, { onConflict: 'aluno_id' });

        if (error) {
          // Se as colunas de gateway ainda não foram criadas no Supabase pelo usuário, salvar campos base
          await supabase.from('aluno_financeiro_config').upsert({
            aluno_id: alunoId,
            plano,
            valor,
            dia_vencimento: diaVencimento,
            status,
            atualizado_em: now
          }, { onConflict: 'aluno_id' });
        }
      } catch (e) {
        console.warn('Supabase aluno_financeiro_config upsert warning:', e);
      }
    }

    // Histórico de auditoria
    try {
      await this.addHistorico(
        alunoId,
        'Configuração financeira atualizada',
        `Plano: ${plano}, Valor: R$ ${valor.toFixed(2)}, Vencimento: dia ${diaVencimento}, Status: ${status}, Gateway: ${gatewayPagamento}`,
        data.userName || 'Sistema'
      );
    } catch (e) {
      console.warn('Failed to add historico for aluno_financeiro_config:', e);
    }

    return {
      alunoId,
      plano,
      valor,
      diaVencimento,
      status,
      gatewayPagamento,
      idClienteGateway,
      idAssinaturaGateway,
      statusGateway,
      proximaCobranca,
      ultimaSincronizacao,
      atualizadoEm: now
    };
  },

  async createFinanceiroEvento(data: {
    alunoId?: number | null;
    tipoEvento: string;
    gateway?: string;
    valor?: number;
    status: string;
    descricao?: string;
  }) {
    const alunoId = data.alunoId !== undefined && data.alunoId !== null ? Number(data.alunoId) : null;
    const tipoEvento = (data.tipoEvento || 'evento').trim();
    const gateway = (data.gateway || 'manual').trim();
    const valor = data.valor !== undefined ? Number(data.valor) : 0.0;
    const status = (data.status || 'pendente').trim();
    const descricao = (data.descricao || '').trim();
    const now = new Date().toISOString();

    let insertedId = Date.now();

    // 1. SQLite
    try {
      const stmt = db.prepare(`
        INSERT INTO financeiro_eventos (aluno_id, tipo_evento, gateway, valor, status, descricao, criado_em)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(alunoId, tipoEvento, gateway, valor, status, descricao, now);
      if (res && res.lastInsertRowid) {
        insertedId = Number(res.lastInsertRowid);
      }
    } catch (e) {
      console.error('Error inserting SQLite financeiro_evento:', e);
    }

    // 2. Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: supaData, error } = await supabase.from('financeiro_eventos').insert({
          aluno_id: alunoId,
          tipo_evento: tipoEvento,
          gateway,
          valor,
          status,
          descricao: descricao || null,
          criado_em: now
        }).select('id').single();

        if (!error && supaData?.id) {
          insertedId = Number(supaData.id);
        }
      } catch (e) {
        console.warn('Supabase financeiro_eventos insert warning:', e);
      }
    }

    return {
      id: insertedId,
      alunoId,
      tipoEvento,
      gateway,
      valor,
      status,
      descricao,
      criadoEm: now
    };
  },

  async getFinanceiroEventos(alunoId?: number | string, gateway?: string, limit = 50) {
    const filterAluno = alunoId !== undefined && alunoId !== null && alunoId !== '' ? Number(alunoId) : null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        let query = supabase.from('financeiro_eventos').select('*').order('criado_em', { ascending: false }).limit(limit);
        if (filterAluno) {
          query = query.eq('aluno_id', filterAluno);
        }
        if (gateway) {
          query = query.eq('gateway', gateway);
        }
        const { data, error } = await query;
        if (!error && data) {
          return data.map((r: any) => ({
            id: Number(r.id),
            alunoId: r.aluno_id !== null ? Number(r.aluno_id) : null,
            tipoEvento: r.tipo_evento,
            gateway: r.gateway,
            valor: Number(r.valor || 0),
            status: r.status,
            descricao: r.descricao || '',
            criadoEm: r.criado_em
          }));
        }
      } catch (err) {
        console.warn('Supabase financeiro_eventos query error:', err);
      }
    }

    try {
      let sql = 'SELECT * FROM financeiro_eventos';
      const params: any[] = [];
      const conditions: string[] = [];

      if (filterAluno) {
        conditions.push('aluno_id = ?');
        params.push(filterAluno);
      }
      if (gateway) {
        conditions.push('gateway = ?');
        params.push(gateway);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY id DESC LIMIT ?';
      params.push(limit);

      const rows = db.prepare(sql).all(...params) as any[];
      return rows.map((r) => ({
        id: Number(r.id),
        alunoId: r.aluno_id !== null ? Number(r.aluno_id) : null,
        tipoEvento: r.tipo_evento,
        gateway: r.gateway,
        valor: Number(r.valor || 0),
        status: r.status,
        descricao: r.descricao || '',
        criadoEm: r.criado_em
      }));
    } catch (e) {
      console.error('Error fetching SQLite financeiro_eventos:', e);
      return [];
    }
  },

  async getPagamentos(alunoId?: number | string, statusFilter?: string) {
    const filterAluno = alunoId ? Number(alunoId) : null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        let query = supabase.from('pagamentos').select('*').order('data_pagamento', { ascending: false }).order('id', { ascending: false });
        if (filterAluno) {
          query = query.eq('aluno_id', filterAluno);
        }
        if (statusFilter && statusFilter !== 'Todos') {
          query = query.eq('status', statusFilter);
        }
        const { data, error } = await query;
        if (!error && data) {
          return data.map((r: any) => ({
            id: Number(r.id),
            alunoId: Number(r.aluno_id),
            alunoNome: r.aluno_nome,
            valor: Number(r.valor),
            dataPagamento: r.data_pagamento,
            mesReferencia: r.mes_referencia,
            formaPagamento: r.forma_pagamento,
            status: r.status as 'Pago' | 'Aguardando' | 'Atrasado',
            observacao: r.observacao || '',
            responsavelRegistro: r.responsavel_registro,
            responsavelId: r.responsavel_id || null,
            criadoEm: r.criado_em,
            atualizadoEm: r.atualizado_em
          }));
        }
      } catch (err) {
        console.warn('Supabase pagamentos query error:', err);
      }
    }

    // SQLite Fallback
    try {
      let sql = 'SELECT * FROM pagamentos';
      const params: any[] = [];
      const conditions: string[] = [];

      if (filterAluno) {
        conditions.push('aluno_id = ?');
        params.push(filterAluno);
      }
      if (statusFilter && statusFilter !== 'Todos') {
        conditions.push('status = ?');
        params.push(statusFilter);
      }

      if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
      }
      sql += ' ORDER BY data_pagamento DESC, id DESC';

      const rows = db.prepare(sql).all(...params) as any[];
      return rows.map((r) => ({
        id: Number(r.id),
        alunoId: Number(r.aluno_id),
        alunoNome: r.aluno_nome,
        valor: Number(r.valor),
        dataPagamento: r.data_pagamento,
        mesReferencia: r.mes_referencia,
        formaPagamento: r.forma_pagamento,
        status: r.status as 'Pago' | 'Aguardando' | 'Atrasado',
        observacao: r.observacao || '',
        responsavelRegistro: r.responsavel_registro,
        responsavelId: r.responsavel_id || null,
        criadoEm: r.criado_em,
        atualizadoEm: r.atualizado_em
      }));
    } catch (e) {
      console.error('Error fetching SQLite pagamentos:', e);
      return [];
    }
  },

  async getPagamentoById(id: number) {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data, error } = await supabase.from('pagamentos').select('*').eq('id', id).single();
        if (!error && data) {
          return {
            id: Number(data.id),
            alunoId: Number(data.aluno_id),
            alunoNome: data.aluno_nome,
            valor: Number(data.valor),
            dataPagamento: data.data_pagamento,
            mesReferencia: data.mes_referencia,
            formaPagamento: data.forma_pagamento,
            status: data.status as 'Pago' | 'Aguardando' | 'Atrasado',
            observacao: data.observacao || '',
            responsavelRegistro: data.responsavel_registro,
            responsavelId: data.responsavel_id || null,
            criadoEm: data.criado_em,
            atualizadoEm: data.atualizado_em
          };
        }
      } catch (err) {}
    }

    try {
      const r = db.prepare('SELECT * FROM pagamentos WHERE id = ?').get(id) as any;
      if (r) {
        return {
          id: Number(r.id),
          alunoId: Number(r.aluno_id),
          alunoNome: r.aluno_nome,
          valor: Number(r.valor),
          dataPagamento: r.data_pagamento,
          mesReferencia: r.mes_referencia,
          formaPagamento: r.forma_pagamento,
          status: r.status as 'Pago' | 'Aguardando' | 'Atrasado',
          observacao: r.observacao || '',
          responsavelRegistro: r.responsavel_registro,
          responsavelId: r.responsavel_id || null,
          criadoEm: r.criado_em,
          atualizadoEm: r.atualizado_em
        };
      }
    } catch (e) {
      console.error('Error in SQLite getPagamentoById:', e);
    }
    return null;
  },

  async createPagamento(data: {
    alunoId: number | string;
    alunoNome?: string;
    valor: number;
    dataPagamento: string;
    mesReferencia: string;
    formaPagamento: string;
    status: 'Pago' | 'Aguardando' | 'Atrasado';
    observacao?: string;
    responsavelRegistro: string;
    responsavelId?: string;
  }) {
    const alunoId = Number(data.alunoId);
    let alunoNome = (data.alunoNome || '').trim();

    if (!alunoNome) {
      const aluno = await this.getPreCadastroById(alunoId);
      if (aluno) {
        alunoNome = aluno.nome || aluno.nomeAluno || `Aluno #${alunoId}`;
      } else {
        alunoNome = `Aluno #${alunoId}`;
      }
    }

    const valor = Number(data.valor) || 0;
    const dataPagamento = data.dataPagamento || new Date().toISOString().split('T')[0];
    const mesReferencia = (data.mesReferencia || '').trim() || 'Mensalidade';
    const formaPagamento = data.formaPagamento || 'PIX';
    const status = data.status || 'Pago';
    const observacao = (data.observacao || '').trim();
    const responsavelRegistro = data.responsavelRegistro || 'Administrador';
    const responsavelId = data.responsavelId || null;
    const now = new Date().toISOString();

    let insertedId: number = Date.now();

    // 1. SQLite
    try {
      const stmt = db.prepare(`
        INSERT INTO pagamentos (
          aluno_id,
          aluno_nome,
          valor,
          data_pagamento,
          mes_referencia,
          forma_pagamento,
          status,
          observacao,
          responsavel_registro,
          responsavel_id,
          criado_em,
          atualizado_em
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const res = stmt.run(
        alunoId,
        alunoNome,
        valor,
        dataPagamento,
        mesReferencia,
        formaPagamento,
        status,
        observacao,
        responsavelRegistro,
        responsavelId,
        now,
        now
      );
      if (res && res.lastInsertRowid) {
        insertedId = Number(res.lastInsertRowid);
      }
    } catch (e) {
      console.error('Error inserting SQLite pagamento:', e);
    }

    // 2. Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        const { data: supaData, error } = await supabase.from('pagamentos').insert({
          aluno_id: alunoId,
          aluno_nome: alunoNome,
          valor,
          data_pagamento: dataPagamento,
          mes_referencia: mesReferencia,
          forma_pagamento: formaPagamento,
          status,
          observacao: observacao || null,
          responsavel_registro: responsavelRegistro,
          responsavel_id: responsavelId,
          criado_em: now,
          atualizado_em: now
        }).select('id').single();

        if (!error && supaData && supaData.id) {
          insertedId = Number(supaData.id);
        }
      } catch (e) {
        console.warn('Supabase pagamento insert warning:', e);
      }
    }

    // 3. Atualizar status do aluno no aluno_financeiro_config se for pagamento mais recente
    try {
      const currentConfig = await this.getAlunoFinanceiroConfig(alunoId);
      if (status === 'Pago' || currentConfig.status !== 'Pago') {
        await this.saveAlunoFinanceiroConfig({
          alunoId,
          plano: currentConfig.plano,
          valor: currentConfig.valor,
          diaVencimento: currentConfig.diaVencimento,
          status,
          userName: responsavelRegistro
        });
      }
    } catch (e) {
      console.warn('Could not sync aluno_financeiro_config status:', e);
    }

    // 4. Auditoria
    try {
      await this.addHistorico(
        alunoId,
        'Pagamento registrado',
        `${mesReferencia} - R$ ${valor.toFixed(2)} (${status}) via ${formaPagamento}`,
        responsavelRegistro
      );
    } catch (e) {
      console.warn('Failed to add historico for pagamento:', e);
    }

    return {
      id: insertedId,
      alunoId,
      alunoNome,
      valor,
      dataPagamento,
      mesReferencia,
      formaPagamento,
      status,
      observacao,
      responsavelRegistro,
      responsavelId,
      criadoEm: now,
      atualizadoEm: now
    };
  },

  async updatePagamento(id: number, data: {
    alunoId?: number | string;
    alunoNome?: string;
    valor?: number;
    dataPagamento?: string;
    mesReferencia?: string;
    formaPagamento?: string;
    status?: 'Pago' | 'Aguardando' | 'Atrasado';
    observacao?: string;
    responsavelRegistro?: string;
  }) {
    const existing = await this.getPagamentoById(id);
    if (!existing) {
      throw new Error('Pagamento não encontrado');
    }

    const alunoId = data.alunoId !== undefined ? Number(data.alunoId) : existing.alunoId;
    let alunoNome = data.alunoNome !== undefined ? data.alunoNome.trim() : existing.alunoNome;
    if (!alunoNome && alunoId) {
      const aluno = await this.getPreCadastroById(alunoId);
      if (aluno) alunoNome = aluno.nome || aluno.nomeAluno || existing.alunoNome;
    }

    const valor = data.valor !== undefined ? Number(data.valor) : existing.valor;
    const dataPagamento = data.dataPagamento || existing.dataPagamento;
    const mesReferencia = data.mesReferencia !== undefined ? data.mesReferencia.trim() : existing.mesReferencia;
    const formaPagamento = data.formaPagamento || existing.formaPagamento;
    const status = data.status || existing.status;
    const observacao = data.observacao !== undefined ? data.observacao.trim() : existing.observacao;
    const now = new Date().toISOString();

    // 1. SQLite
    try {
      db.prepare(`
        UPDATE pagamentos SET
          aluno_id = ?,
          aluno_nome = ?,
          valor = ?,
          data_pagamento = ?,
          mes_referencia = ?,
          forma_pagamento = ?,
          status = ?,
          observacao = ?,
          atualizado_em = ?
        WHERE id = ?
      `).run(
        alunoId,
        alunoNome,
        valor,
        dataPagamento,
        mesReferencia,
        formaPagamento,
        status,
        observacao,
        now,
        id
      );
    } catch (e) {
      console.error('Error updating SQLite pagamento:', e);
    }

    // 2. Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('pagamentos').update({
          aluno_id: alunoId,
          aluno_nome: alunoNome,
          valor,
          data_pagamento: dataPagamento,
          mes_referencia: mesReferencia,
          forma_pagamento: formaPagamento,
          status,
          observacao: observacao || null,
          atualizado_em: now
        }).eq('id', id);
      } catch (e) {
        console.warn('Supabase pagamento update warning:', e);
      }
    }

    // 3. Auditoria
    try {
      await this.addHistorico(
        alunoId,
        'Pagamento editado',
        `Alterado registro #${id}: ${mesReferencia} - R$ ${valor.toFixed(2)} (${status})`,
        data.responsavelRegistro || existing.responsavelRegistro
      );
    } catch (e) {}

    return {
      ...existing,
      alunoId,
      alunoNome,
      valor,
      dataPagamento,
      mesReferencia,
      formaPagamento,
      status,
      observacao,
      atualizadoEm: now
    };
  },

  async deletePagamento(id: number, userName?: string) {
    const existing = await this.getPagamentoById(id);

    try {
      db.prepare('DELETE FROM pagamentos WHERE id = ?').run(id);
    } catch (e) {
      console.error('Error deleting SQLite pagamento:', e);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabase();
        await supabase.from('pagamentos').delete().eq('id', id);
      } catch (e) {
        console.warn('Supabase pagamento delete warning:', e);
      }
    }

    if (existing) {
      try {
        await this.addHistorico(
          existing.alunoId,
          'Pagamento excluído',
          `Registro excluído: ${existing.mesReferencia} - R$ ${existing.valor.toFixed(2)} (${existing.status})`,
          userName || 'Administrador'
        );
      } catch (e) {}
    }

    return { success: true };
  },

  async getFinanceiroDashboardStats() {
    // 1. Total alunos ativos
    let totalAlunosAtivos = 0;
    try {
      const preList = await this.getPreCadastros();
      totalAlunosAtivos = preList.filter(p => p.status !== 'Cancelado' && p.status !== 'Inativo').length;
    } catch (e) {
      console.warn('Error fetching active alunos count:', e);
    }

    // 2. Pagamentos
    const allPagamentos = await this.getPagamentos();

    let mensalidadesRecebidasTotal = 0;
    let mensalidadesRecebidasQtd = 0;
    let mensalidadesPendentesTotal = 0;
    let mensalidadesPendentesQtd = 0;
    let pagamentosAtrasadosTotal = 0;
    let pagamentosAtrasadosQtd = 0;

    for (const p of allPagamentos) {
      const val = Number(p.valor) || 0;
      if (p.status === 'Pago') {
        mensalidadesRecebidasTotal += val;
        mensalidadesRecebidasQtd++;
      } else if (p.status === 'Aguardando') {
        mensalidadesPendentesTotal += val;
        mensalidadesPendentesQtd++;
      } else if (p.status === 'Atrasado') {
        pagamentosAtrasadosTotal += val;
        pagamentosAtrasadosQtd++;
      }
    }

    return {
      totalAlunosAtivos,
      mensalidadesRecebidasTotal,
      mensalidadesRecebidasQtd,
      mensalidadesPendentesTotal,
      mensalidadesPendentesQtd,
      pagamentosAtrasadosTotal,
      pagamentosAtrasadosQtd
    };
  }
};
