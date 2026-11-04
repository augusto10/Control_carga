import assert from 'node:assert/strict';
import prisma from '../lib/prisma';
import { apiExternaService } from '../services/api-externa';
import { sincronizarLogisticaSnapshot } from '../lib/logistica-snapshot';
import { pedidoTemDevolucao } from '../lib/pedido-pendencias';

const db = prisma as any;
const pedidoBase = {
  pedido_id: 201179,
  tipo_entrega: 'ENT',
  status_logistico: { codigo: 'PEDIDO_SEPARADO' },
  status_separacoes: 'G',
};
let pedidoAtual: Record<string, unknown> = pedidoBase;
let snapshots: any[] = [];
db.notaFiscal.findMany = async () => [];
db.pedidoLogisticaSnapshot.findMany = async () => snapshots;
db.pedidoLogisticaSnapshot.upsert = async ({ update }: any) => {
  snapshots = [...snapshots.filter((snapshot) => snapshot.pedidoId !== update.pedidoId), update];
  return update;
};
db.sincronizacaoLogistica.upsert = async ({ update }: any) => update;
apiExternaService.listarDashboardLogistica = async () => ({ data: [pedidoAtual] } as any);
apiExternaService.listarPedidos = async () => null;
apiExternaService.listarNotasFiscaisCompletas = async () => null;
apiExternaService.buscarPedidoLogistica = async () => null;

async function main() {
  assert.equal(pedidoTemDevolucao({ pedido: { TOTALMENTE_DEVOLVIDO: 'S' } }, null), true);
  assert.equal(pedidoTemDevolucao({ pedido: { pedido: { TOTALMENTE_DEVOLVIDO: 'S' } } }, null), true);
  assert.equal(pedidoTemDevolucao({}, { pedido: { pedido: { TOTALMENTE_DEVOLVIDO: 'S' } } }), true);

  await sincronizarLogisticaSnapshot({ username: 'teste', password: 'teste' });
  assert.equal(snapshots[0].rawPedido.TOTALMENTE_DEVOLVIDO, undefined);

  pedidoAtual = { ...pedidoBase, TOTALMENTE_DEVOLVIDO: 'S' };
  await sincronizarLogisticaSnapshot({ username: 'teste', password: 'teste' });

  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].rawPedido.TOTALMENTE_DEVOLVIDO, 'S');
  assert.equal(pedidoTemDevolucao(snapshots[0].rawPedido, snapshots[0].rawLogistica), true);
  console.log('Snapshot atualiza a devolucao total mesmo quando os demais dados do pedido nao mudam.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
