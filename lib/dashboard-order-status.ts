export const obterStatusPrincipalDoPedido = <T extends string>(
  statusCodigo: T,
  embarcadoNoControle: boolean
): T | 'PEDIDOS_EMBARCADOS' =>
  embarcadoNoControle ? 'PEDIDOS_EMBARCADOS' : statusCodigo;
