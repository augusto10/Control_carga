// Consulta SOMENTE LEITURA no banco: a informacao de "produto faltando" existe
// gravada em PedidoLogisticaSnapshot?
//
// Uso: node tmp/consultar-pendencias-banco.js [dias=30]

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({ log: ['error'] });
const DIAS = Math.max(1, Number(process.argv[2]) || 30);

const linha = (rotulo, valor) => console.log(`  ${String(rotulo).padEnd(58)} ${valor}`);

async function main() {
  console.log(`\n========== PENDENCIAS NO BANCO (ultimos ${DIAS} dias) ==========\n`);

  const [{ total }] = await prisma.$queryRaw`
    SELECT count(*)::int AS total FROM "PedidoLogisticaSnapshot"`;
  const [{ comPendencia }] = await prisma.$queryRaw`
    SELECT count(*)::int AS "comPendencia" FROM "PedidoLogisticaSnapshot" WHERE "possuiPendencia" = true`;
  const [{ comTotal }] = await prisma.$queryRaw`
    SELECT count(*)::int AS "comTotal" FROM "PedidoLogisticaSnapshot" WHERE "totalItensPendentes" > 0`;
  const [{ comLista }] = await prisma.$queryRaw`
    SELECT count(*)::int AS "comLista" FROM "PedidoLogisticaSnapshot"
    WHERE jsonb_typeof("produtosPendentes") = 'array' AND jsonb_array_length("produtosPendentes") > 0`;
  const [{ flagSnake }] = await prisma.$queryRaw`
    SELECT count(*)::int AS "flagSnake" FROM "PedidoLogisticaSnapshot"
    WHERE upper(coalesce("rawPedido"->>'possui_produtos_faltando', '')) IN ('TRUE','T','S','SIM','1')`;
  const [{ flagUpper }] = await prisma.$queryRaw`
    SELECT count(*)::int AS "flagUpper" FROM "PedidoLogisticaSnapshot"
    WHERE upper(coalesce("rawPedido"->>'POSSUI_PRODUTOS_FALTANDO', '')) IN ('TRUE','T','S','SIM','1')`;

  console.log('--- COLUNAS DA TABELA (todos os snapshots) ---');
  linha('Total de snapshots:', total);
  linha('possuiPendencia = true:', comPendencia);
  linha('totalItensPendentes > 0:', comTotal);
  linha('produtosPendentes com itens:', comLista);
  linha('rawPedido.possui_produtos_faltando marcado:', flagSnake);
  linha('rawPedido.POSSUI_PRODUTOS_FALTANDO marcado:', flagUpper);

  const [{ recentes, recentesComPendencia, recentesFlag }] = await prisma.$queryRaw`
    SELECT
      count(*)::int AS "recentes",
      count(*) FILTER (WHERE "possuiPendencia" = true)::int AS "recentesComPendencia",
      count(*) FILTER (WHERE upper(coalesce("rawPedido"->>'possui_produtos_faltando','')) IN ('TRUE','T','S','SIM','1'))::int AS "recentesFlag"
    FROM "PedidoLogisticaSnapshot"
    WHERE "dataRecebimentoDia" >= now() - ${`${DIAS} days`}::interval`;

  console.log(`\n--- JANELA DE ${DIAS} DIAS (por dataRecebimentoDia) ---`);
  linha('Snapshots recebidos no periodo:', recentes);
  linha('... com possuiPendencia = true:', recentesComPendencia);
  linha('... com a flag da API marcada:', recentesFlag);

  const colunas = await prisma.$queryRaw`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'PedidoLogisticaSnapshot' ORDER BY column_name`;
  console.log('\n--- COLUNAS EXISTENTES NA TABELA ---');
  console.log('  ' + colunas.map((c) => c.column_name).join(', '));
  console.log('  numerosNotas presente:', colunas.some((c) => c.column_name === 'numerosNotas'));

  const cobertura = await prisma.$queryRaw`
    SELECT min("dataRecebimentoDia")::date AS inicio, max("dataRecebimentoDia")::date AS fim,
           max("sincronizadoEm") AS atualizado
    FROM "PedidoLogisticaSnapshot"`;
  console.log('\n--- COBERTURA DA TABELA ---');
  linha('dataRecebimentoDia de:', cobertura[0]?.inicio);
  linha('dataRecebimentoDia ate:', cobertura[0]?.fim);
  linha('snapshot mais recente atualizado em:', cobertura[0]?.atualizado);

  const sincronizacoes = await prisma.$queryRaw`
    SELECT "chave", "dataInicio", "dataFim", "totalLidos", "totalAtualizados", "totalComErro",
           "ultimoErro", "ultimaSincronizacao"
    FROM "SincronizacaoLogistica"
    ORDER BY "ultimaSincronizacao" DESC
    LIMIT 5`;
  console.log('\n--- SINCRONIZACOES ---');
  if (!sincronizacoes.length) {
    console.log('  NENHUMA sincronizacao registrada.');
  }
  for (const sync of sincronizacoes) {
    console.log(
      `  ${sync.chave} | lidos=${sync.totalLidos} atualizados=${sync.totalAtualizados} erros=${sync.totalComErro}` +
      ` | ultima=${sync.ultimaSincronizacao?.toISOString?.() || sync.ultimaSincronizacao}` +
      (sync.ultimoErro ? ` | ERRO: ${String(sync.ultimoErro).slice(0, 120)}` : '')
    );
  }

  const comFlag = await prisma.$queryRaw`
    SELECT "pedidoId", "statusCodigo", "dataRecebimentoDia", "totalItensPendentes",
           "rawPedido"->>'possui_produtos_faltando' AS flag
    FROM "PedidoLogisticaSnapshot"
    WHERE "possuiPendencia" = true
       OR upper(coalesce("rawPedido"->>'possui_produtos_faltando','')) IN ('TRUE','T','S','SIM','1')
    ORDER BY "dataRecebimentoDia" DESC NULLS LAST
    LIMIT 20`;
  console.log('\n--- SNAPSHOTS MARCADOS COMO PENDENCIA ---');
  if (!comFlag.length) {
    console.log('  Nenhum snapshot com possuiPendencia = true nem com a flag da API marcada.');
  }
  for (const snap of comFlag) {
    console.log(
      `  #${snap.pedidoId} | ${snap.dataRecebimentoDia?.toISOString?.().slice(0, 10) || '?'}` +
      ` | status=${snap.statusCodigo || '?'} | pendentes=${snap.totalItensPendentes} | flag=${JSON.stringify(snap.flag)}`
    );
  }

  const topPendentes = await prisma.$queryRaw`
    SELECT "pedidoId", "statusCodigo", "dataRecebimentoDia", "totalItensPendentes"
    FROM "PedidoLogisticaSnapshot"
    WHERE "totalItensPendentes" > 0
    ORDER BY "totalItensPendentes" DESC
    LIMIT 10`;
  console.log('\n--- MAIORES totalItensPendentes (sem flag, so quantidade) ---');
  if (!topPendentes.length) console.log('  Nenhum snapshot com totalItensPendentes > 0.');
  for (const snap of topPendentes) {
    console.log(
      `  #${snap.pedidoId} | ${snap.dataRecebimentoDia?.toISOString?.().slice(0, 10) || '?'}` +
      ` | status=${snap.statusCodigo || '?'} | pendentes=${snap.totalItensPendentes}`
    );
  }
  console.log('');
}

main()
  .catch(async (error) => {
    console.error('ERRO_CONSULTA_BANCO:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
