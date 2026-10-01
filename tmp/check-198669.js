require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const snap = await prisma.pedidoLogisticaSnapshot.findFirst({ where: { pedidoId: 198669 } });
  if (!snap) {
    console.log('Pedido 198669 NAO encontrado no snapshot local.');
    const total = await prisma.pedidoLogisticaSnapshot.count();
    console.log('Total snapshots:', total);
    const comPendencia = await prisma.pedidoLogisticaSnapshot.findMany({
      where: { possuiPendencia: true },
      take: 5,
      select: { pedidoId: true, tipoEntrega: true, possuiPendencia: true, totalItensPendentes: true, produtosPendentes: true, statusCodigo: true }
    });
    console.log('Exemplos com pendencia:', JSON.stringify(comPendencia, null, 2));
    return;
  }
  const raw = snap.rawPedido || {};
  console.log(JSON.stringify({
    pedidoId: snap.pedidoId,
    tipoEntrega: snap.tipoEntrega,
    statusCodigo: snap.statusCodigo,
    possuiPendencia: snap.possuiPendencia,
    totalItensPendentes: snap.totalItensPendentes,
    produtosPendentes: snap.produtosPendentes,
    clienteNome: snap.clienteNome,
    embarcadoNoControle: snap.embarcadoNoControle,
    raw_possui_faltando: raw.possui_produtos_faltando ?? raw.POSSUI_PRODUTO_FALTANDO,
    raw_total_itens: raw.total_itens_pendentes ?? raw.TOTAL_ITENS_PENDENTES,
    raw_tipo_entrega: raw.TIPO_ENTREGA ?? raw.tipo_entrega,
    raw_ultimo_status_sep: raw.ultimo_status_separacao ?? raw.ULTIMO_STATUS_SEPARACAO,
    raw_status_separacoes: raw.status_separacoes ?? raw.STATUS_SEPARACOES,
    raw_status_logistico: raw.status_logistico,
    raw_entrega_no_ato: raw.ENTREGA_NO_ATO ?? raw.entrega_no_ato,
    raw_keys_relevantes: Object.keys(raw).filter(k =>
      k.toLowerCase().includes('pend') || k.toLowerCase().includes('falt') ||
      k.toLowerCase().includes('tipo') || k.toLowerCase().includes('ato') ||
      k.toLowerCase().includes('separ') || k.toLowerCase().includes('retir')
    )
  }, null, 2));
}

main().catch(e => console.error(e.message)).finally(() => prisma.$disconnect());
