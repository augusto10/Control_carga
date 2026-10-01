/**
 * Teste de variantes de busca de pedido na API externa.
 * Verifica qual combinacao de parametros resolve corretamente o pedido 196395.
 */

import 'dotenv/config';
import axios from 'axios';

const API_EXTERNA_BASE = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';
const NUMERO = '196395';

async function loginToken(): Promise<string> {
  const params = new URLSearchParams();
  params.append('username', process.env.API_EXTERNA_USERNAME || '');
  params.append('password', process.env.API_EXTERNA_PASSWORD || '');
  params.append('grant_type', 'password');
  const resp = await axios.post(`${API_EXTERNA_BASE}/token`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30_000,
  });
  return resp.data.access_token as string;
}

async function tryBusca(token: string, url: string): Promise<void> {
  try {
    const resp = await axios.get(`${API_EXTERNA_BASE}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 45_000,
      validateStatus: () => true,
    });
    const body: any = resp.data || {};
    const itens = Array.isArray(body.data) ? body.data : [];
    console.log(`\n>>> GET ${url}`);
    console.log(`    status=${resp.status} total=${body.total} retornados=${itens.length}`);
    for (const p of itens) {
      console.log(
        JSON.stringify({
          ORCAMENTO_ID: p.ORCAMENTO_ID,
          NUMERO_PEDIDO: p.NUMERO_PEDIDO,
          CADASTRO_ID: p.CADASTRO_ID,
          CLIENTE_NOME: p.CLIENTE_NOME,
          NOME_FANTASIA: p.NOME_FANTASIA,
          CPF_CNPJ_CONSUMIDOR_FINAL: p.CPF_CNPJ_CONSUMIDOR_FINAL,
        })
      );
    }
    if (resp.status >= 400) console.log('    erroBody:', JSON.stringify(body).slice(0, 300));
  } catch (err: any) {
    console.log(`\n>>> GET ${url}`);
    console.log('    ERRO:', err.message);
  }
}

async function main() {
  const token = await loginToken();
  console.log('token ok');

  await tryBusca(token, `/api/v1/pedidos?numero_pedido=${NUMERO}&limit=5`);
  await tryBusca(token, `/api/v1/pedidos?numeroPedido=${NUMERO}&limit=5`);
  await tryBusca(token, `/api/v1/pedidos?numero=${NUMERO}&limit=5`);
  await tryBusca(token, `/api/v1/pedidos?search=${NUMERO}&limit=5`);
  await tryBusca(token, `/api/v1/pedidos?numero_pedido=${NUMERO}&numeroPedido=${NUMERO}&limit=5`);
  await tryBusca(token, `/api/v1/pedidos?limit=10`);
  await tryBusca(token, `/api/v1/consultas/notas-fiscais?numero_pedido=${NUMERO}&numeroPedido=${NUMERO}&limit=5`);
}

main().catch((e) => {
  console.error('Falha:', e.message);
  process.exit(1);
});
