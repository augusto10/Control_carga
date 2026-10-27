import prisma from '@/lib/prisma';
import { apiExternaService } from '@/services/api-externa';
import { buscarLogisticaAtual } from '@/lib/pedido-logistica-atual';
import { getPedidosDashboard } from '@/lib/dashboard-external-cache';
// Mesma regra de pendência usada pelo card do dashboard
// (pages/api/dashboard/logistica-inicial) — não a versão mais restrita do
// snapshot, para que a fila exclua exatamente o que o card PENDÊNCIAS mostra.
import { isPedidoComPendencias } from '@/pages/api/dashboard/logistica-inicial';
import {
  deriveDashboardStatus,
  getPedidoId,
  getTipoEntregaPrincipal,
  isPedidoPermitidoNoDashboard,
  montarDashboardPorSnapshot,
  normalizarPedidoConsolidado,
  parsePedidoDate,
  toNumber,
  toStringValue,
} from '@/lib/logistica-snapshot';

/**
 * Fila de separação de pedidos.
 *
 * Regra negocial (mesma pipeline do card "PEDIDOS NOVOS AGUARDANDO
 * SEPARAÇÃO" em pages/api/dashboard/logistica-inicial):
 * - Fonte: API Santri ao vivo (dashboard-logistica consolidado + /pedidos
 *   via getPedidosDashboard, paginado/cacheado como o dashboard). O
 *   snapshot local NÃO é usado porque só atualiza via cron.
 * - Tipo de entrega: mesmo filtro do card — ENT/EPG, retirada barrada e
 *   tipo ausente permitido (complementado pelo detalhe /logistica).
 * - Pedidos já associados (Pedidos.status = 'EM_SEPARACAO') saem da fila,
 *   assim como pedidos com pendência (vão para o card PENDÊNCIAS).
 * - Ordenação por ordem de recebimento (dataHoraRecebimento ASC), exceto
 *   região restrita (Cristalina, Luziânia, Santo Antônio — cidade de
 *   entrega; localNome é o estoque e não serve para isso):
 *   recebido em terça/quinta -> início da fila; demais dias -> fim da fila.
 * - cidade/uf/bairro vêm do consolidado ou do detalhe do pedido na API
 *   externa, com cache em memória porque o endereço não muda.
 */

const REGIOES_RESTRITAS = ['cristalina', 'luziania', 'santo antonio'];
const DIAS_CARREGAMENTO_RESTRITO = new Set([2, 4]); // terça e quinta (getDay)

export type PedidoFilaSeparacao = {
  pedidoId: number;
  clienteNome: string | null;
  nomeFantasia: string | null;
  localNome: string | null;
  cidade?: string | null;
  uf?: string | null;
  valorPedido: number | null;
  dataHoraRecebimento: Date | null;
  previsaoEntrega: Date | null;
  regiaoRestrita: boolean;
  prioridade: boolean; // região restrita recebida em dia de carregamento
};

export function normalizeRegiao(value: string | null | undefined): string {
  return (value || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function isRegiaoRestrita(
  cidade: string | null | undefined,
  localNome?: string | null
): boolean {
  const candidatos = [cidade, localNome];
  for (const candidato of candidatos) {
    const local = normalizeRegiao(candidato);
    if (local && REGIOES_RESTRITAS.some((regiao) => local.includes(regiao))) return true;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Enriquecimento de endereço via API externa (cidade/UF não existem no snapshot)
// ---------------------------------------------------------------------------

type EnderecoPedido = { cidade: string | null; uf: string | null };

const ENDERECO_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // endereço de entrega não muda
const enderecoCache = new Map<number, { expira: number; dados: EnderecoPedido }>();

const pickString = (...valores: unknown[]): string | null => {
  for (const valor of valores) {
    const texto = String(valor ?? '').trim();
    if (texto) return texto;
  }
  return null;
};

// Tenta extrair cidade/UF do próprio consolidado antes de chamar o detalhe.
function extrairEnderecoConsolidado(
  pedido: Record<string, unknown>,
  logistica: Record<string, unknown> | null
): EnderecoPedido {
  const pedidoLogistica = (logistica?.pedido || {}) as Record<string, unknown>;
  const notaLogistica = Array.isArray(logistica?.notas_fiscais)
    ? (logistica.notas_fiscais[0] as Record<string, unknown>) || {}
    : {};

  return {
    cidade: pickString(
      pedido.CIDADE_ENTREGA_NOME,
      pedido.NOME_CIDADE,
      pedido.CIDADE,
      pedido.cidade,
      pedidoLogistica.CIDADE_ENTREGA_NOME,
      pedidoLogistica.CIDADE_CADASTRO_NOME,
      notaLogistica.NOME_CIDADE
    ),
    uf: pickString(
      pedido.UF_ENTREGA,
      pedido.ESTADO_DESTINO,
      pedido.UF,
      pedido.uf,
      pedidoLogistica.UF_ENTREGA,
      pedidoLogistica.UF_CADASTRO,
      notaLogistica.ESTADO_DESTINO
    ),
  };
}

async function buscarEnderecoPedido(
  pedidoId: number,
  username: string,
  password: string
): Promise<EnderecoPedido> {
  try {
    const [detalhe, logistica] = await Promise.all([
      apiExternaService.buscarPedidoPorId(String(pedidoId), username, password),
      buscarLogisticaAtual(pedidoId, username, password),
    ]);
    const dados = ((detalhe as Record<string, unknown> | null)?.pedido ||
      (detalhe as Record<string, unknown> | null)?.data ||
      detalhe ||
      {}) as Record<string, unknown>;
    const pedidoLogistica = (logistica?.pedido || {}) as Record<string, unknown>;
    const notaLogistica = Array.isArray(logistica?.notas_fiscais)
      ? (logistica.notas_fiscais[0] as Record<string, unknown>) || {}
      : {};

    return {
      cidade: pickString(
        dados.CIDADE_ENTREGA_NOME,
        dados.NOME_CIDADE,
        dados.CIDADE,
        dados.cidade,
        pedidoLogistica.CIDADE_ENTREGA_NOME,
        pedidoLogistica.CIDADE_CADASTRO_NOME,
        notaLogistica.NOME_CIDADE
      ),
      uf: pickString(
        dados.UF_ENTREGA,
        dados.ESTADO_DESTINO,
        dados.UF,
        dados.uf,
        pedidoLogistica.UF_ENTREGA,
        pedidoLogistica.UF_CADASTRO,
        notaLogistica.ESTADO_DESTINO
      ),
    };
  } catch {
    return { cidade: null, uf: null };
  }
}

async function enriquecerEnderecos(
  pedidoIds: number[],
  username: string,
  password: string
): Promise<Map<number, EnderecoPedido>> {
  const resultado = new Map<number, EnderecoPedido>();
  const agora = Date.now();
  const pendentes = pedidoIds.filter((id) => {
    const salvo = enderecoCache.get(id);
    if (salvo && salvo.expira > agora) {
      resultado.set(id, salvo.dados);
      return false;
    }
    return true;
  });

  const CONCORRENCIA = 6;
  for (let i = 0; i < pendentes.length; i += CONCORRENCIA) {
    const lote = pendentes.slice(i, i + CONCORRENCIA);
    const dados = await Promise.all(
      lote.map((id) => buscarEnderecoPedido(id, username, password))
    );
    lote.forEach((id, index) => {
      resultado.set(id, dados[index]);
      enderecoCache.set(id, { expira: agora + ENDERECO_CACHE_TTL_MS, dados: dados[index] });
    });
  }

  return resultado;
}

function recebidoEmDiaDeCarregamento(dataHoraRecebimento: Date | null): boolean {
  if (!dataHoraRecebimento) return false;
  return DIAS_CARREGAMENTO_RESTRITO.has(dataHoraRecebimento.getDay());
}

function grupoFila(pedido: PedidoFilaSeparacao): number {
  if (pedido.regiaoRestrita) {
    return recebidoEmDiaDeCarregamento(pedido.dataHoraRecebimento) ? 0 : 2;
  }
  return 1;
}

function timestampRecebimento(data: Date | null): number {
  return data ? data.getTime() : Number.MAX_SAFE_INTEGER;
}

/**
 * Ordenação pura da fila (A: restrita ter/qui -> B: normal -> C: restrita
 * outros dias), desempate por ordem de recebimento.
 */
export function ordenarFilaSeparacao(
  pedidos: PedidoFilaSeparacao[]
): PedidoFilaSeparacao[] {
  return [...pedidos].sort((a, b) => {
    const grupoDiff = grupoFila(a) - grupoFila(b);
    if (grupoDiff !== 0) return grupoDiff;
    return timestampRecebimento(a.dataHoraRecebimento) - timestampRecebimento(b.dataHoraRecebimento);
  });
}

const isoDia = (data: Date) =>
  `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;

/**
 * Calcula a fila global de separação consultando a API Santri ao vivo:
 * pedidos novos aguardando separação (ultimo_status_separacao = 'A' /
 * SEM_LOGISTICA), sem pendência, permitidos para entrega e ainda não
 * associados a um separador.
 */
export async function calcularFilaSeparacao(options: {
  username: string;
  password: string;
}): Promise<PedidoFilaSeparacao[]> {
  // Janela da fila: pedidos recebidos nos últimos 3 dias (inclui hoje).
  // Atrasados de dias anteriores voltam a aparecer para separação.
  const hoje = new Date();
  const dataInicio = new Date(hoje);
  dataInicio.setDate(dataInicio.getDate() - 2);
  const dataInicioIso = isoDia(dataInicio);
  const dataFimIso = isoDia(hoje);

  const inicioJanela = new Date(dataInicio);
  inicioJanela.setHours(0, 0, 0, 0);
  const fimJanela = new Date(hoje);
  fimJanela.setHours(23, 59, 59, 999);

  const [dashboardSnapshot, associados] = await Promise.all([
    // Mesma fonte do card "PEDIDOS NOVOS AGUARDANDO SEPARAÇÃO" da página
    // inicial: o dashboard montado a partir do snapshot local.
    montarDashboardPorSnapshot({
      dataInicioIso,
      dataFimIso,
      dataInicio: inicioJanela,
      dataFim: fimJanela,
      cacheKey: `${dataInicioIso}:${dataFimIso}`,
    }).catch(() => null),
    prisma.pedidos.findMany({
      where: { status: 'EM_SEPARACAO' },
      select: { pedidoId: true },
    }),
  ]);
  const pedidosAssociados = new Set(associados.map((item) => item.pedidoId));

  if (dashboardSnapshot) {
    // Fila = exatamente o grupo PEDIDO_NOVO que o card exibe na página
    // inicial (mesmas regras de tipo, retirada, pendência e status).
    const grupoNovo = ((dashboardSnapshot.indicadores || []) as { codigo: string; pedidos: Record<string, any>[] }[])
      .find((grupo) => grupo.codigo === 'PEDIDO_NOVO');
    const itensNovo = grupoNovo?.pedidos || [];

    // Separação cancelada no ERP ('C') não volta para a fila — o status
    // armazenado no snapshot pode ainda estar como PEDIDO_NOVO.
    const idsNovo = itensNovo.map((item) => item.pedidoId).filter(Boolean);
    const rawsCancelamento = idsNovo.length
      ? await (prisma as any).pedidoLogisticaSnapshot.findMany({
          where: { pedidoId: { in: idsNovo } },
          select: { pedidoId: true, rawPedido: true },
        })
      : [];
    const cancelados = new Set<number>(
      rawsCancelamento
        .filter((row: any) =>
          String((row.rawPedido as Record<string, unknown> | undefined)?.ultimo_status_separacao ?? '')
            .trim()
            .toUpperCase() === 'C'
        )
        .map((row: any) => row.pedidoId)
    );

    const fila = itensNovo
      .filter(
        (item) =>
          item.pedidoId && !pedidosAssociados.has(item.pedidoId) && !cancelados.has(item.pedidoId)
      )
      .map((item) => {
        const dataHoraRecebimento = item.dataHoraRecebimento ? new Date(item.dataHoraRecebimento) : null;
        const regiaoRestrita = isRegiaoRestrita(item.cidade ?? null, item.localNome ?? null);
        return {
          pedidoId: item.pedidoId,
          clienteNome: item.clienteNome ?? null,
          nomeFantasia: item.nomeFantasia ?? null,
          localNome: item.localNome ?? null,
          cidade: item.cidade ?? null,
          uf: item.uf ?? null,
          valorPedido: item.valorPedido ?? null,
          dataHoraRecebimento,
          previsaoEntrega: item.previsaoEntrega ? new Date(item.previsaoEntrega) : null,
          regiaoRestrita,
          prioridade: regiaoRestrita && recebidoEmDiaDeCarregamento(dataHoraRecebimento),
        };
      });
    return ordenarFilaSeparacao(fila);
  }

  // Sem snapshot, replica ao vivo a mesma pipeline do card
  // (consolidado + /pedidos paginado via getPedidosDashboard).
  const [dashboardExterno, pedidosLista] = await Promise.all([
    apiExternaService.listarDashboardLogistica(
      { empresa_id: 1, data_inicio: dataInicioIso, data_fim: dataFimIso },
      options.username,
      options.password,
      30_000
    ),
    getPedidosDashboard(options.username, options.password, 500, 8_000, {
      data_inicio: dataInicioIso,
      data_fim: dataFimIso,
      tipo_data: 'recebimento',
    }),
  ]);

  if (!dashboardExterno) {
    throw new Error('API Santri indisponível para montar a fila de separação.');
  }

  const pedidosComTipo = (pedidosLista || []) as Record<string, unknown>[];

  const entradas: Record<string, unknown>[] = [
    ...((dashboardExterno.data || []) as Record<string, unknown>[]).map(normalizarPedidoConsolidado),
  ].filter((item, index, entries) => {
    const pedidoId = getPedidoId(item);
    return (
      Boolean(pedidoId) &&
      entries.findIndex((candidate) => getPedidoId(candidate) === pedidoId) === index
    );
  });

  const tipoEntregaPorPedido = new Map<number, string>();
  for (const pedido of pedidosComTipo) {
    const pedidoId = getPedidoId(pedido);
    const tipoEntrega = getTipoEntregaPrincipal(pedido, null);
    if (pedidoId && tipoEntrega) tipoEntregaPorPedido.set(pedidoId, tipoEntrega);
  }

  // Mesma guarda do dashboard: se o consolidado trouxe pedidos mas nenhum
  // casou com /pedidos, a fonte de tipos está quebrada — falha explícita
  // em vez de fila silenciosamente vazia.
  const dashboardPedidoIds = new Set(
    (dashboardExterno.data as Record<string, unknown>[])
      .map((item) => getPedidoId(item))
      .filter((pedidoId): pedidoId is number => Boolean(pedidoId))
  );
  const totalTiposCorrespondentes = Array.from(dashboardPedidoIds).filter((pedidoId) =>
    tipoEntregaPorPedido.has(pedidoId)
  ).length;
  if (dashboardPedidoIds.size > 0 && totalTiposCorrespondentes === 0) {
    throw new Error('tipos_pedidos_indisponiveis');
  }

  const candidatos: { pedidoId: number; pedido: Record<string, unknown>; logistica: Record<string, unknown> | null }[] = [];
  let consultasLogisticaDetalhada = 0;
  for (const entry of entradas) {
    let pedido = entry;
    const pedidoId = getPedidoId(pedido);
    if (!pedidoId || pedidosAssociados.has(pedidoId)) continue;

    let logistica = ((pedido.logistica as Record<string, unknown> | undefined) || null) as Record<string, unknown> | null;
    const tipoEntregaInicial = getTipoEntregaPrincipal(pedido, logistica);
    const tipoEntregaLista = tipoEntregaPorPedido.get(pedidoId);

    // Como no dashboard: sem tipo em nenhuma fonte, busca o detalhe
    // /logistica do pedido para decidir elegibilidade e pendências.
    if (!tipoEntregaInicial && !tipoEntregaLista && consultasLogisticaDetalhada < 40) {
      consultasLogisticaDetalhada += 1;
      const detalhe = await buscarLogisticaAtual(pedidoId, options.username, options.password).catch(() => null);
      if (detalhe) {
        logistica = { ...(logistica || {}), ...(detalhe as Record<string, unknown>) };
      }
    }

    if (tipoEntregaLista) {
      pedido = { ...pedido, tipo_entrega: tipoEntregaLista, TIPO_ENTREGA: tipoEntregaLista };
    }

    const possuiPendencia = isPedidoComPendencias(pedido, logistica);
    // Mesma regra do card: tipo ausente é permitido quando nenhuma fonte o
    // trouxe (o detalhe /logistica acima ainda pode revelar retirada).
    const permitirTipoAusente = !tipoEntregaLista && !tipoEntregaInicial;
    if (!isPedidoPermitidoNoDashboard(pedido, logistica, permitirTipoAusente) && !possuiPendencia) continue;
    if (possuiPendencia) continue; // pendências ficam no card próprio do dashboard

    // Separação cancelada não volta para a fila: o consolidado mantém
    // ultimo_status_separacao='C' e o status derivado cai em SEM_LOGISTICA
    // (PEDIDO_NOVO), reabrindo pedido que ninguém vai separar de novo.
    const ultimoStatus = toStringValue(pedido.ultimo_status_separacao)?.toUpperCase() || null;
    const statusSeparacoesCsv = (toStringValue(pedido.status_separacoes) || '').toUpperCase();
    const separacoesDetalhe = Array.isArray((logistica as Record<string, any> | null)?.separacoes)
      ? ((logistica as Record<string, any>).separacoes as Record<string, unknown>[])
      : [];
    const separacaoCancelada =
      ultimoStatus === 'C' ||
      statusSeparacoesCsv.split(',').map((s) => s.trim()).includes('C') ||
      separacoesDetalhe.some((s) => ['C', 'CANCELADA'].includes(String(s.STATUS ?? '').trim().toUpperCase()));
    if (separacaoCancelada) continue;

    const statusLogistico = ((pedido.status_logistico || {}) as Record<string, unknown>) || {};
    const previsaoEntrega = toStringValue(pedido.previsao_entrega);
    if (previsaoEntrega && previsaoEntrega.slice(0, 10) > '2050-12-31') continue;
    if (deriveDashboardStatus(pedido, statusLogistico, logistica) !== 'PEDIDO_NOVO') continue;

    candidatos.push({ pedidoId, pedido, logistica });
  }

  // cidade/UF: primeiro tenta o consolidado; completa com detalhe por pedido
  const enderecos = new Map<number, EnderecoPedido>();
  const faltando: number[] = [];
  for (const candidato of candidatos) {
    const endereco = extrairEnderecoConsolidado(candidato.pedido, candidato.logistica);
    if (endereco.cidade || endereco.uf) {
      enderecos.set(candidato.pedidoId, endereco);
    } else {
      faltando.push(candidato.pedidoId);
    }
  }
  if (faltando.length) {
    const consultados = await enriquecerEnderecos(faltando, options.username, options.password);
    consultados.forEach((endereco, pedidoId) => enderecos.set(pedidoId, endereco));
  }

  const fila = candidatos.map(({ pedidoId, pedido, logistica }) => {
    const endereco = enderecos.get(pedidoId);
    const localNome = toStringValue(pedido.local_nome);
    const regiaoRestrita = isRegiaoRestrita(endereco?.cidade, localNome);
    const dataHoraRecebimento = parsePedidoDate(
      pedido.data_hora_recebimento ?? pedido.DATA_HORA_RECEBIMENTO ?? pedido.DATA_RECEBIMENTO
    );
    return {
      pedidoId,
      clienteNome: toStringValue(pedido.cliente_nome) || toStringValue(pedido.NOME_RAZAO_SOCIAL),
      nomeFantasia: toStringValue(pedido.nome_fantasia) || toStringValue(pedido.NOME_FANTASIA),
      localNome,
      cidade: endereco?.cidade ?? null,
      uf: endereco?.uf ?? null,
      valorPedido: toNumber(pedido.valor_pedido ?? pedido.VALOR_PEDIDO),
      dataHoraRecebimento,
      previsaoEntrega: parsePedidoDate(
        pedido.previsao_entrega ?? pedido.DATA_ENTREGA ?? (logistica?.pedido as Record<string, unknown> | undefined)?.DATA_ENTREGA
      ),
      regiaoRestrita,
      prioridade: regiaoRestrita && recebidoEmDiaDeCarregamento(dataHoraRecebimento),
    };
  });

  return ordenarFilaSeparacao(fila);
}
