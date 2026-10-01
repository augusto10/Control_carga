import assert from 'node:assert/strict';
import { resumirPedidosPorStatus } from '../lib/pedido-resumo-status';
import { dadosPedido } from '../lib/pedido-apresentacao';

const atrasados = [
  { pedidoId: 1, statusCodigo: 'ALERTAS_NAO_SEPARADOS' },
  { pedidoId: 2, statusCodigo: 'ALERTAS_NAO_CONFERIDOS' },
  { pedidoId: 3, statusCodigo: 'ALERTAS_NAO_CONFERIDOS' },
];
assert.deepEqual(resumirPedidosPorStatus(atrasados).map((grupo) => grupo.total), [1, 2]);
assert.equal(resumirPedidosPorStatus([...atrasados, atrasados[0]]).reduce((soma, grupo) => soma + grupo.total, 0), 3);
assert.deepEqual(resumirPedidosPorStatus([]), []);
assert.deepEqual(resumirPedidosPorStatus([
  { pedidoId: 4, statusCodigo: 'PENDENCIAS', statusOperacionalCodigo: 'PEDIDOS_EMBARCADOS' },
  { pedidoId: 5, statusCodigo: 'PENDENCIAS', statusOperacionalCodigo: 'PEDIDO_EMBARCADO' },
]).map((grupo) => grupo.codigo), ['PEDIDOS_EMBARCADOS', 'PEDIDO_EMBARCADO']);
const dados = dadosPedido({}, { separacoes: [
  { FUNCIONARIO_SEPARACAO_NOME: 'Separador registrado no ERP', USUARIO_NOME: 'Outro usuario' },
  { FUNCIONARIO_SEPARACAO_NOME: 'Separador registrado no ERP' },
] });
assert.equal(dados.separadorNome, 'Separador registrado no ERP');
assert.equal(dadosPedido({}, { separacoes: [{ FUNCIONARIO_SEPARACAO_NOME: null }] }).separadorNome, null);
console.log('Resumo dos cards e separador: 6 verificacoes passaram.');
