const titulos: Record<string, string> = {
  PEDIDO_NOVO: 'Pedidos para separação',
  PEDIDO_EM_SEPARACAO: 'Pedidos em separação',
  PEDIDO_SEPARADO: 'Separados e não conferidos',
  PEDIDO_EMBARCADO: 'Conferidos e não embarcados',
  PEDIDOS_EMBARCADOS: 'Pedidos embarcados',
  ALERTAS_NAO_SEPARADOS: 'Pedidos não separados',
  ALERTAS_NAO_CONFERIDOS: 'Separados e não conferidos',
  ALERTAS_NAO_EMBARCADOS: 'Pedidos conferidos e não embarcados',
  PENDENCIAS: 'Pedidos com produtos não encontrados',
};

export function resumirPedidosPorStatus(pedidos: {
  pedidoId: number;
  statusCodigo: string;
  statusOperacionalCodigo?: string;
}[]) {
  const vistos = new Set<number>();
  const grupos = new Map<string, { codigo: string; titulo: string; total: number }>();
  for (const pedido of pedidos) {
    if (vistos.has(pedido.pedidoId)) continue;
    vistos.add(pedido.pedidoId);
    const codigo = pedido.statusCodigo.startsWith('ALERTAS_')
      ? pedido.statusCodigo : pedido.statusOperacionalCodigo || pedido.statusCodigo;
    const grupo = grupos.get(codigo) || { codigo, titulo: titulos[codigo] || codigo, total: 0 };
    grupo.total += 1;
    grupos.set(codigo, grupo);
  }
  return [...grupos.values()];
}
