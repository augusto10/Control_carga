import prisma from '@/lib/prisma';
import { fetchMergedTracking } from '@/services/sswTracking';

type PedidoParaConsultaEntrega = {
  pedidoId: number;
  chaveNfe?: string | null;
  numeroNota?: string | null;
  transportadoraNome?: string | null;
};

const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

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