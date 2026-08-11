/**
 * Detalha o pedido 196395 (SANTO EXPEDITO MATERIAIS DE CONSTRUCAO):
 *  - nota fiscal por identificacao-nfe
 *  - cliente via /clientes/{CADASTRO_ID}  (CNPJ?)
 *  - logistica completa (transportadora? CNPJ? volumes?)
 */

import 'dotenv/config';
import axios from 'axios';

const API_EXTERNA_BASE = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';

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

async function get(token: string, url: string): Promise<void> {
  try {
    const resp = await axios.get(`${API_EXTERNA_BASE}${url}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 45_000,
      validateStatus: () => true,
    });
    const body: any = resp.data;
    console.log(`\n>>> GET ${url}`);
    console.log(`    status=${resp.status}`);
    if (resp.status >= 400) {
      console.log('    erroBody:', JSON.stringify(body).slice(0, 400));
      return;
    }
    if (Array.isArray(body)) {
      console.log('    (array) len=', body.length);
      console.log('    [0] =', JSON.stringify(body[0])?.slice(0, 2000));
    } else if (body && typeof body === 'object') {
      console.log('    keys =', Object.keys(body).join(', '));
      console.log('    JSON =', JSON.stringify(body)?.slice(0, 3000));
    } else {
      console.log('    ', body);
    }
  } catch (err: any) {
    console.log(`\n>>> GET ${url}`);
    console.log('    ERRO:', err.message);
  }
}

async function main() {
  const token = await loginToken();
  console.log('token ok');

  // 1) Nota fiscal por numero do pedido
  await get(token, `/api/v1/notas-fiscais/identificacao-nfe/196395`);

  // 2) Cliente SANTO EXPEDITO (CADASTRO_ID 25076)
  await get(token, `/api/v1/clientes/25076`);

  // 3) Logistica do pedido 196395 (relevante para transportadora/CNPJ/volumes)
  const resp = await axios.get(`${API_EXTERNA_BASE}/api/v1/pedidos/196395/logistica`, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 45_000,
    validateStatus: () => true,
  });
  const body: any = resp.data;
  console.log(`\n>>> GET /api/v1/pedidos/196395/logistica`);
  console.log(`    status=${resp.status}`);
  if (resp.status >= 400) {
    console.log('    erroBody:', JSON.stringify(body).slice(0, 400));
    return;
  }
  const ped = body?.pedido || {};
  console.log('    pedido.ORCAMENTO_ID =', ped.ORCAMENTO_ID);
  console.log('    pedido.CADASTRO_ID =', ped.CADASTRO_ID);
  console.log('    pedido.CLIENTE_NOME =', ped.CLIENTE_NOME);
  console.log('    pedido.NOME_FANTASIA =', ped.NOME_FANTASIA);
  console.log('    pedido.ENTREGA_POR_TRANSPORTADORA =', ped.ENTREGA_POR_TRANSPORTADORA);
  const campos = Object.keys(ped).filter((k) =>
    /CNPJ|CPF|TRANSPORTADORA|ENTREGA|FRETE|VOLUME/i.test(k)
  );
  console.log('    pedido.campos cnpj/transporte/volume =', campos.map((k) => `${k}=${JSON.stringify(ped[k])}`).join(' | '));
  if (ped.cliente && typeof ped.cliente === 'object') {
    console.log('    pedido.cliente =', JSON.stringify(ped.cliente));
  }
  const entregas = Array.isArray(body?.entregas) ? body.entregas : [];
  entregas.forEach((e: any, i: number) => {
    console.log(`    entrega[${i}] transporte =`, JSON.stringify(Object.fromEntries(
      Object.entries(e).filter(([k]) => /TRANSPORTADORA|CONHECIMENTO|MANIFEST|FRETE|CODIGO_RASTREIO/i.test(k))
    )));
  });
  const notas = Array.isArray(body?.notas_fiscais) ? body.notas_fiscais : [];
  notas.forEach((n: any, i: number) => {
    console.log(`    nota[${i}] =`, JSON.stringify(Object.fromEntries(
      Object.entries(n).filter(([k]) => /CNPJ|CLIENTE|VOLUME|TRANSPORTADORA|NOTA|SERIE|PESO|ENDERECO/i.test(k))
    )));
  });
}

main().catch((e) => {
  console.error('Falha:', e.message);
  process.exit(1);
});
