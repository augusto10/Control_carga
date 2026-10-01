/* eslint-disable @typescript-eslint/no-require-imports */
// Auditoria do snapshot logistico (banco local) vs. informacoes que os cards
// do dashboard consomem.
//
// Uso:
//   node scripts/verificar-snapshot-logistica.js [dias=7]
//
// Verifica:
//   1. SincronizacaoLogistica: sincronizacoes recentes, erro, periodo coberto.
//   2. PedidoLogisticaSnapshot: totais, ultima sincronizacao, distribuicao de status.
//   3. Cobertura de campos por card: para cada status card (PEDIDO_NOVO ... ALERTAS),
//      mostra % de snapshots preenchendo os campos que os cards exibem.
//   4. Amostra de pedidos do dia (periodo default do dashboard) com campos faltando.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DIAS = Math.max(1, Number(process.argv[2] || 7));
const DIAS_ALERTAS = 30;

const isoLocal = (d) => {
  const dt = d instanceof Date ? d : new Date(d);
  return dt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
};

const pct = (parte, total) => (total === 0 ? null : Math.round((parte / total) * 100));

// Campos exibidos nos cards (pages/index.tsx + PedidoInformacoes + dadosPedido)
const CAMPOS_CARD = [
  { campo: 'clienteNome', card: 'Nome cliente (nomeFantasia/clienteNome)' },
  { campo: 'tipoEntrega', card: 'Tipo de entrega (filtro ENT/EPG)' },
  { campo: 'statusCodigo', card: 'Status do card (agrupamento)' },
  { campo: 'dataHoraRecebimento', card: 'Recebimento exibido' },
  { campo: 'previsaoEntrega', card: 'Previsao de entrega' },
  { campo: 'valorPedido', card: 'Valor do pedido' },
  { campo: 'localNome', card: 'Local / controle' },
  { campo: 'usuarioConfirmacaoNome', card: 'Quem confirmou' },
  { campo: 'dataHoraConfirmacao', card: 'Data hora confirmacao' },
  { campo: 'transportadoraNome', card: 'Transportadora (embarcados)' },
  { campo: 'numeroManifesto', card: 'Controle/manifesto (embarcados)' },
  { campo: 'numeroNota', card: 'Nota fiscal (vinculo controle)' },
  { campo: 'chaveNfe', card: 'Chave NFe (vinculo controle)' },
  { campo: 'possuiPendencia', card: 'Flag de pendencia' },
  { campo: 'totalItensPendentes', card: 'Total itens pendentes' },
  { campo: 'produtosPendentes', card: 'Lista produtos pendentes' },
  { campo: 'dataHoraControle', card: 'Vinculado em (controle)' },
  { campo: 'statusSeparacao', card: 'Status separacao' },
];

// Campos derivados de dadosPedido() a partir de rawPedido/rawLogistica
const CAMPOS_DERIVADOS = [
  'cidade', 'bairro', 'uf', 'separadorNome', 'conferenteNome',
];

const temValor = (v) =>
  v !== null && v !== undefined && v !== '' &&
  !(Array.isArray(v) && v.length === 0) &&
  !(typeof v === 'number' && Number.isNaN(v));

function extrairDerivados(snapshot) {
  const fontes = [snapshot.rawPedido || {}, (snapshot.rawLogistica || {}).pedido || {}];
  const texto = (campos, registros = fontes) => {
    for (const registro of registros) {
      for (const campo of campos) {
        const valor = registro[campo];
        if (typeof valor === 'string' && valor.trim()) return valor.trim();
      }
    }
    return null;
  };
  const separacoes = Array.isArray(snapshot.rawLogistica?.separacoes)
    ? snapshot.rawLogistica.separacoes
    : [];
  const nomes = (campos) =>
    [...new Set(separacoes.map((item) => texto(campos, [item])).filter(Boolean))].join(', ') || null;

  return {
    cidade: texto(['CIDADE_ENTREGA_NOME', 'NOME_CIDADE', 'CIDADE', 'cidade']),
    bairro: texto(['BAIRRO_ENTREGA_NOME', 'NOME_BAIRRO_NOTA', 'NOME_BAIRRO', 'BAIRRO', 'bairro']),
    uf: texto(['UF_ENTREGA', 'ESTADO_ENTREGA_ID', 'ESTADO_DESTINO', 'UF', 'uf']),
    separadorNome: nomes(['FUNCIONARIO_SEPARACAO_NOME', 'USUARIO_SEPARACAO_NOME', 'SEPARADOR_NOME', 'USUARIO_NOME']) ||
      texto(['separador_nome', 'FUNCIONARIO_SEPARACAO_NOME', 'USUARIO_SEPARACAO_NOME']),
    conferenteNome: nomes(['USUARIO_CONFERENCIA_NOME', 'CONFERENTE_NOME', 'USUARIO_BAIXA_NOME']) ||
      texto(['conferente_nome', 'USUARIO_CONFERENCIA_NOME']),
  };
}

async function main() {
  console.log(`\n========== AUDITORIA SNAPSHOT LOGISTICA ==========\n`);

  // ---------- 1. Sincronizacoes ----------
  const desdeSync = new Date(Date.now() - DIAS * 24 * 3600 * 1000);
  const sincronizacoes = await prisma.sincronizacaoLogistica.findMany({
    where: { ultimaSincronizacao: { gte: desdeSync } },
    orderBy: { ultimaSincronizacao: 'desc' },
    take: 20,
  });

  console.log(`--- 1. SINCRONIZACOES (ultimos ${DIAS} dias) ---`);
  if (!sincronizacoes.length) {
    console.log(`  NENHUMA sincronizacao registrada nos ultimos ${DIAS} dias.`);
    console.log(`  -> A tabela local esta sem alimentacao recente: os cards vao cair no fallback da API externa.\n`);
  } else {
    for (const s of sincronizacoes) {
      const idadeMin = Math.round((Date.now() - new Date(s.ultimaSincronizacao).getTime()) / 60000);
      console.log(
        `  chave=${s.chave} | lidos=${s.totalLidos} atualizados=${s.totalAtualizados} erros=${s.totalComErro}` +
        ` | ultima=${isoLocal(s.ultimaSincronizacao)} (${idadeMin} min atras)` +
        (s.ultimoErro ? ` | ERRO: ${String(s.ultimoErro).slice(0, 120)}` : '')
      );
      console.log(`     periodo: ${s.dataInicio ? isoLocal(s.dataInicio) : 'sem inicio'} -> ${s.dataFim ? isoLocal(s.dataFim) : 'sem fim'}`);
    }
    const maisRecente = sincronizacoes[0];
    const idadeHoras = Math.round((Date.now() - new Date(maisRecente.ultimaSincronizacao).getTime()) / 3600000);
    console.log(`  Idade da sincronizacao mais recente: ${idadeHoras}h`);
  }

  // ---------- 2. Snapshots ----------
  const totalSnapshots = await prisma.pedidoLogisticaSnapshot.count();
  const desdeAlertas = new Date(Date.now() - DIAS_ALERTAS * 24 * 3600 * 1000);
  const totalRecentes = await prisma.pedidoLogisticaSnapshot.count({
    where: { dataRecebimentoDia: { gte: desdeAlertas } },
  });

  console.log(`\n--- 2. SNAPSHOTS ---`);
  console.log(`  Total de snapshots na tabela: ${totalSnapshots}`);
  console.log(`  Recebidos nos ultimos ${DIAS_ALERTAS} dias: ${totalRecentes}`);

  if (totalSnapshots === 0) {
    console.log(`  TABELA VAZIA: nada foi sincronizado ainda. Os cards dependem 100% da API externa em tempo real.\n`);
  }

  const porStatus = await prisma.pedidoLogisticaSnapshot.groupBy({
    by: ['statusCodigo'],
    _count: { _all: true },
  });
  if (porStatus.length) {
    console.log(`  Distribuicao por statusCodigo (todos os snapshots):`);
    for (const g of porStatus.sort((a, b) => b._count._all - a._count._all)) {
      console.log(`    ${String(g.statusCodigo || '(null)').padEnd(28)} ${g._count._all}`);
    }
  }

  const ultimaSync = await prisma.pedidoLogisticaSnapshot.aggregate({ _max: { sincronizadoEm: true } });
  if (ultimaSync._max.sincronizadoEm) {
    const idade = Math.round((Date.now() - new Date(ultimaSync._max.sincronizadoEm).getTime()) / 60000);
    console.log(`  Snapshot mais recente atualizado ha: ${idade} min`);
  }

  // ---------- 3. Cobertura de campos ----------
  if (totalSnapshots > 0) {
    console.log(`\n--- 3. COBERTURA DE CAMPOS (amostra de 500 snapshots recentes) ---`);
    const amostra = await prisma.pedidoLogisticaSnapshot.findMany({
      orderBy: { sincronizadoEm: 'desc' },
      take: 500,
    });

    const cobertura = {};
    for (const { campo } of CAMPOS_CARD) {
      cobertura[campo] = { ok: 0, total: 0 };
    }
    for (const snap of amostra) {
      for (const { campo } of CAMPOS_CARD) {
        cobertura[campo].total += 1;
        if (temValor(snap[campo])) cobertura[campo].ok += 1;
      }
    }

    console.log(`  Campos gravados na tabela PedidoLogisticaSnapshot:`);
    for (const { campo, card } of CAMPOS_CARD) {
      const p = pct(cobertura[campo].ok, cobertura[campo].total);
      const flag = p === null ? '  -  ' : `${String(p).padStart(3)}%`;
      const alerta = p !== null && p < 50 ? '  <-- BAIXA COBERTURA' : '';
      console.log(`    ${flag}  ${campo.padEnd(24)} (${card})${alerta}`);
    }

    console.log(`\n  Campos derivados de rawPedido/rawLogistica (usados pelo PedidoInformacoes):`);
    const coberturaDeriv = {};
    for (const campo of CAMPOS_DERIVADOS) coberturaDeriv[campo] = { ok: 0, total: 0 };
    coberturaDeriv.__rawLogistica = { ok: 0, total: 0 };
    coberturaDeriv.__tipoEntregaRaw = { ok: 0, total: 0 };
    coberturaDeriv.__prodPendComPendencia = { ok: 0, total: 0 };
    for (const snap of amostra) {
      const deriv = extrairDerivados(snap);
      for (const campo of CAMPOS_DERIVADOS) {
        coberturaDeriv[campo].total += 1;
        if (temValor(deriv[campo])) coberturaDeriv[campo].ok += 1;
      }
      // rawLogistica precisa existir para o re-check de pendencias em tempo real
      coberturaDeriv.__rawLogistica.total += 1;
      if (Object.keys(snap.rawLogistica || {}).length > 0) coberturaDeriv.__rawLogistica.ok += 1;
      // tipoEntrega tambem pode vir de dentro do rawPedido (o dashboard le de lá)
      coberturaDeriv.__tipoEntregaRaw.total += 1;
      const raw = snap.rawPedido || {};
      const tipoRaw = [raw.tipo_entrega, raw.TIPO_ENTREGA, raw.tipoEntrega, raw.TIPO_ENTREGA_DESCRICAO, raw.tipo_entrega_descricao]
        .find((v) => temValor(v));
      if (temValor(tipoRaw)) coberturaDeriv.__tipoEntregaRaw.ok += 1;
      // produtosPendentes so faz sentido quando possuiPendencia = true
      if (snap.possuiPendencia) {
        coberturaDeriv.__prodPendComPendencia.total += 1;
        if (temValor(snap.produtosPendentes)) coberturaDeriv.__prodPendComPendencia.ok += 1;
      }
    }
    const linhasDeriv = [...CAMPOS_DERIVADOS, '__rawLogistica', '__tipoEntregaRaw', '__prodPendComPendencia'];
    for (const campo of linhasDeriv) {
      const c = coberturaDeriv[campo];
      const p = pct(c.ok, c.total);
      const flag = p === null ? '  -  ' : `${String(p).padStart(3)}%`;
      const sufixo = campo === '__rawLogistica' ? ' (rawLogistica presente p/ re-check)'
        : campo === '__tipoEntregaRaw' ? ' (tipo_entrega dentro do rawPedido)'
        : campo === '__prodPendComPendencia' ? ' (lista preenchida quando possuiPendencia=true)'
        : '';
      console.log(`    ${flag}  ${campo.padEnd(24)}${sufixo}`);
    }
  }

  // ---------- 4. Amostra do dia (periodo default do dashboard = hoje) ----------
  // O servidor (Vercel) roda em UTC e grava dataRecebimentoDia em UTC;
  // comparamos com meia-noite UTC para espelhar o filtro da API.
  const hoje = new Date();
  hoje.setUTCHours(0, 0, 0, 0);
  const doDia = await prisma.pedidoLogisticaSnapshot.findMany({
    where: { dataRecebimentoDia: { gte: hoje } },
    orderBy: { pedidoId: 'desc' },
    take: 30,
  });

  console.log(`\n--- 4. PEDIDOS DE HOJE NO SNAPSHOT (periodo default do dashboard) ---`);
  if (!doDia.length) {
    console.log(`  NENHUM snapshot com dataRecebimentoDia = hoje.`);
    console.log(`  -> O dashboard de hoje provavelmente esta usando apenas a API externa (sem base local).`);
  } else {
    console.log(`  ${doDia.length} snapshots de hoje (mostrando campos faltando):`);
    for (const snap of doDia) {
      const faltando = CAMPOS_CARD
        .filter(({ campo }) => !temValor(snap[campo]))
        .map(({ campo }) => campo);
      console.log(
        `    #${snap.pedidoId} status=${snap.statusCodigo} entrega=${snap.tipoEntrega || '?'} ` +
        `cliente=${(snap.clienteNome || '?').slice(0, 20)}` +
        (faltando.length ? ` | SEM: ${faltando.join(', ')}` : ' | completo')
      );
    }
  }

  // ---------- 5. Resumo/veredito ----------
  console.log(`\n--- 5. VEREDITO ---`);
  const syncRecente = sincronizacoes.length > 0 &&
    (Date.now() - new Date(sincronizacoes[0].ultimaSincronizacao).getTime()) < 24 * 3600 * 1000;
  console.log(`  [${syncRecente ? 'OK' : '!!'}] Sincronizacao nas ultimas 24h: ${syncRecente ? 'sim' : 'NAO'}`);
  console.log(`  [${totalSnapshots > 0 ? 'OK' : '!!'}] Tabela PedidoLogisticaSnapshot populada: ${totalSnapshots} registros`);
  if (doDia.length === 0) {
    console.log(`  [!!] Nenhum snapshot de hoje: dashboard de hoje nao tera base local.`);
  }
  console.log('');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Erro na auditoria:', error);
  await prisma.$disconnect();
  process.exit(1);
});
