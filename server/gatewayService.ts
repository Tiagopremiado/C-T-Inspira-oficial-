import { dataService } from './dataService.js';
import type { TipoEventoFinanceiro, GatewayPagamento } from '../src/types.js';

// ============================================================================
// ARQUITETURA DE INTEGRAÇÃO COM GATEWAYS DE PAGAMENTO (Inspira)
// Preparada para suportar InfinityPay, PaggPay, Manual e novos gateways
// ============================================================================

export interface GatewayCobrancaParams {
  alunoId: number;
  alunoNome: string;
  responsavelNome?: string;
  responsavelTelefone?: string;
  valor: number;
  diaVencimento?: number;
  dataVencimento: string; // YYYY-MM-DD
  mesReferencia: string;
  descricao: string;
  idClienteGateway?: string | null;
}

export interface GatewayCobrancaResult {
  idCobranca: string;
  linkPagamento?: string;
  pixCopiaECola?: string;
  pixQrCodeUrl?: string;
  status: string;
  gateway: string;
  rawResponse?: any;
}

export interface GatewayWebhookEvent {
  tipoEvento: TipoEventoFinanceiro;
  gateway: GatewayPagamento;
  alunoId?: number | null;
  idClienteGateway?: string;
  idTransacao?: string;
  idCobranca?: string;
  idAssinatura?: string;
  valor?: number;
  status: string; // 'confirmado' | 'pendente' | 'falhou' | 'cancelado'
  dataPagamento?: string;
  formaPagamento?: string;
  mesReferencia?: string;
  descricao?: string;
  rawPayload?: any;
}

export interface PaymentGatewayAdapter {
  readonly name: string;
  criarCliente?(dados: { alunoId: number; nome: string; documento?: string; email?: string; telefone?: string }): Promise<{ idClienteGateway: string }>;
  gerarCobranca(params: GatewayCobrancaParams): Promise<GatewayCobrancaResult>;
  cancelarCobranca?(idCobranca: string): Promise<boolean>;
  parseWebhook(payload: any, headers?: any): Promise<GatewayWebhookEvent>;
}

// ----------------------------------------------------------------------------
// ADAPTER 1: MANUAL / PIX DIRETO (Padrão)
// ----------------------------------------------------------------------------
export class ManualGatewayAdapter implements PaymentGatewayAdapter {
  readonly name = 'manual';

  async gerarCobranca(params: GatewayCobrancaParams): Promise<GatewayCobrancaResult> {
    const idCobranca = `MAN-${params.alunoId}-${Date.now()}`;
    return {
      idCobranca,
      status: 'pendente',
      gateway: this.name,
      descricao: params.descricao
    } as any;
  }

  async parseWebhook(payload: any): Promise<GatewayWebhookEvent> {
    return {
      tipoEvento: payload.tipoEvento || 'pagamento',
      gateway: this.name,
      alunoId: payload.alunoId ? Number(payload.alunoId) : null,
      valor: Number(payload.valor || 0),
      status: payload.status || 'confirmado',
      descricao: payload.descricao || 'Confirmação de pagamento manual',
      rawPayload: payload
    };
  }
}

// ----------------------------------------------------------------------------
// ADAPTER 2: INFINITYPAY (Estrutura Preparada para Credenciais / API)
// ----------------------------------------------------------------------------
export class InfinityPayGatewayAdapter implements PaymentGatewayAdapter {
  readonly name = 'infinitypay';

  async criarCliente(dados: { alunoId: number; nome: string; documento?: string; email?: string; telefone?: string }) {
    // Pronto para chamada POST /v1/customers na API da InfinityPay quando as chaves forem configuradas
    const idClienteGateway = `inf_cust_${dados.alunoId}_${Date.now()}`;
    return { idClienteGateway };
  }

  async gerarCobranca(params: GatewayCobrancaParams): Promise<GatewayCobrancaResult> {
    // Preparado para chamada POST /v1/invoices ou /v1/pix na API da InfinityPay
    const idCobranca = `inf_inv_${params.alunoId}_${Date.now()}`;
    return {
      idCobranca,
      linkPagamento: `https://checkout.infinitypay.io/pay/${idCobranca}`,
      pixCopiaECola: `00020101021226840014br.gov.bcb.pix2562infinitypay.io/qr/${idCobranca}520400005303986540${params.valor.toFixed(2)}5802BR5913Inspira6009Pelotas`,
      status: 'pendente',
      gateway: this.name
    };
  }

  async parseWebhook(payload: any): Promise<GatewayWebhookEvent> {
    // Mapeamento preparado para os eventos comuns da InfinityPay (invoice.paid, pix.received, charge.failed)
    const eventType = payload.event || payload.type || 'payment.success';
    const isPaid = eventType.includes('paid') || eventType.includes('success') || payload.status === 'PAID';
    const isCanceled = eventType.includes('canceled') || eventType.includes('failed') || payload.status === 'CANCELED';

    let tipoEvento: TipoEventoFinanceiro = 'pagamento';
    if (isCanceled) tipoEvento = 'cancelamento';
    else if (eventType.includes('plan') || eventType.includes('subscription')) tipoEvento = 'alteração_plano';
    else if (eventType.includes('charge.created')) tipoEvento = 'cobrança';

    return {
      tipoEvento,
      gateway: this.name,
      alunoId: payload.metadata?.alunoId ? Number(payload.metadata.alunoId) : (payload.alunoId ? Number(payload.alunoId) : null),
      idClienteGateway: payload.customer_id || payload.customerId,
      idTransacao: payload.transaction_id || payload.id,
      idCobranca: payload.invoice_id || payload.charge_id,
      valor: Number(payload.amount ? (payload.amount / 100) : (payload.valor || 0)),
      status: isPaid ? 'confirmado' : isCanceled ? 'cancelado' : 'pendente',
      dataPagamento: payload.paid_at || new Date().toISOString().split('T')[0],
      formaPagamento: payload.payment_method === 'pix' ? 'PIX' : 'Cartão de Crédito',
      descricao: `Webhook InfinityPay [${eventType}]: ${payload.description || ''}`,
      rawPayload: payload
    };
  }
}

// ----------------------------------------------------------------------------
// ADAPTER 3: PAGGPAY (Estrutura Preparada para Credenciais / API)
// ----------------------------------------------------------------------------
export class PaggPayGatewayAdapter implements PaymentGatewayAdapter {
  readonly name = 'paggpay';

  async criarCliente(dados: { alunoId: number; nome: string; documento?: string; email?: string; telefone?: string }) {
    // Pronto para chamada POST /customers na API PaggPay
    const idClienteGateway = `pagg_cust_${dados.alunoId}_${Date.now()}`;
    return { idClienteGateway };
  }

  async gerarCobranca(params: GatewayCobrancaParams): Promise<GatewayCobrancaResult> {
    // Preparado para chamada POST /charges ou /orders na API PaggPay
    const idCobranca = `pagg_chg_${params.alunoId}_${Date.now()}`;
    return {
      idCobranca,
      linkPagamento: `https://pay.paggpay.com/${idCobranca}`,
      pixCopiaECola: `00020101021226840014br.gov.bcb.pix2562paggpay.com/qr/${idCobranca}520400005303986540${params.valor.toFixed(2)}5802BR5913Inspira6009Pelotas`,
      status: 'pendente',
      gateway: this.name
    };
  }

  async parseWebhook(payload: any): Promise<GatewayWebhookEvent> {
    // Mapeamento preparado para webhooks da PaggPay
    const status = (payload.status || '').toLowerCase();
    const isPaid = status === 'paid' || status === 'approved' || status === 'confirmed';
    const isCanceled = status === 'refunded' || status === 'canceled' || status === 'chargeback';

    let tipoEvento: TipoEventoFinanceiro = 'pagamento';
    if (isCanceled) tipoEvento = 'cancelamento';
    else if (payload.event === 'subscription_updated') tipoEvento = 'alteração_plano';
    else if (payload.event === 'charge_created') tipoEvento = 'cobrança';

    return {
      tipoEvento,
      gateway: this.name,
      alunoId: payload.external_reference ? Number(payload.external_reference) : (payload.alunoId ? Number(payload.alunoId) : null),
      idClienteGateway: payload.customer_id,
      idTransacao: payload.payment_id || payload.id,
      idCobranca: payload.charge_id,
      valor: Number(payload.value || payload.amount || 0),
      status: isPaid ? 'confirmado' : isCanceled ? 'cancelado' : 'pendente',
      dataPagamento: payload.payment_date || new Date().toISOString().split('T')[0],
      formaPagamento: payload.payment_type || 'PIX',
      descricao: `Webhook PaggPay [${payload.status}]: ${payload.message || ''}`,
      rawPayload: payload
    };
  }
}

// ----------------------------------------------------------------------------
// REGISTRY DE GATEWAYS
// Permite adicionar novos gateways sem alterar o código do sistema principal
// ----------------------------------------------------------------------------
class GatewayRegistry {
  private adapters = new Map<string, PaymentGatewayAdapter>();

  constructor() {
    this.register(new ManualGatewayAdapter());
    this.register(new InfinityPayGatewayAdapter());
    this.register(new PaggPayGatewayAdapter());
  }

  register(adapter: PaymentGatewayAdapter) {
    this.adapters.set(adapter.name.toLowerCase(), adapter);
  }

  get(name?: string): PaymentGatewayAdapter {
    const key = (name || 'manual').toLowerCase();
    return this.adapters.get(key) || this.adapters.get('manual')!;
  }

  getRegisteredGateways(): string[] {
    return Array.from(this.adapters.keys());
  }
}

export const gatewayRegistry = new GatewayRegistry();

// ----------------------------------------------------------------------------
// SERVIÇO PRINCIPAL DE ORQUESTRAÇÃO FINANCEIRA E GATEWAYS
// ----------------------------------------------------------------------------
export const gatewayService = {
  /**
   * 1. Gera cobrança para o responsável do aluno através do gateway configurado
   */
  async gerarCobrancaParaResponsavel(alunoId: number, options?: {
    valor?: number;
    vencimento?: string;
    gateway?: string;
    mesReferencia?: string;
    descricao?: string;
    userName?: string;
  }) {
    const aluno = await dataService.getPreCadastroById(alunoId);
    if (!aluno) {
      throw new Error(`Aluno #${alunoId} não encontrado.`);
    }

    const config = await dataService.getAlunoFinanceiroConfig(alunoId);
    const gatewayName = (options?.gateway || config.gatewayPagamento || 'manual').toLowerCase();
    const adapter = gatewayRegistry.get(gatewayName);

    const valor = options?.valor !== undefined ? Number(options.valor) : Number(config.valor || 150.00);
    const diaVenc = config.diaVencimento || 10;
    
    // Calcular data de vencimento padrão se não informada
    const now = new Date();
    let dataVenc = options?.vencimento;
    if (!dataVenc) {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(diaVenc).padStart(2, '0');
      dataVenc = `${year}-${month}-${day}`;
    }

    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesAtualNome = meses[now.getMonth()];
    const mesReferencia = options?.mesReferencia || `Mensalidade ${mesAtualNome}/${now.getFullYear()}`;
    const descricao = options?.descricao || `Cobrança ${mesReferencia} - Aluno: ${aluno.nome}`;

    // Executar no adapter
    const resultado = await adapter.gerarCobranca({
      alunoId,
      alunoNome: aluno.nome,
      responsavelNome: aluno.responsavel,
      responsavelTelefone: aluno.whatsResponsavel || aluno.whats,
      valor,
      diaVencimento: diaVenc,
      dataVencimento: dataVenc,
      mesReferencia,
      descricao,
      idClienteGateway: config.idClienteGateway
    });

    // 1. Gravar no histórico de eventos financeiros
    await dataService.createFinanceiroEvento({
      alunoId,
      tipoEvento: 'cobrança',
      gateway: gatewayName,
      valor,
      status: resultado.status || 'gerada',
      descricao: `Cobrança emitida (${mesReferencia}) via ${gatewayName}. ID: ${resultado.idCobranca}`
    });

    // 2. Atualizar proxima_cobranca e ultima_sincronizacao na configuração do aluno
    await dataService.saveAlunoFinanceiroConfig({
      alunoId,
      plano: config.plano,
      valor: config.valor,
      diaVencimento: config.diaVencimento,
      status: config.status,
      gatewayPagamento: gatewayName,
      idClienteGateway: config.idClienteGateway,
      idAssinaturaGateway: config.idAssinaturaGateway,
      statusGateway: 'ativo',
      proximaCobranca: dataVenc,
      ultimaSincronizacao: new Date().toISOString(),
      userName: options?.userName || 'Sistema'
    });

    // 3. Registrar no histórico de auditoria do aluno
    try {
      await dataService.addHistorico(
        alunoId,
        'Configuração financeira atualizada',
        `Cobrança gerada: R$ ${valor.toFixed(2)} (${mesReferencia}) via ${gatewayName}`,
        options?.userName || 'Gateway de Pagamentos'
      );
    } catch (e) {}

    return {
      sucesso: true,
      alunoId,
      alunoNome: aluno.nome,
      responsavel: aluno.responsavel,
      contato: aluno.whatsResponsavel || aluno.whats,
      cobranca: resultado,
      dataVencimento: dataVenc,
      valor
    };
  },

  /**
   * 2. Confirmação automática de pagamento recebido
   * Atualiza status do aluno para Pago e registra pagamento oficial
   */
  async receberConfirmacaoPagamento(dados: {
    alunoId: number;
    valor: number;
    gateway: string;
    dataPagamento?: string;
    mesReferencia?: string;
    formaPagamento?: string;
    idTransacao?: string;
    observacao?: string;
    responsavelRegistro?: string;
  }) {
    const { alunoId, valor, gateway } = dados;
    const now = new Date();
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    const mesAtualNome = meses[now.getMonth()];
    const mesReferencia = dados.mesReferencia || `Mensalidade ${mesAtualNome}/${now.getFullYear()}`;
    const dataPagamento = dados.dataPagamento || now.toISOString().split('T')[0];
    const formaPagamento = dados.formaPagamento || (gateway === 'manual' ? 'PIX' : `${gateway.toUpperCase()} Gateway`);
    const responsavel = dados.responsavelRegistro || `Gateway (${gateway})`;

    // 1. Criar registro oficial na tabela de pagamentos
    const pagamento = await dataService.createPagamento({
      alunoId,
      valor,
      dataPagamento,
      mesReferencia,
      formaPagamento,
      status: 'Pago',
      observacao: dados.observacao || `Pagamento confirmado automaticamente via gateway ${gateway}. Transação: ${dados.idTransacao || 'N/A'}`,
      responsavelRegistro: responsavel
    });

    // 2. Atualizar status e sincronização na configuração financeira do aluno
    const currentConfig = await dataService.getAlunoFinanceiroConfig(alunoId);
    await dataService.saveAlunoFinanceiroConfig({
      alunoId,
      plano: currentConfig.plano,
      valor: currentConfig.valor,
      diaVencimento: currentConfig.diaVencimento,
      status: 'Pago',
      gatewayPagamento: gateway,
      idClienteGateway: currentConfig.idClienteGateway,
      idAssinaturaGateway: currentConfig.idAssinaturaGateway,
      statusGateway: 'ativo',
      proximaCobranca: currentConfig.proximaCobranca,
      ultimaSincronizacao: now.toISOString(),
      userName: responsavel
    });

    // 3. Registrar evento no histórico de eventos financeiros
    await dataService.createFinanceiroEvento({
      alunoId,
      tipoEvento: 'pagamento',
      gateway,
      valor,
      status: 'confirmado',
      descricao: `Pagamento recebido com sucesso: R$ ${valor.toFixed(2)} (${mesReferencia}) via ${gateway}. ID: ${dados.idTransacao || pagamento.id}`
    });

    return {
      sucesso: true,
      pagamento,
      statusAluno: 'Pago'
    };
  },

  /**
   * 3. Processamento de Webhooks recebidos de plataformas externas
   */
  async processarWebhook(gatewayName: string, payload: any, headers?: any) {
    const adapter = gatewayRegistry.get(gatewayName);
    const parsedEvent = await adapter.parseWebhook(payload, headers);

    // Gravar o evento financeiro
    const eventoRegistrado = await dataService.createFinanceiroEvento({
      alunoId: parsedEvent.alunoId,
      tipoEvento: parsedEvent.tipoEvento,
      gateway: parsedEvent.gateway,
      valor: parsedEvent.valor,
      status: parsedEvent.status,
      descricao: parsedEvent.descricao
    });

    // Se o evento for de pagamento confirmado e houver identificação do aluno
    if (parsedEvent.tipoEvento === 'pagamento' && parsedEvent.status === 'confirmado' && parsedEvent.alunoId) {
      await this.receberConfirmacaoPagamento({
        alunoId: parsedEvent.alunoId,
        valor: parsedEvent.valor || 0,
        gateway: parsedEvent.gateway,
        dataPagamento: parsedEvent.dataPagamento,
        mesReferencia: parsedEvent.mesReferencia,
        formaPagamento: parsedEvent.formaPagamento,
        idTransacao: parsedEvent.idTransacao,
        observacao: parsedEvent.descricao,
        responsavelRegistro: `Webhook ${gatewayName}`
      });
    }

    // Se for cancelamento
    if (parsedEvent.tipoEvento === 'cancelamento' && parsedEvent.alunoId) {
      const config = await dataService.getAlunoFinanceiroConfig(parsedEvent.alunoId);
      await dataService.saveAlunoFinanceiroConfig({
        alunoId: parsedEvent.alunoId,
        plano: config.plano,
        valor: config.valor,
        diaVencimento: config.diaVencimento,
        status: config.status,
        gatewayPagamento: gatewayName,
        idClienteGateway: config.idClienteGateway,
        idAssinaturaGateway: config.idAssinaturaGateway,
        statusGateway: 'cancelado',
        proximaCobranca: config.proximaCobranca,
        ultimaSincronizacao: new Date().toISOString(),
        userName: `Webhook ${gatewayName}`
      });
    }

    return {
      processado: true,
      evento: eventoRegistrado,
      parsed: parsedEvent
    };
  },

  /**
   * 4. Controle automatizado de mensalidades atrasadas
   */
  async verificarEAtualizarMensalidadesAtrasadas() {
    const preCadastros = await dataService.getPreCadastros();
    const hojeStr = new Date().toISOString().split('T')[0];
    const diaHoje = new Date().getDate();

    const alunosAtualizados: Array<{ alunoId: number; nome: string; statusAnterior: string }> = [];

    for (const aluno of preCadastros) {
      if (aluno.status === 'Cancelado' || aluno.status === 'Inativo') continue;

      const config = await dataService.getAlunoFinanceiroConfig(aluno.id);
      
      // Se já está Pago ou já marcado como Atrasado, continua
      if (config.status === 'Pago' || config.status === 'Atrasado') continue;

      // Verificar se a data de vencimento expirou
      let expirou = false;

      if (config.proximaCobranca) {
        if (config.proximaCobranca < hojeStr) {
          expirou = true;
        }
      } else if (config.diaVencimento && config.diaVencimento < diaHoje) {
        expirou = true;
      }

      if (expirou) {
        await dataService.saveAlunoFinanceiroConfig({
          alunoId: aluno.id,
          plano: config.plano,
          valor: config.valor,
          diaVencimento: config.diaVencimento,
          status: 'Atrasado',
          gatewayPagamento: config.gatewayPagamento,
          idClienteGateway: config.idClienteGateway,
          idAssinaturaGateway: config.idAssinaturaGateway,
          statusGateway: config.statusGateway,
          proximaCobranca: config.proximaCobranca,
          ultimaSincronizacao: new Date().toISOString(),
          userName: 'Verificação Automática'
        });

        await dataService.createFinanceiroEvento({
          alunoId: aluno.id,
          tipoEvento: 'alteração_plano',
          gateway: config.gatewayPagamento || 'manual',
          valor: config.valor,
          status: 'atrasado',
          descricao: `Mensalidade marcada como Atrasada por decurso de prazo de vencimento (Dia ${config.diaVencimento})`
        });

        alunosAtualizados.push({
          alunoId: aluno.id,
          nome: aluno.nome,
          statusAnterior: config.status
        });
      }
    }

    return {
      executadoEm: new Date().toISOString(),
      totalVerificados: preCadastros.length,
      totalAtrasadosIdentificados: alunosAtualizados.length,
      alunos: alunosAtualizados
    };
  }
};
