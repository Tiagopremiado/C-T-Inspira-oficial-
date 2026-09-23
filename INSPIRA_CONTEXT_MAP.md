# ==============================================================================
# CONTEXTO OPERACIONAL DO SISTEMA: CENTRO DE TREINAMENTO INSPIRA
# ==============================================================================
# Propósito: Fornecer a modelos de linguagem (LLMs) e desenvolvedores o entendimento
# conceitual, estrutural, regras de negócio, mapa de contexto (DDD) e arquitetura da plataforma.
# ==============================================================================

## 1. VISÃO DO PRODUTO & MISSÃO
O **Centro de Treinamento Inspira** é uma instituição de desenvolvimento formativo,
físico e comportamental voltada a adolescentes e jovens. Seu foco vai além do treino:
promove disciplina, autoconfiança, liderança, espírito de equipe e propósito.

A plataforma web do Inspira é uma solução full-stack integrada que atende a duas frentes:
1. **Pública / Aquisição**: Landing Page institucional focada em conversão e pré-matrícula,
   além do formulário público de preenchimento da Ficha Cadastral Completa de Saúde.
2. **Administrativa ("Comando Geral")**: Painel operacional unificado para a liderança,
   secretaria e instrutores gerenciarem todo o ciclo de vida do aluno: admissão, ficha
   médica/laudos, frequência, evolução de competências, avisos e financeiro.

---

## 2. ARQUITETURA TÉCNICA E STACK

- **Frontend**: React (SPA com TypeScript), Tailwind CSS, Lucide Icons, Mobile-First.
- **Backend**: Node.js com Express (TypeScript via tsx em dev, compilação Vite/Node em prod).
- **Banco de Dados Híbrido (Dual-Engine com Fallback)**:
  - *Engine Principal*: PostgreSQL no Supabase com Row Level Security (RLS) e Service Role.
  - *Engine Local / Contingência*: SQLite nativo (`inspira.db`) para garantir alta disponibilidade
    local ou operação offline, com schemas equivalentes e sincronização transparente.
- **Armazenamento de Arquivos**: Suporte a upload de laudos médicos (PDF/Imagens) armazenados
  em diretório dedicado (`/uploads/laudos`) e metadados no banco.
- **Integração Externa**: Links dinâmicos de WhatsApp (Web/App) para comunicação com alunos/pais
  e arquitetura extensível para Gateways de Pagamento (Webhooks e APIs).

---

## 3. LINGUAGEM UBÍQUA (GLOSSÁRIO DO DOMÍNIO)

- **Comando Geral**: O painel de controle administrativo central do sistema.
- **Pré-Cadastro**: Registro inicial gerado na Landing Page ou balcão com dados essenciais de contato.
- **Cadastro Completo (Ficha Completa)**: Dossiê aprofundado do aluno com histórico de saúde,
  laudos médicos, CID, contatos de emergência, alergias e autorização de imagem (LGPD).
- **Pipeline de Matrícula**: Fluxo de status pelo qual o aluno passa desde o primeiro lead
  até a confirmação da vaga (`Novo cadastro` → `Primeiro contato realizado` →
  `Aguardando retorno` → `Documentação pendente` → `Matrícula confirmada` → `Finalizado`).
- **Avaliação de Competências**: Registro pedagógico periódico baseado em 7 competências
  fundamentais (notas de 1 a 5, cálculo automático de média geral, metas e missões).
- **Frequência**: Registro de assiduidade em treinamentos (`Presente`, `Ausente`, `Justificada`).
- **Comunicado**: Avisos internos e institucionais direcionados (Geral, Alunos, Responsáveis, Individual).
- **Gateway de Pagamento**: Camada intermediária que orquestra cobranças manuais ou automatizadas
  (InfinityPay, PaggPay, etc.) e processa webhooks.

---

## 4. PERFIS DE ACESSO (RBAC)

1. **Administrador Geral**:
   - Acesso irrestrito a todos os módulos, configurações, relatórios financeiros e gestão de equipe.
   - Pode alterar papéis, redefinir senhas, emitir cobranças e rodar varreduras de inadimplência.
2. **Secretaria**:
   - Gestão de pré-cadastros, fichas completas, frequência, comunicados e controle de pagamentos.
   - Sem permissão para alterar configurações estruturais da equipe ou dados confidenciais do sistema.
3. **Instrutor**:
   - Foco pedagógico: visualiza alunos, lança presenças/faltas (inclusive em lote) e registra
     avaliações periódicas de evolução comportamental.
   - Acesso bloqueado ao módulo financeiro e eventos de gateway.

---

## 5. CONTEXT MAP — DOMAIN-DRIVEN DESIGN (DDD)

```
+-------------------------------------------------------------------------------+
|                             CONTEXT MAP - INSPIRA                             |
+-------------------------------------------------------------------------------+

  [ BC1: Aquisição & Onboarding ]
             |
             | (Gera Pré-Cadastro) [Upstream -> Downstream]
             v
  [ BC2: Gestão de Alunos & Ficha Médica ] <------+ (Shared Kernel: ID Aluno)
        ^                 ^                       |
        |                 |                       |
        | (Avalia)        | (Registra)            | (Cobra / Recebe)
        |                 |                       |
  [ BC4: Avaliação ]  [ BC5: Frequência ]   [ BC6: Financeiro & Gateways ]
  (Evolução 7 Itens)  (Assiduidade)               ^
        ^                 ^                       |
        |                 |                       | (Notifica via Webhook)
  [ BC3: Equipe & RBAC ] -+                       |
  (Instrutores / Admins)             [ External: Gateway de Pagamento ]
                                     (InfinityPay / PaggPay / PIX)

  [ BC7: Central de Comunicação ] (Consome BC2 para envio de comunicados direcionados)
```

### Detalhamento dos Bounded Contexts (BCs):

#### BC1: Aquisição & Onboarding
- **Entidades**: `PreCadastro`
- **Responsabilidade**: Captura de leads via Landing Page (modal interativo). Validação de contato
  mínimo (ao menos um WhatsApp: aluno ou responsável).
- **Relação com BC2**: Fornece os dados primários do aluno e gera link de convite para a Ficha Completa.

#### BC2: Gestão de Alunos, Cadastros & Ficha Médica
- **Entidades**: `PreCadastro`, `CadastroCompleto`, `HistoricoAluno`
- **Responsabilidade**: Ficha cadastral unificada com 9 abas: Dados Pessoais, Responsáveis,
  Saúde/Laudos, Documentação, Histórico/Auditoria, Evolução, Frequência, Comunicações e Financeiro.
- **Regras Críticas**:
  - Armazena CID, alergias, medicações de uso contínuo, contatos de socorro e laudos anexados.
  - Registro de auditoria (`HistoricoAluno`) automático a cada mudança de status ou contato realizado.
  - Permite geração de link seguro e mensagem pré-formatada para WhatsApp do responsável.

#### BC3: Gestão de Equipe & Controle de Acesso (RBAC)
- **Entidades**: `admin_users`, `sessions`, `UsuarioComando`
- **Responsabilidade**: Autenticação com salt + hash criptográfico (SHA-512), gerenciamento de sessões
  ativas e autorização granular por papel (`Administrador`, `Secretaria`, `Instrutor`).

#### BC4: Avaliação e Evolução do Aluno
- **Entidades**: `AvaliacaoAluno`, `CompetenciasAvaliacao`
- **Responsabilidade**: Avaliação formativa do aluno em 7 dimensões:
  1. Disciplina | 2. Responsabilidade | 3. Trabalho em Equipe | 4. Liderança
  5. Comunicação | 6. Participação | 7. Superação de Desafios.
- **Regras**: Cada competência recebe nota 1 a 5 + parecer descritivo. O sistema calcula a `mediaGeral`
  automaticamente e armazena metas e missões futuras em formato JSON estruturado.

#### BC5: Controle de Frequência e Assiduidade
- **Entidades**: `FrequenciaAluno`, `ResumoFrequencia`
- **Responsabilidade**: Registro pontual ou em lote de chamadas para atividades e treinamentos.
- **Regras**: Status possíveis: `Presente`, `Ausente`, `Justificada`. Gera indicadores de
  percentual de presença (`percentualPresenca`), total de faltas e histórico consolidado.

#### BC6: Gestão Financeira & Gateway de Pagamentos
- **Entidades**: `AlunoFinanceiroConfig`, `Pagamento`, `FinanceiroEvento`, `DashboardFinanceiroStats`
- **Responsabilidade**: Gestão das mensalidades, planos contratados, cobranças e conciliação.
- **Padrão Arquitetural**: **Adapter Pattern** com `PaymentGatewayAdapter` e `GatewayRegistry`.
  - Adapters: `ManualGatewayAdapter` (PIX/dinheiro), `InfinityPayGatewayAdapter`, `PaggPayGatewayAdapter`.
  - **Fluxo Automatizado**:
    1. Emissão de cobrança com cálculo de vencimento (`proxima_cobranca`).
    2. Recepção de Webhook do gateway (`/api/financeiro/webhook/:gateway`).
    3. Criação de recibo oficial em `pagamentos`, atualização da configuração do aluno para `Pago`
       e gravação imutável no log de auditoria `financeiro_eventos`.
    4. Régua de inadimplência: varredura automática (`/api/financeiro/processar-atrasados`) que
       altera status para `Atrasado` caso o vencimento seja ultrapassado.

#### BC7: Central de Comunicação
- **Entidades**: `Comunicado`
- **Responsabilidade**: Murais de avisos e notificações direcionadas.
- **Segmentação**: `Geral`, `Alunos`, `Responsáveis` ou `Individual` (vinculado a um `aluno_id`).
- **Ciclo de Vida**: `Rascunho` → `Publicado` → `Arquivado`.

---

## 6. ESQUEMA DE DADOS CONSOLIDADO (SCHEMA PRINCIPAL)

| Tabela | Função Principal |
| :--- | :--- |
| `admin_users` | Credenciais administrativas, salt, hash, role e perfil. |
| `sessions` | Tokens bearer com timestamp de expiração para autenticação segura. |
| `pre_cadastros` | Fila de admissão, status de contato, dados cadastrais básicos. |
| `cadastros_completos` | Prontuário médico, saúde, laudos, alergias, autorizações LGPD. |
| `historico_aluno` | Log imutável de ações, notas de contato e auditoria de cada aluno. |
| `avaliacoes_aluno` | Histórico pedagógico com notas das 7 competências e metas. |
| `frequencia_aluno` | Registros diários de presença, ausência e justificativas. |
| `comunicados` | Avisos e mensagens institucionais ou individuais. |
| `aluno_financeiro_config` | Plano do aluno, valor, vencimento, status e identificadores de gateway. |
| `pagamentos` | Recibos de pagamentos confirmados com data, forma e competência. |
| `financeiro_eventos` | Auditoria de eventos externos e webhooks recebidos dos gateways. |

---

## 7. DIRETRIZES DE RESPOSTA PARA O ASSISTENTE LLM

Ao gerar código, refatorar ou propor novas features para o Inspira:
1. **Preservar a Dualidade Supabase + SQLite**: Todas as alterações de persistência no backend
   devem manter a paridade entre a query do Supabase e o fallback SQLite local no `dataService.ts`.
2. **Respeitar o RBAC**: Não exponha dados financeiros ou endpoints restritos para o perfil `Instrutor`.
3. **Padrão Visual Inspira**: Dark theme premium militar/esportivo (`#061018`, `#091f2e`, detalhes em
   dourado `#f5c33b` / `#ffe27a` e azul tático `#1a8bc8`). Não utilize temas genéricos.
4. **Desacoplamento de Gateway**: Integrações de pagamento devem implementar a interface
   `PaymentGatewayAdapter` sem acoplamento direto nos controladores do Express.
5. **Comunicação Não Destrutiva**: Preservar o histórico do aluno e logs de auditoria em qualquer
   mutação de estado de cadastro ou cobrança.
