/**
 * Diagnostico do autopreenchimento de etiquetas de transporte.
 *
 * Reproduz exatamente o fluxo da rota /api/etiquetas/pedido-info para um
 * numero de pedido informado e imprime os dados brutos da API externa e o
 * resultado do mapeamento (cliente, CNPJ, transportadora, volumes, nota).
 *
 * Uso:
 *   npx ts-node scripts/diagnostico-pedido-api.ts 196395
 */

import 'dotenv/config';
import { apiExternaService } from '../services/api-externa';
import { mapearDadosPedidoParaEtiqueta, sanitizeNumeroPedido } from '../lib/etiquetas-transporte';

function summarize(value: unknown, depth = 0): string {
  if (depth > 3) return '...';
  if (Array.isArray(value)) {
    return `[${value.length}] ${value.slice(0, 2).map((v) => summarize(v, depth + 1)).join(', ')}${value.length > 2 ? ', ...' : ''}`;
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, 25)
      .map(([k, v]) => `${k}: ${summarize(v, depth + 1)}`);
    return `{ ${entries.join(', ')} }`;
  }
  return String(value);
}

async function main() {
  const numeroPedidoRaw = process.argv[2] || '196395';
  const numeroPedido = sanitizeNumeroPedido(numeroPedidoRaw);

  const username = process.env.API_EXTERNA_USERNAME || '';
  const password = process.env.API_EXTERNA_PASSWORD || '';
  if (!username || !password) {
    console.error('API_EXTERNA_USERNAME/API_EXTERNA_PASSWORD nao configurados no .env');
    process.exit(1);
  }

  console.log('\n==== 1) buscarPedidoPorNumero ====');
  const pedidos = await apiExternaService.buscarPedidoPorNumero(numeroPedido, username, password);
  if (!pedidos || pedidos.length === 0) {
    console.error('Nenhum pedido encontrado.');
    process.exit(1);
  }

  for (const [i, p] of pedidos.entries()) {
    console.log(`\n-- pedido[${i}] (todos os campos) --`);
    console.log(JSON.stringify(p, null, 2));
  }

  const numeroDigitos = numeroPedido.replace(/\D/g, '');
  const pedido =
    pedidos.find((item) => String((item as any).NUMERO_PEDIDO ?? '').replace(/\D/g, '') === numeroDigitos) ||
    pedidos[0];

  const pedidoId = String(
    (pedido as any)?.ORCAMENTO_ID ??
      (pedido as any)?.PEDIDO_ID ??
      (pedido as any)?.ORCAMENTO_BASE_ID ??
      (pedido as any)?.ID ??
      ''
  );

  console.log('\n==== 2) id resolvido ====');
  console.log('pedidoId =', pedidoId);

  console.log('\n==== 3) buscarPedidoLogistica ====');
  const logistica = pedidoId
    ? await apiExternaService.buscarPedidoLogistica(pedidoId, username, password)
    : null;

  if (!logistica) {
    console.error('Logistica nao encontrada.');
    process.exit(1);
  }

  console.log('\n-- top-level keys --');
  console.log(Object.keys(logistica));
  console.log('\n-- resumo logistica --');
  console.log(summarize(logistica));

  const pedidoLog = (logistica as any)?.pedido || {};
  console.log('\n-- logistica.pedido (campos de cliente/CNPJ/transportadora) --');
  const camposInteresse = [
    'CLIENTE_NOME', 'NOME_RAZAO_SOCIAL', 'NOME_FANTASIA', 'NOME', 'RAZAO_SOCIAL', 'CLIENTE',
    'CNPJ', 'CNPJ_CPF', 'CNPJCPF', 'CPF_CNPJ', 'CPF',
    'ENTREGA_POR_TRANSPORTADORA', 'TRANSPORTADORA', 'TRANSPORTADORA_NOME', 'NOME_TRANSPORTADORA',
    'VOLUMES', 'QTD_VOLUMES', 'TOTAL_VOLUMES', 'VOLUME_TOTAL',
    'ORCAMENTO_ID', 'PEDIDO_ID', 'ORCAMENTO_BASE_ID', 'ID', 'NUMERO_PEDIDO', 'NUMERO_NOTA',
  ];
  for (const k of camposInteresse) {
    if (k in pedidoLog) {
      console.log(`  ${k} =`, JSON.stringify(pedidoLog[k]));
    }
  }
  console.log('  [outras chaves do pedido]:', Object.keys(pedidoLog).join(', '));

  if (pedidoLog?.cliente && typeof pedidoLog.cliente === 'object') {
    console.log('  pedido.cliente =', JSON.stringify(pedidoLog.cliente));
  }

  const notas = (logistica as any)?.notas_fiscais || [];
  const entregas = (logistica as any)?.entregas || [];
  console.log(`\n-- notas_fiscais (${notas.length}) --`);
  notas.forEach((nota: any, i: number) => {
    console.log(`  nota[${i}] =`, JSON.stringify(nota));
  });
  console.log(`\n-- entregas (${entregas.length}) --`);
  entregas.forEach((entrega: any, i: number) => {
    console.log(`  entrega[${i}] =`, JSON.stringify(entrega));
  });

  console.log('\n==== 4) mapearDadosPedidoParaEtiqueta ====');
  const dados = mapearDadosPedidoParaEtiqueta(logistica as Record<string, any>);
  console.log(JSON.stringify(dados, null, 2));
}

main().catch((err) => {
  console.error('Falha no diagnostico:', err);
  process.exit(1);
});
