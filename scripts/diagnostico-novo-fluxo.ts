/**
 * Valida o NOVO fluxo da rota /api/etiquetas/pedido-info:
 *  1) /api/v1/pedidos/{numero}          (direto)
 *  2) fallback: /api/v1/pedidos (limit 100) + match exato
 *  3) /api/v1/pedidos/{id}/logistica
 *  4) /api/v1/clientes/{CADASTRO_ID}    (CNPJ/razao social)
 *  5) mapearDadosPedidoParaEtiqueta(logistica, clienteExterno)
 */

import 'dotenv/config';
import { apiExternaService } from '../services/api-externa';
import { mapearDadosPedidoParaEtiqueta } from '../lib/etiquetas-transporte';

async function main() {
  const numero = process.argv[2] || '196395';
  const username = process.env.API_EXTERNA_USERNAME || '';
  const password = process.env.API_EXTERNA_PASSWORD || '';

  // 1) Direto pelo id
  let pedido = await apiExternaService.buscarPedidoPorId(numero, username, password);
  console.log(
    'buscarPedidoPorId:',
    pedido
      ? JSON.stringify({
          ORCAMENTO_ID: pedido.ORCAMENTO_ID,
          CADASTRO_ID: pedido.CADASTRO_ID,
          CLIENTE_NOME: pedido.CLIENTE_NOME,
          NOME_FANTASIA: pedido.NOME_FANTASIA,
        })
      : null
  );

  // 2) Fallback: lista recente + match exato
  if (!pedido) {
    const lista = await apiExternaService.listarPedidos({ limit: 100 }, username, password);
    pedido =
      lista?.data?.find(
        (p) => String(p.ORCAMENTO_ID ?? p.PEDIDO_ID ?? p.ID ?? '').replace(/\D/g, '') === numero
      ) || null;
    console.log(
      'fallback lista:',
      pedido
        ? JSON.stringify({
            ORCAMENTO_ID: pedido.ORCAMENTO_ID,
            CADASTRO_ID: pedido.CADASTRO_ID,
            CLIENTE_NOME: pedido.CLIENTE_NOME,
          })
        : null
    );
  }

  if (!pedido) {
    console.log('NAO ENCONTRADO');
    return;
  }

  const pedidoId = String(
    pedido.ORCAMENTO_ID ?? pedido.PEDIDO_ID ?? pedido.ORCAMENTO_BASE_ID ?? pedido.ID ?? ''
  );
  const logistica = await apiExternaService.buscarPedidoLogistica(pedidoId, username, password);
  if (!logistica) {
    console.log('SEM LOGISTICA');
    return;
  }

  const cadastroId = String(pedido.CADASTRO_ID ?? (logistica.pedido as any)?.CADASTRO_ID ?? '');
  const clienteExterno = cadastroId
    ? await apiExternaService.buscarCliente(cadastroId, username, password)
    : null;

  console.log('clienteExterno:', JSON.stringify(clienteExterno));

  const dados = mapearDadosPedidoParaEtiqueta(
    logistica as Record<string, any>,
    clienteExterno as Record<string, any> | null
  );
  console.log('MAPPED =', JSON.stringify(dados, null, 2));
}

main().catch((e) => {
  console.error('Falha:', e.message);
  process.exit(1);
});
