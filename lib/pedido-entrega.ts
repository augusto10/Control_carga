import { fetchMergedTracking } from '@/services/sswTracking';

type PedidoParaConsultaEntrega = {
  pedidoId: number;
  chaveNfe?: string | null;
  numeroNota?: string | null;
  transportadoraNome?: string | null;
};

const onlyDigits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

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