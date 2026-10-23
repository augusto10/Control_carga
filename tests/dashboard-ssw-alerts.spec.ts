import assert from 'node:assert/strict';
import {
  removerPedidosEmbarcadosPelaSsw,
  removerPedidosEntreguesPelaSsw,
} from '../lib/dashboard-ssw-alerts';

const indicadores = [
  { codigo: 'ALERTAS_NAO_EMBARCADOS', total: 2, pedidos: [{ pedidoId: 200036 }, { pedidoId: 199883 }] },
  { codigo: 'ALERTAS_NAO_ENTREGUES', total: 1, pedidos: [{ pedidoId: 200036 }] },
  { codigo: 'PEDIDO_EMBARCADO', total: 1, pedidos: [{ pedidoId: 200036 }] },
];

const embarcados = removerPedidosEmbarcadosPelaSsw(indicadores, new Set([200036]));
assert.deepEqual(embarcados[0].pedidos.map((pedido) => pedido.pedidoId), [199883]);
assert.deepEqual(embarcados[1].pedidos.map((pedido) => pedido.pedidoId), [200036]);
assert.equal(embarcados[2], indicadores[2]);
assert.equal(removerPedidosEmbarcadosPelaSsw(indicadores, new Set()), indicadores);

const entregues = removerPedidosEntreguesPelaSsw(indicadores, new Set([200036]));
assert.deepEqual(entregues.map((item) => item.total), [1, 0, 1]);
assert.deepEqual(entregues[0].pedidos.map((pedido) => pedido.pedidoId), [199883]);
assert.equal(entregues[2], indicadores[2]);
assert.equal(removerPedidosEntreguesPelaSsw(indicadores, new Set()), indicadores);

console.log('Filtragem de embarcados e entregues SSW nos alertas: 8 verificações passaram.');
