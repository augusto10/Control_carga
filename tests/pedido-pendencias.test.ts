import assert from 'node:assert/strict';
import { saldoPendente, saldoDetalhadoPendente, itensComSaldoPendente, pedidoTemDevolucao, pedidoTemEntregaGerada } from '../lib/pedido-pendencias';

// Uma devolucao encerrada nao pode ressuscitar a quantidade historica.
assert.equal(saldoPendente({ SALDO_PENDENTE: 0, QUANTIDADE_PENDENTE_TOTAL: 5 }), 0);
assert.equal(saldoPendente({ QUANTIDADE: 10, QUANTIDADE_BAIXADA: 6, QUANTIDADE_DEVOLVIDA: 4 }), 0);
assert.equal(saldoPendente({ QUANTIDADE: 10, QUANTIDADE_BAIXADA: 6, QUANTIDADE_DEVOLVIDA: 2 }), 2);
assert.equal(saldoPendente({ SALDO_PENDENTE: 2, QUANTIDADE_DEVOLVIDA: 2 }), 2);
assert.equal(saldoDetalhadoPendente({ comparativo_separacao_pendentes: [{ SALDO_PENDENTE: 0 }], itens_entregas_pendentes: [{ SALDO: 4 }] }), false);
assert.equal(saldoDetalhadoPendente({ comparativo_separacao_pendentes: [{ SALDO_PENDENTE: 0 }, { SALDO_PENDENTE: 2 }] }), true);
assert.equal(saldoDetalhadoPendente({ comparativo_separacao_pendentes: [], itens_entregas_pendentes: [] }), false);
assert.equal(saldoDetalhadoPendente(null), null);
assert.equal(saldoDetalhadoPendente({}), null);
assert.equal(saldoPendente({ QUANTIDADE: 4, SALDO: 4, DEVOLVIDOS: 4 }), 0);
assert.equal(saldoPendente({ QUANTIDADE: 4, SALDO: 4, DEVOLVIDOS: 2 }), 2);
assert.equal(saldoPendente({ QUANTIDADE: 4, SALDO: 2, DEVOLVIDOS: 2 }), 2);
assert.equal(saldoDetalhadoPendente({ pedido: { TOTALMENTE_DEVOLVIDO: 'S' }, itens_entregas_pendentes: [{ SALDO: 4 }] }), false);
assert.equal(saldoPendente({ SALDO: '1,5' }), 1.5);
const devolucaoComComparativoAntigo = {
  comparativo_separacao_pendentes: [{ PRODUTO_ID: 1, SALDO_PENDENTE: 4 }],
  itens_entregas_pendentes: [{ PRODUTO_ID: 1, QUANTIDADE: 4, SALDO: 4, DEVOLVIDOS: 4 }],
};
assert.equal(saldoDetalhadoPendente(devolucaoComComparativoAntigo), false);
assert.equal(itensComSaldoPendente({
  ...devolucaoComComparativoAntigo,
  itens_entregas_pendentes: [{ PRODUTO_ID: 1, QUANTIDADE: 4, SALDO: 4, DEVOLVIDOS: 2 }],
})?.[0].SALDO_PENDENTE, 2);
assert.equal(pedidoTemDevolucao({ status_separacoes: 'G' }, { pedido: { DEVOLVIDO: 'S' } }), true);
assert.equal(pedidoTemDevolucao({ status_separacoes: 'G' }, { itens_entregas_pendentes: [{ SALDO: 2, DEVOLVIDOS: 1 }] }), true);
assert.equal(pedidoTemDevolucao({ status_separacoes: 'G' }, { itens_entregas_pendentes: [{ SALDO: 2, DEVOLVIDOS: 0 }] }), false);
assert.equal(pedidoTemEntregaGerada({}, { comparativo_separacao_pendentes: [{ POSSUI_PRODUTO_FALTANDO: 'S' }] }), false);
assert.equal(pedidoTemEntregaGerada({}, { entregas: [{ ENTREGA_ID: 10 }] }), true);
console.log('Regras de pendencias: 18 verificacoes passaram.');
