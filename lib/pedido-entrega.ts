import prisma from '@/lib/prisma';
import { fetchMergedTracking } from '@/services/sswTracking';

type PedidoParaConsultaEntrega = {
  pedidoId: number;
  chaveNfe?: string | null;
  numeroNota?: string | null;
  transportadoraNome?: string | null;
};

const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const MAX_CONSULTAS_POR_EXECUCAO = 100;
const INTERVALO_RECONSULTA_MINUTOS = 60;
const INTERVALO_RETRY_MINUTOS = 15;

export function pedidoFoiEmbarcadoHoje(
  valores: Array<Date | string | null | undefined> | Date | string | null | undefined,
  hoje: Date = new Date()
): boolean {
  const candidatos = Array.isArray(valores) ? valores : [valores];
  const formatDate = (data: Date) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(data);

  return candidatos.some((valor) => {
    if (valor === null || valor === undefined || valor === '') return false;
    const data = valor instanceof Date ? valor : new Date(String(valor));
    if (Number.isNaN(data.getTime())) return false;
    return formatDate(data) === formatDate(hoje);
  });
}

export function calcularStatusPrazoEntrega(input: {
  previsaoEntrega?: string | Date | null;
  dataHoraControle?: string | Date | null;
  transportadoraNome?: string | null;
}): {
  foraDoPrazo: boolean;
  diasAtraso: number | null;
  statusPrazoDescricao: string | null;
} {
  const base = input.previsaoEntrega ?? input.dataHoraControle;
  if (!base) {
    return {
      foraDoPrazo: false,
      diasAtraso: null,
      statusPrazoDescricao: 'Sem prazo informado',
    };
  }

  const dataReferencia = base instanceof Date ? base : new Date(String(base));
  if (Number.isNaN(dataReferencia.getTime())) {
    return {
      foraDoPrazo: false,
      diasAtraso: null,
      statusPrazoDescricao: 'Prazo invalido',
    };
  }

  const hoje = new Date();
  const diffMs = hoje.getTime() - dataReferencia.getTime();
  const diasAtraso = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const foraDoPrazo = dataReferencia.getTime() < hoje.getTime();

  return {
    foraDoPrazo,
    diasAtraso: foraDoPrazo ? diasAtraso : 0,
    statusPrazoDescricao: foraDoPrazo
      ? `Atrasado há ${diasAtraso} dia${diasAtraso === 1 ? '' : 's'}`
      : 'Dentro do prazo',
  };
}

export async function buscarPedidosNaoEntregues(
  pedidos: PedidoParaConsultaEntrega[]
): Promise<Set<number>> {
  const validos = pedidos.filter((pedido) => pedido.pedidoId && (pedido.chaveNfe || pedido.numeroNota));
  if (!validos.length) return new Set();

  const resultados = await Promise.all(
    validos.map(async (pedido) => {
      const chave = onlyDigits(pedido.chaveNfe);
      try {
        const tracking = chave.length === 44
          ? await fetchMergedTracking({
              chave,
              numeroNota: pedido.numeroNota,
              transportadora: pedido.transportadoraNome,
            })
          : { delivered: false, found: false };

        return tracking.delivered ? null : pedido.pedidoId;
      } catch {
        return pedido.pedidoId;
      }
    })
  );

  return new Set(resultados.filter((pedidoId): pedidoId is number => pedidoId !== null));
}

export async function buscarPedidosEntregues(
  pedidos: PedidoParaConsultaEntrega[]
): Promise<Set<number>> {
  const resultados = await Promise.all(
    pedidos
      .filter((pedido) => onlyDigits(pedido.chaveNfe).length === 44)
      .map(async (pedido) => {
        try {
          const tracking = await fetchMergedTracking({
            chave: onlyDigits(pedido.chaveNfe),
            numeroNota: pedido.numeroNota,
            transportadora: pedido.transportadoraNome,
          });
          return tracking.delivered ? pedido.pedidoId : null;
        } catch {
          return null;
        }
      })
  );

  return new Set(resultados.filter((pedidoId): pedidoId is number => pedidoId !== null));
}

export async function buscarEntregasSswPorPedido(
  pedidos: PedidoParaConsultaEntrega[]
): Promise<Map<number, { delivered: boolean; found: boolean; status: string | null; message: string | null }>> {
  const mapa = new Map<number, { delivered: boolean; found: boolean; status: string | null; message: string | null }>();

  await Promise.all(
    pedidos.map(async (pedido) => {
      const chave = onlyDigits(pedido.chaveNfe);
      try {
        const tracking = chave.length === 44
          ? await fetchMergedTracking({
              chave,
              numeroNota: pedido.numeroNota,
              transportadora: pedido.transportadoraNome,
            })
          : { delivered: false, found: false, status: null, message: null };

        mapa.set(pedido.pedidoId, {
          delivered: Boolean(tracking.delivered),
          found: Boolean(tracking.found),
          status: tracking.status || null,
          message: tracking.message || null,
        });
      } catch {
        mapa.set(pedido.pedidoId, {
          delivered: false,
          found: false,
          status: null,
          message: 'Erro ao consultar SSW',
        });
      }
    })
  );

  return mapa;
}

export async function sincronizarCacheSituacoesEntrega(
  pedidos: PedidoParaConsultaEntrega[],
  agora: Date = new Date(),
  concorrencia = 20
) {
  const pedidosPorChave = new Map<string, PedidoParaConsultaEntrega>();
  for (const pedido of pedidos) {
    const chaveNfe = onlyDigits(pedido.chaveNfe);
    if (chaveNfe.length !== 44 || !Number.isFinite(pedido.pedidoId)) continue;
    if (!pedidosPorChave.has(chaveNfe)) {
      pedidosPorChave.set(chaveNfe, { ...pedido, chaveNfe });
    }
  }

  const candidatos = Array.from(pedidosPorChave.values());
  if (!candidatos.length) {
    return { consultados: 0, entregues: 0, pendentes: 0, falhas: 0, ignorados: pedidos.length, restantes: 0 };
  }

  const existentes = await prisma.sswEntregaConsulta.findMany({
    where: { chaveNfe: { in: candidatos.map((pedido) => pedido.chaveNfe!) } },
    select: { chaveNfe: true, entregue: true, proximaConsultaEm: true },
  });
  const cachePorChave = new Map(existentes.map((registro) => [registro.chaveNfe, registro]));
  const ignoradosPorCache = candidatos.filter((pedido) => {
    const registro = cachePorChave.get(pedido.chaveNfe!);
    return registro?.entregue || Boolean(registro?.proximaConsultaEm && registro.proximaConsultaEm > agora);
  }).length;
  const vencidos = candidatos.filter((pedido) => {
    const registro = cachePorChave.get(pedido.chaveNfe!);
    return !registro?.entregue && (!registro?.proximaConsultaEm || registro.proximaConsultaEm <= agora);
  });
  const lote = vencidos.slice(0, MAX_CONSULTAS_POR_EXECUCAO);

  let entregues = 0;
  let pendentes = 0;
  let falhas = 0;
  let proximo = 0;
  const limiteConcorrencia = Math.max(1, Math.min(20, Math.floor(concorrencia) || 1));

  const worker = async () => {
    while (proximo < lote.length) {
      const pedido = lote[proximo++];
      const chaveNfe = pedido.chaveNfe!;

      try {
        const tracking = await fetchMergedTracking({
          chave: chaveNfe,
          numeroNota: pedido.numeroNota,
          transportadora: pedido.transportadoraNome,
        });
        const entregue = Boolean(tracking.delivered);
        await prisma.sswEntregaConsulta.upsert({
          where: { chaveNfe },
          create: {
            chaveNfe,
            pedidoId: pedido.pedidoId,
            numeroNota: pedido.numeroNota || null,
            transportadoraNome: pedido.transportadoraNome || null,
            situacao: tracking.status || tracking.message || 'SEM_SITUACAO',
            entregue,
            sswStatus: tracking.status,
            dataEntrega: tracking.deliveredAt,
            consultadoEm: agora,
            proximaConsultaEm: entregue
              ? null
              : new Date(agora.getTime() + INTERVALO_RECONSULTA_MINUTOS * 60_000),
          },
          update: {
            pedidoId: pedido.pedidoId,
            numeroNota: pedido.numeroNota || null,
            transportadoraNome: pedido.transportadoraNome || null,
            situacao: tracking.status || tracking.message || 'SEM_SITUACAO',
            entregue,
            sswStatus: tracking.status,
            dataEntrega: tracking.deliveredAt,
            consultadoEm: agora,
            proximaConsultaEm: entregue
              ? null
              : new Date(agora.getTime() + INTERVALO_RECONSULTA_MINUTOS * 60_000),
          },
        });
        if (entregue) entregues += 1;
        else pendentes += 1;
      } catch (error) {
        falhas += 1;
        const mensagem = error instanceof Error ? error.message.slice(0, 500) : 'ERRO_CONSULTA';
        await prisma.sswEntregaConsulta.upsert({
          where: { chaveNfe },
          create: {
            chaveNfe,
            pedidoId: pedido.pedidoId,
            numeroNota: pedido.numeroNota || null,
            transportadoraNome: pedido.transportadoraNome || null,
            situacao: mensagem || 'ERRO_CONSULTA',
            entregue: false,
            consultadoEm: agora,
            proximaConsultaEm: new Date(agora.getTime() + INTERVALO_RETRY_MINUTOS * 60_000),
          },
          update: {
            pedidoId: pedido.pedidoId,
            numeroNota: pedido.numeroNota || null,
            transportadoraNome: pedido.transportadoraNome || null,
            situacao: mensagem || 'ERRO_CONSULTA',
            entregue: false,
            consultadoEm: agora,
            proximaConsultaEm: new Date(agora.getTime() + INTERVALO_RETRY_MINUTOS * 60_000),
          },
        });
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(limiteConcorrencia, lote.length) }, () => worker()));

  return {
    consultados: lote.length,
    entregues,
    pendentes,
    falhas,
    ignorados: pedidos.length - vencidos.length + (vencidos.length - lote.length),
    restantes: Math.max(0, vencidos.length - lote.length),
    ignoradosPorCache,
  };
}