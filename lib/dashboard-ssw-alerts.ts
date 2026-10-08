const SSW_DELIVERY_ALERT_CODES = new Set([
  'ALERTAS_NAO_EMBARCADOS',
  'ALERTAS_NAO_ENTREGUES',
]);

export function removerPedidosEntreguesPelaSsw<
  T extends { codigo: string; total: number; pedidos: Array<{ pedidoId: number }> }
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
