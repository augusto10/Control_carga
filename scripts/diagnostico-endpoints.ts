import 'dotenv/config';
import axios from 'axios';

const API_EXTERNA_BASE = 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';

async function main() {
  const params = new URLSearchParams();
  params.append('username', process.env.API_EXTERNA_USERNAME || '');
  params.append('password', process.env.API_EXTERNA_PASSWORD || '');
  params.append('grant_type', 'password');
  const t = await axios.post(`${API_EXTERNA_BASE}/token`, params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30_000,
  });
  const token = t.data.access_token as string;
  console.log('token ok');

  for (const url of [
    '/api/v1/pedidos/196395',
    '/api/v1/transportadoras?limit=50',
    '/api/v1/transportadora?limit=50',
    '/api/v1/transportadores?limit=50',
  ]) {
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
        console.log('    erroBody:', JSON.stringify(body).slice(0, 300));
        continue;
      }
      if (Array.isArray(body)) {
        console.log('    array len=', body.length);
        console.log('    [0] =', JSON.stringify(body[0]).slice(0, 800));
      } else if (body && typeof body === 'object') {
        console.log('    keys =', Object.keys(body).join(', '));
        console.log('    JSON =', JSON.stringify(body).slice(0, 1200));
      }
    } catch (err: any) {
      console.log(`\n>>> GET ${url}`);
      console.log('    ERRO:', err.message);
    }
  }
}

main().catch((e) => {
  console.error('Falha:', e.message);
  process.exit(1);
});
