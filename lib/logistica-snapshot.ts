import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';

const STATUS_ORDER = [
  'PEDIDO_NOVO',
  'PEDIDO_EM_SEPARACAO',
  'PEDIDO_SEPARADO',
  'PEDIDO_EMBARCADO',
  'PEDIDOS_EMBARCADOS',
  'PENDENCIAS',
  'ALERTAS_NAO_SEPARADOS',
  'ALERTAS_NAO_CONFERIDOS',
  'ALERTAS_NAO_EMBARCADOS',
] as const;

type StatusCode = (typeof STATUS_ORDER)[number];

type PeriodoSnapshot = {
  dataInicioIso?: string | null;
  dataFimIso?: string | null;
  dataInicio?: Date | null;
  dataFim?: Date | null;
  cacheKey?: string;
};

type DashboardPedidoItem = {
  pedidoId: number;
  tipoEntrega: string | null;
  clienteNome: string;
  nomeFantasia: string | null;
  valorPedido: number | null;
  dataHoraRecebimento: string | null;
  previsaoEntrega: string | null;
  localNome: string | null;
  statusCodigo: string;
  statusDescricao: string;
  statusSeparacao: string | null;
  situacaoAtual: string;
  usuarioConfirmacaoNome: string | null;
  dataHoraConfirmacao: string | null;
  dataHoraControle: string | null;
  transportadoraNome: string | null;
  possuiProdutosFaltando: boolean;
  totalItensPendentes: number;
  produtosPendentes: {
    produtoId: number | null;
    codigo: string | null;
    nome: string;
    quantidade: number;
  }[];
};

const STATUS_META: Record<StatusCode, { codigo: StatusCode; titulo: string; descricao: string; statusSeparacao: string }> = {
  PEDIDO_NOVO: {
    codigo: 'PEDIDO_NOVO',
    titulo: 'PEDIDOS PARA SEPARACAO',
    descricao: 'Status da separacao de pendencias: ABERTO',
    statusSeparacao: 'ABERTO',
  },
  PEDIDO_EM_SEPARACAO: {
    codigo: 'PEDIDO_EM_SEPARACAO',
    titulo: 'PEDIDOS EM SEPARACAO',
    descricao: 'Status da separacao de pendencias: EM SEPARACAO',
    statusSeparacao: 'EM SEPARACAO',
  },
  PEDIDO_SEPARADO: {
    codigo: 'PEDIDO_SEPARADO',
    titulo: 'PEDIDOS SEPARADOS AGUARDANDO CONFERENCIA',
    descricao: 'Pedidos com status E aguardando conferencia',
    statusSeparacao: 'SEPARADO',
  },
  PEDIDO_EMBARCADO: {
    codigo: 'PEDIDO_EMBARCADO',
    titulo: 'PEDIDOS CONFERIDOS AGUARDANDO EMBARQUE',
    descricao: 'Usuario de confirmacao com data e hora',
    statusSeparacao: 'EMBARCADO',
  },
  PEDIDOS_EMBARCADOS: {
    codigo: 'PEDIDOS_EMBARCADOS',
    titulo: 'PEDIDOS EMBARCADOS',
    descricao: 'Nota fiscal incluida em um controle de cargas',
    statusSeparacao: 'EMBARCADO NO CONTROLE',
  },
  PENDENCIAS: {
    codigo: 'PENDENCIAS',
    titulo: 'PENDENCIAS',
    descricao: 'Pedidos com pendencias',
    statusSeparacao: 'PENDENCIA',
  },
  ALERTAS_NAO_SEPARADOS: {
    codigo: 'ALERTAS_NAO_SEPARADOS',
    titulo: 'ALERTAS: NAO SEPARADOS',
    descricao: 'Pedidos recebidos no prazo de alerta sem separacao concluida',
    statusSeparacao: 'ALERTA_NAO_SEPARADO',
  },
  ALERTAS_NAO_CONFERIDOS: {
    codigo: 'ALERTAS_NAO_CONFERIDOS',
    titulo: 'ALERTAS: NAO CONFERIDOS',
    descricao: 'Pedidos separados aguardando conferencia',
    statusSeparacao: 'ALERTA_NAO_CONFERIDO',
  },
  ALERTAS_NAO_EMBARCADOS: {
    codigo: 'ALERTAS_NAO_EMBARCADOS',
    titulo: 'ALERTAS: NAO EMBARCADOS',
    descricao: 'Pedidos conferidos aguardando embarque no controle',
    statusSeparacao: 'ALERTA_NAO_EMBARCADO',
  },
};

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const toStringValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
};

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = toStringValue(value);
    if (parsed) return parsed;
  }
  return null;
};

const onlyDigits = (value: string | null | undefined) => String(value || '').replace(/\D/g, '');

const normalizeNumeroNota = (value: string | null | undefined) => {
  const digits = onlyDigits(value);
  if (!digits) return String(value || '').trim().toLowerCase();
  return digits.replace(/^0+/, '') || '0';
};

const parsePedidoDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  const brMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (brMatch) {
    const [, dia, mes, ano, hora = '00', minuto = '00', segundo = '00'] = brMatch;
    const parsed = new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto), Number(segundo));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateOnly = (value: Date | null) =>
  value ? new Date(value.getFullYear(), value.getMonth(), value.getDate()) : null;

const toIso = (value: Date | null | undefined) => value?.toISOString?.() || null;

const getPedidoId = (pedido: Record<string, unknown>) =>
  toNumber(
    pedido.pedido_id ??
      pedido.ORCAMENTO_ID ??
      pedido.orcamento_id ??
      pedido.ORCAMENTO_BASE_ID ??
      pedido.orcamento_base_id ??
      pedido.PEDIDO_ID ??
      pedido.ID ??
      pedido.id
  );

const getTiposEntrega = (pedido: Record<string, unknown>, logistica?: Record<string, any> | null) =>
  [
    pedido.tipo_entrega,
    pedido.TIPO_ENTREGA,
    pedido.tipoEntrega,
    pedido.TIPO_ENTREGA_DESCRICAO,
    pedido.tipo_entrega_descricao,
    (pedido.logistica as Record<string, any> | undefined)?.pedido?.TIPO_ENTREGA,
    (pedido.logistica as Record<string, any> | undefined)?.pedido?.tipo_entrega,
    logistica?.TIPO_ENTREGA,
    logistica?.tipo_entrega,
    logistica?.TIPO_ENTREGA_DESCRICAO,
    (logistica?.pedido as Record<string, any> | undefined)?.TIPO_ENTREGA,
    (logistica?.pedido as Record<string, any> | undefined)?.tipo_entrega,
    (logistica?.pedido as Record<string, any> | undefined)?.TIPO_ENTREGA_DESCRICAO,
  ]
    .map(toStringValue)
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim().toUpperCase());

const hasEntregaNoAto = (pedido: Record<string, unknown>, logistica?: Record<string, any> | null) => {
  const values = [
    pedido.ENTREGA_NO_ATO,
    pedido.entrega_no_ato,
    (pedido.logistica as Record<string, any> | undefined)?.pedido?.ENTREGA_NO_ATO,
    logistica?.ENTREGA_NO_ATO,
    logistica?.entrega_no_ato,
    (logistica?.pedido as Record<string, any> | undefined)?.ENTREGA_NO_ATO,
  ];

  if (values.some((value) => ['S', 'SIM', 'TRUE', '1'].includes(String(value ?? '').trim().toUpperCase()))) {
    return true;
  }

  const entregas = Array.isArray(logistica?.entregas) ? logistica.entregas : [];
  return entregas.some((entrega) =>
    ['S', 'SIM', 'TRUE', '1'].includes(String(entrega?.ENTREGA_NO_ATO ?? '').trim().toUpperCase())
  );
};

const isRetiradaConfirmada = (pedido: Record<string, unknown>) => {
  const retirada = pedido.retirada as Record<string, unknown> | undefined;
  return ['S', 'SIM', 'TRUE', '1'].includes(
    String(retirada?.foi_retirado ?? '').trim().toUpperCase()
  );
};

const isPedidoPermitidoNoDashboard = (
  pedido: Record<string, unknown>,
  logistica?: Record<string, any> | null,
  permitirTipoAusente = false
) => {
  if (hasEntregaNoAto(pedido, logistica)) return false;
  if (isRetiradaConfirmada(pedido)) return false;
  const tipos = getTiposEntrega(pedido, logistica);
  return tipos.some((tipo) => ['ENT', 'EPG'].includes(tipo)) || (permitirTipoAusente && tipos.length === 0);
};

const getTipoEntregaPrincipal = (pedido: Record<string, unknown>, logistica?: Record<string, any> | null) =>
  getTiposEntrega(pedido, logistica)[0] || null;

const getStatusSeparacoes = (pedido: Record<string, unknown>) =>
  (toStringValue(pedido.status_separacoes) || '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);

const deriveDashboardStatus = (
  pedido: Record<string, unknown>,
  statusLogistico: Record<string, unknown>,
  logistica: Record<string, any> | null
): StatusCode | null => {
  const statusApi = toStringValue(statusLogistico.codigo)?.toUpperCase();
  const ultimoStatusSeparacao = toStringValue(pedido.ultimo_status_separacao)?.toUpperCase() || null;
  const statusSeparacoes = new Set(getStatusSeparacoes(pedido));
  const entregaConfirmada = String(pedido.entrega_confirmada || '').trim().toUpperCase() === 'S';

  if (entregaConfirmada) return 'PEDIDO_EMBARCADO';
  if (ultimoStatusSeparacao === 'A') return 'PEDIDO_NOVO';
  if (ultimoStatusSeparacao === 'S') return 'PEDIDO_EM_SEPARACAO';
  if (ultimoStatusSeparacao === 'E') return 'PEDIDO_SEPARADO';
  if (ultimoStatusSeparacao === 'G' || statusSeparacoes.has('G')) return 'PEDIDO_EMBARCADO';
  if (statusSeparacoes.has('E')) return 'PEDIDO_SEPARADO';
  if (statusApi === 'SEM_LOGISTICA') return 'PEDIDO_NOVO';

  const logisticaPedido = (logistica?.pedido || {}) as Record<string, unknown>;
  const statusLogistica = toStringValue(logisticaPedido.status_codigo)?.toUpperCase();
  const candidate = statusApi || statusLogistica;
  return candidate && STATUS_ORDER.includes(candidate as StatusCode) ? (candidate as StatusCode) : null;
};

const hasResumoPendenciaNoPedido = (pedido: Record<string, unknown>) =>
  (toNumber(pedido.total_itens_pendentes) || 0) > 0 ||
  (toNumber(pedido.itens_em_separacao) || 0) > 0 ||
  (toNumber(pedido.quantidade_em_separacao_total) || 0) > 0 ||
  ['S', 'SIM', 'TRUE', '1'].includes(
    String(pedido.possui_produtos_faltando ?? pedido.POSSUI_PRODUTO_FALTANDO ?? '').trim().toUpperCase()
  );

const isPedidoSomenteComSeparacaoAberta = (pedido: Record<string, unknown>) => {
  const ultimoStatus = toStringValue(pedido.ultimo_status_separacao)?.trim().toUpperCase() || null;
  const statusSeparacoes = getStatusSeparacoes(pedido);
  const statusLogistico = toStringValue(
    (pedido.status_logistico as Record<string, unknown> | undefined)?.codigo
  )?.trim().toUpperCase();
  const possuiStatusConcluido =
    ['E', 'G'].includes(ultimoStatus || '') ||
    statusSeparacoes.some((status) => ['E', 'G'].includes(status));
  const possuiStatusAberto =
    ['A', 'S'].includes(ultimoStatus || '') ||
    statusSeparacoes.some((status) => ['A', 'S'].includes(status)) ||
    ['PEDIDO_NOVO', 'PEDIDO_EM_SEPARACAO'].includes(statusLogistico || '');

  return possuiStatusAberto && !possuiStatusConcluido;
};

const hasStatusSeparacao = (pedido: Record<string, unknown>, status: string) => {
  const statusNormalizado = status.trim().toUpperCase();
  const ultimoStatusSeparacao = toStringValue(pedido.ultimo_status_separacao)?.toUpperCase() || null;
  return ultimoStatusSeparacao === statusNormalizado || getStatusSeparacoes(pedido).includes(statusNormalizado);
};

const agruparProdutosPendentes = (itens: Record<string, any>[]) => {
  const agrupados = new Map<string, { produtoId: number | null; codigo: string | null; nome: string; quantidade: number }>();

  for (const item of itens) {
    const quantidade =
      toNumber(item.SALDO_PENDENTE) ??
      toNumber(item.QUANTIDADE_PENDENTE_TOTAL) ??
      toNumber(item.EM_SEPARACAO_PENDENTE) ??
      toNumber(item.SALDO_NA_SEPARACAO) ??
      toNumber(item.SALDO) ??
      toNumber(item.QUANTIDADE_EM_SEPARACAO) ??
      toNumber(item.SALDO_GERAR_SEPARACAO) ??
      Math.max(0, (toNumber(item.QUANTIDADE) || 0) - (toNumber(item.QUANTIDADE_BAIXADA) || 0));
    if (quantidade <= 0) continue;

    const produtoId = toNumber(item.PRODUTO_ID);
    const codigo = toStringValue(item.CODIGO_ORIGINAL) || toStringValue(item.CODIGO_BARRAS);
    const nome = toStringValue(item.PRODUTO_NOME) || 'Produto nao informado';
    const chave = String(produtoId ?? codigo ?? nome);
    const atual = agrupados.get(chave);
    if (atual) atual.quantidade += quantidade;
    else agrupados.set(chave, { produtoId, codigo, nome, quantidade });
  }

  return Array.from(agrupados.values()).sort((a, b) => a.nome.localeCompare(b.nome));
};

const getProdutosPendentes = (logistica: Record<string, any> | null) => {
  const comparativo = Array.isArray(logistica?.comparativo_separacao_pendentes)
    ? logistica.comparativo_separacao_pendentes
    : [];
  const entregas = Array.isArray(logistica?.itens_entregas_pendentes)
    ? logistica.itens_entregas_pendentes
    : [];

  return agruparProdutosPendentes(comparativo.length > 0 ? comparativo : entregas);
};

const isPedidoComPendencias = (pedido: Record<string, unknown>, logistica: Record<string, any> | null) => {
  const statusLogisticoCodigo = toStringValue(
    (pedido.status_logistico as Record<string, unknown> | undefined)?.codigo
  )?.toUpperCase();
  const ultimoStatusSeparacao = toStringValue(pedido.ultimo_status_separacao)?.toUpperCase() || null;
  const statusSeparacoes = getStatusSeparacoes(pedido);
  const itensComparativo = Array.isArray(logistica?.comparativo_separacao_pendentes)
    ? logistica.comparativo_separacao_pendentes
    : [];
  const itensEntregasPendentes = Array.isArray(logistica?.itens_entregas_pendentes)
    ? logistica.itens_entregas_pendentes
    : [];
  const totalItensPendentes = toNumber(logistica?.resumo_pendencias_logisticas?.total_itens_pendentes) || 0;
  const separacoes = Array.isArray(logistica?.separacoes) ? logistica.separacoes : [];
  const itensSeparacoes = Array.isArray(logistica?.itens_separacoes) ? logistica.itens_separacoes : [];
  const possuiSeparacaoEfetivada =
    separacoes.some((separacao) => {
      const status = String(separacao.STATUS ?? '').trim().toUpperCase();
      return status === 'G' || Boolean(separacao.DATA_HORA_BAIXA ?? separacao.DATA_BAIXA);
    }) ||
    itensSeparacoes.some((item) => (toNumber(item.QUANTIDADE_BAIXADA) || 0) > 0);
  const possuiSaldoPendente =
    itensComparativo.some((item) =>
      (toNumber(item.SALDO_PENDENTE) || 0) > 0 ||
      (toNumber(item.QUANTIDADE_PENDENTE_TOTAL) || 0) > 0 ||
      (toNumber(item.EM_SEPARACAO_PENDENTE) || 0) > 0 ||
      (toNumber(item.SALDO_NA_SEPARACAO) || 0) > 0
    ) ||
    itensEntregasPendentes.some((item) =>
      (toNumber(item.SALDO) || 0) > 0 ||
      (toNumber(item.QUANTIDADE_EM_SEPARACAO) || 0) > 0 ||
      (toNumber(item.QTD_EM_SEPARACAO_TRAN_ENT_PEN) || 0) > 0
    );
  const possuiProdutosFaltando =
    ['S', 'SIM', 'TRUE', '1'].includes(
      String(pedido.possui_produtos_faltando ?? pedido.POSSUI_PRODUTO_FALTANDO ?? '').trim().toUpperCase()
    ) ||
    ['S', 'SIM', 'TRUE', '1'].includes(
      String(logistica?.resumo_pendencias_logisticas?.POSSUI_PRODUTO_FALTANDO ?? '').trim().toUpperCase()
    );
  const possuiIndicador =
    possuiProdutosFaltando ||
    totalItensPendentes > 0 ||
    possuiSaldoPendente ||
    statusLogisticoCodigo === 'PENDENCIAS' ||
    ultimoStatusSeparacao === 'PENDENCIA' ||
    statusSeparacoes.includes('PENDENCIA');

  return possuiSeparacaoEfetivada && possuiIndicador;
};

const isPedidoParaAlerta = (dataHoraRecebimento: Date | null) => {
  if (!dataHoraRecebimento) return true;

  const agora = new Date();
  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const corte = new Date(hoje);
  corte.setHours(16, 1, 0, 0);

  if (dataHoraRecebimento < hoje) return true;
  if (agora < corte) return false;
  return dataHoraRecebimento < corte;
};

const deriveAlertaStatus = (
  statusCodigo: StatusCode,
  possuiPendencia: boolean,
  embarcadoNoControle: boolean
): StatusCode | null => {
  if (embarcadoNoControle || possuiPendencia) return null;
  if (statusCodigo === 'PEDIDO_NOVO' || statusCodigo === 'PEDIDO_EM_SEPARACAO') return 'ALERTAS_NAO_SEPARADOS';
  if (statusCodigo === 'PEDIDO_SEPARADO') return 'ALERTAS_NAO_CONFERIDOS';
  if (statusCodigo === 'PEDIDO_EMBARCADO') return 'ALERTAS_NAO_EMBARCADOS';
  return null;
};

const mapWithConcurrency = async <T, R>(values: T[], concurrency: number, mapper: (value: T) => Promise<R>) => {
  const results: R[] = new Array(values.length);
  let index = 0;

  const worker = async () => {
    while (index < values.length) {
      const currentIndex = index++;
      results[currentIndex] = await mapper(values[currentIndex]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, () => worker()));
  return results;
};

const getNotaReferencia = (pedido: Record<string, unknown>, logistica: Record<string, any> | null) => {
  const nota = Array.isArray(logistica?.notas_fiscais) ? logistica.notas_fiscais[0] || {} : {};
  const pedidoLogistica = (logistica?.pedido || {}) as Record<string, any>;
  const numeroNota = pickString(
    pedido.NUMERO_NOTA,
    pedido.numero_nota,
    pedidoLogistica.NUMERO_NOTA,
    nota.NUMERO_NOTA,
    nota.NUMERO_NOTA_FISCAL
  );
  const chave = onlyDigits(
    pickString(
      pedido.IDENTIFICACAO_NFE,
      pedido.identificacao_nfe,
      pedidoLogistica.IDENTIFICACAO_NFE,
      nota.IDENTIFICACAO_NFE,
      nota.CHAVE_NFE
    )
  );

  return { numeroNota, chave };
};

const getControleInfoPorNotasLocais = async (periodo: PeriodoSnapshot) => {
  const whereControle =
    periodo.dataInicio || periodo.dataFim
      ? {
          controle: {
            dataCriacao: {
              ...(periodo.dataInicio ? { gte: periodo.dataInicio } : {}),
              ...(periodo.dataFim
                ? {
                    lte: new Date(
                      periodo.dataFim.getFullYear(),
                      periodo.dataFim.getMonth(),
                      periodo.dataFim.getDate(),
                      23,
                      59,
                      59,
                      999
                    ),
                  }
                : {}),
            },
          },
        }
      : {};

  const notas = await prisma.notaFiscal.findMany({
    where: {
      controleId: { not: null },
      ...whereControle,
    },
    select: {
      numeroNota: true,
      codigo: true,
      dataCriacao: true,
      controle: {
        select: {
          dataCriacao: true,
          numeroManifesto: true,
          transportadora: true,
        },
      },
    },
    take: 800,
    orderBy: { dataCriacao: 'desc' },
  });

  const porNumero = new Map<string, { numeroManifesto: string | null; transportadoraNome: string | null; dataHoraControle: Date | null }>();
  const porChave = new Map<string, { numeroManifesto: string | null; transportadoraNome: string | null; dataHoraControle: Date | null }>();

  for (const nota of notas) {
    const info = {
      numeroManifesto: nota.controle?.numeroManifesto || null,
      transportadoraNome: nota.controle?.transportadora ? String(nota.controle.transportadora) : null,
      dataHoraControle: nota.controle?.dataCriacao || nota.dataCriacao || null,
    };
    const numero = normalizeNumeroNota(nota.numeroNota);
    const chave = onlyDigits(nota.codigo);
    if (numero) porNumero.set(numero, info);
    if (chave) porChave.set(chave, info);
  }

  return { porNumero, porChave };
};

const getSnapshotSyncKey = (periodo: PeriodoSnapshot) =>
  `dashboard:${periodo.dataInicioIso || 'sem-inicio'}:${periodo.dataFimIso || 'sem-fim'}`;

const buildAssinatura = (value: unknown) => JSON.stringify(value);

const toJsonInput = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined ? undefined : (JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue);

export async function sincronizarLogisticaSnapshot(options: {
  username: string;
  password: string;
  dataInicioIso?: string | null;
  dataFimIso?: string | null;
  limit?: number;
  maxDetalhes?: number;
  timeoutMs?: number;
}) {
  const dataInicio = options.dataInicioIso ? parsePedidoDate(`${options.dataInicioIso}T00:00:00`) : null;
  const dataFim = options.dataFimIso ? parsePedidoDate(`${options.dataFimIso}T00:00:00`) : null;
  const periodo: PeriodoSnapshot = {
    dataInicio,
    dataFim,
    dataInicioIso: options.dataInicioIso || null,
    dataFimIso: options.dataFimIso || null,
  };
  const maxDetalhes = Math.min(Math.max(options.maxDetalhes ?? 30, 0), 100);
  // A API Santri pode levar mais de 10s para montar as consultas consolidadas.
  // Mantemos um limite finito para a funcao serverless, mas evitamos falsos
  // indisponiveis antes que a API consiga responder.
  const timeoutMs = options.timeoutMs || 30_000;
  const syncKey = getSnapshotSyncKey(periodo);

  let totalComErro = 0;

  try {
    const [dashboardExterno, controles] = await Promise.all([
      apiExternaService.listarDashboardLogistica(
        {
          empresa_id: 1,
          data_inicio: options.dataInicioIso || undefined,
          data_fim: options.dataFimIso || undefined,
        },
        options.username,
        options.password,
        timeoutMs
      ),
      getControleInfoPorNotasLocais(periodo),
    ]);

    // A rota consolidada ja traz os pedidos operacionais. A rota /pedidos
    // rejeita filtros de data na API atual e nao deve bloquear o cron.
    const pedidosComTipo: Record<string, unknown>[] = [];

    const entradas = [
      ...((dashboardExterno?.data || []) as Record<string, unknown>[]).map((item) => ({
        ...item,
        __origemDashboardLogistica: true,
      })),
      ...((pedidosComTipo || []) as Record<string, unknown>[]),
    ].filter((item, index, entries) => {
      const pedidoId = getPedidoId(item);
      return Boolean(pedidoId) && entries.findIndex((candidate) => getPedidoId(candidate) === pedidoId) === index;
    });

    if (!dashboardExterno && pedidosComTipo.length === 0) {
      throw new Error('API externa retornou indisponibilidade nas consultas de dashboard e pedidos');
    }

    const tipoEntregaPorPedido = new Map<number, string>();
    for (const pedido of pedidosComTipo || []) {
      const pedidoId = getPedidoId(pedido);
      const tipoEntrega = getTipoEntregaPrincipal(pedido, null);
      if (pedidoId && tipoEntrega) tipoEntregaPorPedido.set(pedidoId, tipoEntrega);
    }

    let detalhesUsados = 0;
    const snapshots = await mapWithConcurrency(entradas, 5, async (entry) => {
      const pedidoId = getPedidoId(entry);
      if (!pedidoId) return null;

      let pedido = entry;
      let logistica = ((pedido.logistica as Record<string, any> | undefined) || {}) as Record<string, any>;
      const tipoEntregaLista = tipoEntregaPorPedido.get(pedidoId);
      const statusLogisticoInicial = ((pedido.status_logistico || {}) as Record<string, unknown>) || {};
      const statusInicial = deriveDashboardStatus(pedido, statusLogisticoInicial, logistica);
      const referenciaInicial = getNotaReferencia(pedido, logistica);
      const precisaDetalhe =
        (!getTipoEntregaPrincipal(pedido, logistica) && !tipoEntregaLista) ||
        (hasResumoPendenciaNoPedido(pedido) && !isPedidoSomenteComSeparacaoAberta(pedido)) ||
        (
          statusInicial === 'PEDIDO_EMBARCADO' &&
          !referenciaInicial.numeroNota &&
          referenciaInicial.chave.length !== 44
        );

      if (precisaDetalhe && detalhesUsados < maxDetalhes) {
        detalhesUsados += 1;
        const detalhe = await apiExternaService.buscarPedidoLogistica(pedidoId, options.username, options.password, 4_000);
        if (detalhe) logistica = { ...logistica, ...detalhe };
        else totalComErro += 1;
      }

      if (tipoEntregaLista) {
        pedido = { ...pedido, tipo_entrega: tipoEntregaLista, TIPO_ENTREGA: tipoEntregaLista };
      }

      if (!isPedidoPermitidoNoDashboard(pedido, logistica, pedido.__origemDashboardLogistica === true)) return null;

      const statusLogistico = ((pedido.status_logistico || {}) as Record<string, unknown>) || {};
      const statusCodigoBase = deriveDashboardStatus(pedido, statusLogistico, logistica);
      if (!statusCodigoBase) return null;

      const possuiPendencia = isPedidoComPendencias(pedido, logistica);
      const statusCodigo =
        statusCodigoBase === 'PEDIDO_SEPARADO' &&
        possuiPendencia &&
        hasStatusSeparacao(pedido, 'G') &&
        hasStatusSeparacao(pedido, 'E')
          ? 'PEDIDO_EMBARCADO'
          : statusCodigoBase;
      const produtosPendentes = possuiPendencia ? getProdutosPendentes(logistica) : [];
      const referenciaNota = getNotaReferencia(pedido, logistica);
      const controleInfo =
        (referenciaNota.chave.length === 44 ? controles.porChave.get(referenciaNota.chave) : null) ||
        (referenciaNota.numeroNota ? controles.porNumero.get(normalizeNumeroNota(referenciaNota.numeroNota)) : null) ||
        null;
      const dataHoraRecebimento = parsePedidoDate(
        pedido.data_hora_recebimento ?? pedido.DATA_HORA_RECEBIMENTO ?? pedido.DATA_RECEBIMENTO
      );
      const previsaoEntrega = parsePedidoDate(
        pedido.previsao_entrega ?? pedido.DATA_ENTREGA ?? logistica?.pedido?.DATA_ENTREGA
      );
      const dataHoraConfirmacao = parsePedidoDate(statusLogistico.data_hora_confirmacao);
      const totalItensPendentes =
        produtosPendentes.length > 0
          ? produtosPendentes.reduce((acc, produto) => acc + produto.quantidade, 0)
          : toNumber(pedido.total_itens_pendentes) || 0;
      const assinatura = buildAssinatura({
        pedidoId,
        tipoEntrega: getTipoEntregaPrincipal(pedido, logistica),
        statusCodigo,
        statusSeparacoes: pedido.status_separacoes,
        ultimoStatus: pedido.ultimo_status_separacao,
        entregaConfirmada: pedido.entrega_confirmada,
        possuiPendencia,
        totalItensPendentes,
        produtosPendentes,
        numeroNota: referenciaNota.numeroNota,
        chave: referenciaNota.chave,
        controleInfo,
      });

      return {
        pedidoId,
        tipoEntrega: getTipoEntregaPrincipal(pedido, logistica),
        clienteNome: toStringValue(pedido.cliente_nome) || toStringValue(pedido.NOME_RAZAO_SOCIAL),
        nomeFantasia: toStringValue(pedido.nome_fantasia) || toStringValue(pedido.NOME_FANTASIA),
        valorPedido: toNumber(pedido.valor_pedido ?? pedido.VALOR_PEDIDO),
        dataHoraRecebimento,
        dataRecebimentoDia: dateOnly(dataHoraRecebimento),
        previsaoEntrega,
        localNome: controleInfo
          ? `Controle ${controleInfo.numeroManifesto || ''}`.trim()
          : toStringValue(pedido.local_nome),
        statusCodigo,
        statusSeparacao: STATUS_META[statusCodigo].statusSeparacao,
        statusLogisticoCodigo: toStringValue(statusLogistico.codigo),
        situacaoAtual: STATUS_META[statusCodigo].titulo,
        usuarioConfirmacaoNome: toStringValue(statusLogistico.usuario_confirmacao_nome),
        dataHoraConfirmacao,
        numeroNota: referenciaNota.numeroNota,
        chaveNfe: referenciaNota.chave || null,
        embarcadoNoControle: Boolean(controleInfo),
        numeroManifesto: controleInfo?.numeroManifesto || null,
        transportadoraNome: controleInfo?.transportadoraNome || null,
        dataHoraControle: controleInfo?.dataHoraControle || null,
        possuiPendencia,
        totalItensPendentes,
        produtosPendentes,
        assinatura,
        rawPedido: pedido,
        rawLogistica: logistica,
      };
    });

    const validos = snapshots.filter((snapshot): snapshot is NonNullable<typeof snapshot> => Boolean(snapshot));
    const existentes = await (prisma as any).pedidoLogisticaSnapshot.findMany({
      where: { pedidoId: { in: validos.map((snapshot) => snapshot.pedidoId) } },
      select: { pedidoId: true, assinatura: true },
    });
    const assinaturaExistente = new Map<number, string>(
      existentes.map((item: { pedidoId: number; assinatura: string }) => [item.pedidoId, item.assinatura])
    );
    const alterados = validos.filter((snapshot) => assinaturaExistente.get(snapshot.pedidoId) !== snapshot.assinatura);

    for (const snapshot of alterados) {
      await (prisma as any).pedidoLogisticaSnapshot.upsert({
        where: { pedidoId: snapshot.pedidoId },
        create: {
          ...snapshot,
          produtosPendentes: toJsonInput(snapshot.produtosPendentes),
          rawPedido: toJsonInput(snapshot.rawPedido),
          rawLogistica: toJsonInput(snapshot.rawLogistica),
        },
        update: {
          ...snapshot,
          produtosPendentes: toJsonInput(snapshot.produtosPendentes),
          rawPedido: toJsonInput(snapshot.rawPedido),
          rawLogistica: toJsonInput(snapshot.rawLogistica),
        },
      });
    }

    await (prisma as any).sincronizacaoLogistica.upsert({
      where: { chave: syncKey },
      create: {
        chave: syncKey,
        dataInicio,
        dataFim,
        totalLidos: entradas.length,
        totalAtualizados: alterados.length,
        totalComErro,
        ultimoErro: null,
      },
      update: {
        dataInicio,
        dataFim,
        totalLidos: entradas.length,
        totalAtualizados: alterados.length,
        totalComErro,
        ultimoErro: null,
      },
    });

    return {
      ok: true,
      chave: syncKey,
      totalLidos: entradas.length,
      totalValidos: validos.length,
      totalAtualizados: alterados.length,
      totalComErro,
      detalhesUsados,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    await (prisma as any).sincronizacaoLogistica.upsert({
      where: { chave: syncKey },
      create: {
        chave: syncKey,
        dataInicio,
        dataFim,
        totalComErro: 1,
        ultimoErro: message,
      },
      update: {
        dataInicio,
        dataFim,
        totalComErro: { increment: 1 },
        ultimoErro: message,
      },
    });
    throw error;
  }
}

export async function montarDashboardPorSnapshot(
  periodo: PeriodoSnapshot,
  options: { exigirSincronizacaoRecenteMs?: number; warning?: string } = {}
) {
  const syncKey = getSnapshotSyncKey(periodo);
  let snapshots: any[] = [];

  try {
    const sync = await (prisma as any).sincronizacaoLogistica.findUnique({ where: { chave: syncKey } });

    if (options.exigirSincronizacaoRecenteMs && sync?.ultimaSincronizacao) {
      const idade = Date.now() - new Date(sync.ultimaSincronizacao).getTime();
      if (idade > options.exigirSincronizacaoRecenteMs) return null;
    } else if (options.exigirSincronizacaoRecenteMs && !sync) {
      return null;
    }

    const dataFimLimite = periodo.dataFim
      ? new Date(periodo.dataFim.getFullYear(), periodo.dataFim.getMonth(), periodo.dataFim.getDate(), 23, 59, 59, 999)
      : null;
    snapshots = await (prisma as any).pedidoLogisticaSnapshot.findMany({
      where: {
        ...(periodo.dataInicio || dataFimLimite
          ? {
              dataRecebimentoDia: {
                ...(periodo.dataInicio ? { gte: periodo.dataInicio } : {}),
                ...(dataFimLimite ? { lte: dataFimLimite } : {}),
              },
            }
          : {}),
      },
      orderBy: { pedidoId: 'desc' },
      take: 1500,
    });
  } catch (error: any) {
    if (error?.code === 'P2021' || String(error?.message || '').includes('does not exist')) {
      return null;
    }
    throw error;
  }

  if (!snapshots.length) return null;

  const entries: { statusCodigo: StatusCode; item: DashboardPedidoItem }[] = [];

  for (const snapshot of snapshots) {
    const statusBase = STATUS_ORDER.includes(snapshot.statusCodigo as StatusCode)
      ? (snapshot.statusCodigo as StatusCode)
      : null;
    if (!statusBase) continue;

    const produtosPendentes = Array.isArray(snapshot.produtosPendentes)
      ? snapshot.produtosPendentes
      : [];
    const itemBase: DashboardPedidoItem = {
      pedidoId: snapshot.pedidoId,
      tipoEntrega: snapshot.tipoEntrega,
      clienteNome: snapshot.clienteNome || 'Cliente nao informado',
      nomeFantasia: snapshot.nomeFantasia,
      valorPedido: snapshot.valorPedido,
      dataHoraRecebimento: toIso(snapshot.dataHoraRecebimento),
      previsaoEntrega: toIso(snapshot.previsaoEntrega),
      localNome: snapshot.embarcadoNoControle && snapshot.numeroManifesto
        ? `Controle ${snapshot.numeroManifesto}`
        : snapshot.localNome,
      statusCodigo: statusBase,
      statusDescricao: STATUS_META[statusBase].titulo,
      statusSeparacao: snapshot.statusSeparacao,
      situacaoAtual: snapshot.situacaoAtual || STATUS_META[statusBase].titulo,
      usuarioConfirmacaoNome: snapshot.usuarioConfirmacaoNome,
      dataHoraConfirmacao: toIso(snapshot.dataHoraConfirmacao),
      dataHoraControle: toIso(snapshot.dataHoraControle),
      transportadoraNome: snapshot.transportadoraNome,
      possuiProdutosFaltando: Boolean(snapshot.possuiPendencia || snapshot.totalItensPendentes > 0),
      totalItensPendentes: snapshot.totalItensPendentes || 0,
      produtosPendentes,
    };

    if (snapshot.embarcadoNoControle) {
      entries.push({
        statusCodigo: 'PEDIDOS_EMBARCADOS',
        item: {
          ...itemBase,
          statusCodigo: 'PEDIDOS_EMBARCADOS',
          statusDescricao: STATUS_META.PEDIDOS_EMBARCADOS.titulo,
          statusSeparacao: STATUS_META.PEDIDOS_EMBARCADOS.statusSeparacao,
          situacaoAtual: STATUS_META.PEDIDOS_EMBARCADOS.titulo,
        },
      });
    } else {
      entries.push({ statusCodigo: statusBase, item: itemBase });
    }

    if (snapshot.possuiPendencia) {
      entries.push({
        statusCodigo: 'PENDENCIAS',
        item: {
          ...itemBase,
          statusCodigo: 'PENDENCIAS',
          statusDescricao: STATUS_META.PENDENCIAS.titulo,
          statusSeparacao: STATUS_META.PENDENCIAS.statusSeparacao,
          situacaoAtual: STATUS_META.PENDENCIAS.titulo,
        },
      });
    }

    const alertaStatus = isPedidoParaAlerta(snapshot.dataHoraRecebimento)
      ? deriveAlertaStatus(statusBase, Boolean(snapshot.possuiPendencia), Boolean(snapshot.embarcadoNoControle))
      : null;
    if (alertaStatus) {
      entries.push({
        statusCodigo: alertaStatus,
        item: {
          ...itemBase,
          statusCodigo: alertaStatus,
          statusDescricao: STATUS_META[alertaStatus].titulo,
          statusSeparacao: STATUS_META[alertaStatus].statusSeparacao,
        },
      });
    }
  }

  const indicadores = STATUS_ORDER.map((statusCode) => {
    const pedidos = entries
      .filter((entry) => entry.statusCodigo === statusCode)
      .map((entry) => entry.item)
      .sort((a, b) => b.pedidoId - a.pedidoId);

    return {
      ...STATUS_META[statusCode],
      total: pedidos.length,
      pedidos,
    };
  });

  const totalPedidos = indicadores.reduce((acc, item) => acc + item.total, 0);
  const totalEmbarcados = indicadores.find((item) => item.codigo === 'PEDIDOS_EMBARCADOS')?.total || 0;
  const totalPendencias = indicadores.find((item) => item.codigo === 'PENDENCIAS')?.total || 0;

  return {
    generatedAt: new Date().toISOString(),
    filtros: {
      localProduto: 'Pedidos recebidos no caixa - Snapshot local',
      dataInicio: periodo.dataInicioIso || null,
      dataFim: periodo.dataFimIso || '2050-12-31',
    },
    resumo: {
      totalPedidos,
      totalEmbarcados,
      totalPendentes: totalPedidos - totalEmbarcados,
      totalPendencias,
    },
    indicadores,
    cached: true,
    stale: Boolean(options.warning),
    warning: options.warning,
  };
}
