const SSW_DELIVERY_ALERT_CODES = new Set([
  'ALERTAS_NAO_EMBARCADOS',
  'ALERTAS_NAO_ENTREGUES',
]);
const SSW_SHIPMENT_ALERT_CODES = new Set(['ALERTAS_NAO_EMBARCADOS']);

type IndicadorComPedidos<TPedido extends { pedidoId: number }> = {
  codigo: string;
  total: number;
  pedidos: TPedido[];
};

export function removerPedidosEntreguesPelaSsw<
  T extends IndicadorComPedidos<{ pedidoId: number }>
>(indicadores: T[], pedidosEntregues: Set<number>): T[] {
  if (pedidosEntregues.size === 0) return indicadores;

  return indicadores.map((indicador) => {
    if (!SSW_DELIVERY_ALERT_CODES.has(indicador.codigo)) return indicador;
    const pedidos = indicador.pedidos.filter((pedido) => !pedidosEntregues.has(pedido.pedidoId));
    return pedidos.length === indicador.pedidos.length
      ? indicador
      : { ...indicador, pedidos, total: pedidos.length };
  });
}

export function removerPedidosEmbarcadosPelaSsw<
  T extends IndicadorComPedidos<{ pedidoId: number }>
>(indicadores: T[], pedidosEmbarcados: Set<number>): T[] {
  if (pedidosEmbarcados.size === 0) return indicadores;

  return indicadores.map((indicador) => {
    if (!SSW_SHIPMENT_ALERT_CODES.has(indicador.codigo)) return indicador;
    const pedidos = indicador.pedidos.filter((pedido) => !pedidosEmbarcados.has(pedido.pedidoId));
    return pedidos.length === indicador.pedidos.length
      ? indicador
      : { ...indicador, pedidos, total: pedidos.length };
  });
}
