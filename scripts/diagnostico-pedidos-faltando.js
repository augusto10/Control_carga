require('dotenv').config();
const axios = require('axios');

// Consulta direta ao endpoint externo que alimenta o dashboard.
//
// Uso:
//   node scripts/diagnostico-pedidos-faltando.js [dias=30]
//   node scripts/diagnostico-pedidos-faltando.js 2026-08-22 2026-09-21
//
// Responde: no periodo consultado, existe pedido com produto faltando?
// Separa em tres grupos, porque eles se comportam diferente no dashboard:
//   A) flag oficial da API (possui_produtos_faltando / POSSUI_PRODUTOS_FALTANDO /
//      POSSUI_PRODUTO_FALTANDO) -> e o que o card considera como produto faltando.
//   B) sem flag, mas total_itens_pendentes > 0 -> nao entra mais como produto faltando.
//   C) apenas saldo/resumo logistico indicando pendencia -> tambem nao entra.

const base = process.env.API_EXTERNA_BASE_URL || process.env.API_URL || 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';
const username = process.env.API_EXTERNA_USERNAME;
const password = process.env.API_EXTERNA_PASSWORD;

const asBool = (v) => ['S', 'SIM', 'TRUE', '1'].includes(String(v ?? '').trim().toUpperCase());
const toNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Chaves lidas hoje pelo dashboard (lib/logistica-snapshot.ts).
const FLAG_OFICIAL = ['possui_produtos_faltando', 'POSSUI_PRODUTOS_FALTANDO', 'POSSUI_PRODUTO_FALTANDO'];
// Chaves legadas/alternativas: se aparecerem preenchidas, a leitura precisa cobrir o nome.
const FLAG_LEGADO = [
  'produto_faltando', 'PRODUTO_FALTANDO',
  'produto_nao_encontrado', 'PRODUTO_NAO_ENCONTRADO',
  'nao_encontrado', 'NAO_ENCONTRADO',
  'falta', 'FALTA',
];

const hojeSaoPaulo = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());

function periodo() {
  const hoje = hojeSaoPaulo();
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  const iso = /^\d{4}-\d{2}-\d{2}$/;

  if (iso.test(arg1 || '')) {
    return { dataInicio: arg1, dataFim: iso.test(arg2 || '') ? arg2 : hoje, dias: null };
  }

  const dias = Math.max(1, Number(arg1) || 30);
  const [ano, mes, dia] = hoje.split('-').map(Number);
  const inicio = new Date(Date.UTC(ano, mes - 1, dia - (dias - 1)));
  return { dataInicio: inicio.toISOString().slice(0, 10), dataFim: hoje, dias };
}

const lerFlag = (registro, chaves) => {
  const encontradas = chaves.filter((chave) => asBool(registro[chave]));
  return { marcado: encontradas.length > 0, chaves: encontradas };
};

const itensDe = (pedido) => {
  const logistica = pedido.logistica || {};
  return [].concat(
    Array.isArray(logistica.comparativo_separacao_pendentes) ? logistica.comparativo_separacao_pendentes : [],
    Array.isArray(logistica.itens_entregas_pendentes) ? logistica.itens_entregas_pendentes : []
  );
};

const temSaldo = (itens) =>
  itens.some((item) =>
    [item.SALDO_PENDENTE, item.QUANTIDADE_PENDENTE_TOTAL, item.SALDO, item.QUANTIDADE_EM_SEPARACAO,
      item.QTD_EM_SEPARACAO_TRAN_ENT_PEN, item.SALDO_NA_SEPARACAO].some((v) => toNum(v) > 0)
  );

const identificacao = (pedido) => ({
  pedidoId: pedido.pedido_id ?? pedido.PEDIDO_ID ?? pedido.orcamento_id ?? pedido.ORCAMENTO_ID ?? null,
  cliente: pedido.cliente_nome || pedido.NOME_RAZAO_SOCIAL || 'N/A',
  statusLogistico: (pedido.status_logistico && pedido.status_logistico.codigo) || pedido.STATUS_LOGISTICO || '',
  ultimoStatusSeparacao: pedido.ultimo_status_separacao ?? pedido.ULTIMO_STATUS_SEPARACAO ?? null,
  totalItensPendentes: toNum(pedido.total_itens_pendentes ?? pedido.TOTAL_ITENS_PENDENTES),
  dataHoraRecebimento: pedido.DATA_HORA_RECEBIMENTO ?? pedido.data_hora_recebimento ?? null,
});

(async () => {
  if (!username || !password) {
    console.log('CREDENCIAIS_NAO_CONFIGURADAS');
    console.log('Defina API_EXTERNA_USERNAME e API_EXTERNA_PASSWORD no .env.');
    return;
  }

  const { dataInicio, dataFim, dias } = periodo();

  try {
    const loginRes = await axios.post(`${base}/token`, new URLSearchParams({ username, password, grant_type: 'password' }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 60000,
    });
    const token = loginRes.data.access_token;

    const params = new URLSearchParams({ empresa_id: '1', data_inicio: dataInicio, data_fim: dataFim });
    const url = `${base}/api/v1/pedidos/dashboard-logistica?${params.toString()}`;
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 120000,
    });

    const data = Array.isArray(res.data?.data) ? res.data.data : [];
    const totalInformado = toNum(res.data?.total);

    console.log('PERIODO_CONSULTADO', dataInicio, 'a', dataFim, dias ? `(${dias} dias)` : '');
    console.log('TOTAL_PEDIDOS_API', data.length, totalInformado && totalInformado !== data.length ? `(total informado pela API: ${totalInformado})` : '');

    const grupoA = [];
    const grupoB = [];
    const grupoC = [];
    const chavesOficiaisVistas = {};
    const chavesLegadasVistas = {};
    let comPendenciaNoResumo = 0;

    for (const pedido of data) {
      const oficial = lerFlag(pedido, FLAG_OFICIAL);
      const legado = lerFlag(pedido, FLAG_LEGADO);
      for (const chave of oficial.chaves) chavesOficiaisVistas[chave] = (chavesOficiaisVistas[chave] || 0) + 1;
      for (const chave of legado.chaves) chavesLegadasVistas[chave] = (chavesLegadasVistas[chave] || 0) + 1;

      const itens = itensDe(pedido);
      const resumo = (pedido.logistica && pedido.logistica.resumo_pendencias_logisticas) || {};
      const resumoFlag = asBool(resumo.possui_produtos_faltando ?? resumo.POSSUI_PRODUTOS_FALTANDO ?? resumo.POSSUI_PRODUTO_FALTANDO);
      const itemFlag = itens.some((item) => {
        const nome = lerFlag(item, FLAG_OFICIAL);
        return nome.marcado || lerFlag(item, FLAG_LEGADO).marcado;
      });
      if (resumoFlag) comPendenciaNoResumo += 1;

      const registro = identificacao(pedido);

      if (oficial.marcado || legado.marcado) {
        grupoA.push({ ...registro, chaves: [...oficial.chaves, ...legado.chaves] });
      } else if (registro.totalItensPendentes > 0) {
        grupoB.push(registro);
      } else if (resumoFlag || itemFlag || temSaldo(itens)) {
        grupoC.push({ ...registro, resumo: resumoFlag, item: itemFlag });
      }
    }

    console.log('\n--- PEDIDOS COM PRODUTO FALTANDO ---');
    console.log('A) flag oficial preenchida (entra no card):', grupoA.length);
    console.log('B) sem flag, com total_itens_pendentes > 0 (NAO entra no card):', grupoB.length);
    console.log('C) sem flag e sem total, mas resumo/item/saldo indica pendencia (NAO entra):', grupoC.length);
    console.log('   pedidos com possui_produtos_faltando no resumo logistico:', comPendenciaNoResumo);

    console.log('\n--- CHAVES DE FLAG OBSERVADAS ---');
    console.log('Oficiais (lidas pelo dashboard):', JSON.stringify(chavesOficiaisVistas));
    console.log('Legadas/alternativas:', JSON.stringify(chavesLegadasVistas));

    if (grupoA.length) {
      console.log(`\n--- GRUPO A (${grupoA.length}) ---`);
      for (const pedido of grupoA.slice(0, 60).sort((a, b) => b.totalItensPendentes - a.totalItensPendentes)) {
        console.log(
          `  #${pedido.pedidoId} | ${String(pedido.cliente).slice(0, 30)} | status=${pedido.statusLogistico || '?'}` +
          ` | sep=${pedido.ultimoStatusSeparacao || '?'} | pendentes=${pedido.totalItensPendentes} | flag=${pedido.chaves.join('+')}`
        );
      }
      if (grupoA.length > 60) console.log(`  ... e mais ${grupoA.length - 60} pedidos`);
    }

    // Chaves cruas: confirma se a flag existe no payload com valor 'N' ou se
    // a API usa outro nome (ex.: PRODUTOS_FALTANDO).
    console.log('\n--- CHAVES CRUAS (amostra) ---');
    const rastreaveis = (chave) => /FALT|PENDEN/i.test(chave);
    const comPendencia = data.filter((pedido) => identificacao(pedido).totalItensPendentes > 0);
    const amostraCrua = [data[0], ...comPendencia.slice(0, 3)].filter(Boolean);
    for (const pedido of amostraCrua) {
      console.log(`  pedido #${identificacao(pedido).pedidoId} | chaves com FALT/PENDEN no topo:`);
      const chaves = Object.keys(pedido).filter(rastreaveis);
      for (const chave of chaves) console.log(`    ${chave} = ${JSON.stringify(pedido[chave])}`);
      if (!chaves.length) console.log('    (nenhuma chave com FALT/PENDEN no nivel raiz)');
      const resumo = (pedido.logistica && pedido.logistica.resumo_pendencias_logisticas) || {};
      const chavesResumo = Object.keys(resumo).filter(rastreaveis);
      for (const chave of chavesResumo) console.log(`    logistica.resumo_pendencias_logisticas.${chave} = ${JSON.stringify(resumo[chave])}`);
      if (!chavesResumo.length) console.log('    (nenhuma chave com FALT/PENDEN no resumo logistico)');
    }

    if (grupoB.length) {
      const recebimentos = grupoB
        .map((pedido) => String(pedido.dataHoraRecebimento || ''))
        .filter(Boolean)
        .sort();
      console.log(`\n--- GRUPO B: pendencias de quantidade sem flag (${grupoB.length}) - amostra ---`);
      if (recebimentos.length) {
        console.log(`  recebimento de ${recebimentos[0]} ate ${recebimentos[recebimentos.length - 1]}`);
      }
      for (const pedido of grupoB.slice(0, 20).sort((a, b) => b.totalItensPendentes - a.totalItensPendentes)) {
        console.log(
          `  #${pedido.pedidoId} | ${String(pedido.cliente).slice(0, 30)} | status=${pedido.statusLogistico || '?'}` +
          ` | sep=${pedido.ultimoStatusSeparacao || '?'} | pendentes=${pedido.totalItensPendentes}`
        );
      }
    }

    console.log('\n--- VEREDITO ---');
    if (grupoA.length) {
      console.log(`Existem ${grupoA.length} pedido(s) com produto faltando no periodo (flag da API preenchida).`);
    } else {
      console.log('Nenhum pedido com produto faltando no periodo (flag da API nao preenchida em nenhum registro).');
    }
    if (grupoB.length) {
      console.log(`Alem disso, ${grupoB.length} pedido(s) tem itens pendentes sem a flag - nao contam como produto faltando.`);
    }
  } catch (error) {
    console.log('ERRO_CONSULTA');
    console.log(error?.response?.status || 'SEM_STATUS');
    console.log(error?.response?.data || error?.message || String(error));
    process.exitCode = 1;
  }
})();
