import assert from 'node:assert/strict';

let captured: any;
const prismaPath = require.resolve('../lib/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { __esModule: true, default: {
  controleCarga: { findMany: async (query: any) => { captured = query; return []; } },
} } } as any;
const handler = require('../pages/api/controles/index').default;
async function request(query: any) {
  captured = undefined;
  let status = 200;
  const res: any = { status(value: number) { status = value; return res; }, json() { return res; } };
  await handler({ method: 'GET', query }, res);
  return status;
}
async function main() {
  assert.equal(await request({}), 200);
  assert.equal(captured.take, 50, 'consulta sem filtros deve limitar o histórico');
  assert.equal(await request({ limit: '200', motorista: 'José', transportadora: 'ACCERT' }), 200);
  assert.equal(captured.take, 200);
  assert.equal(captured.where.motorista.contains, 'José');
  assert.equal(captured.where.transportadora, 'ACCERT');
  for (const query of [{ limit: 'abc' }, { limit: '0' }, { limit: '-1' }, { limit: '201' }, { limit: ['50', '100'] }, { start: 'invalida', end: '2026-11-17' }, { transportadora: 'INVALIDA' }]) {
    assert.equal(await request(query), 400, `consulta inválida deve retornar 400: ${JSON.stringify(query)}`);
    assert.equal(captured, undefined, 'não deve consultar o banco com filtros inválidos');
  }
  console.log('Listagem limitada, filtros válidos e rejeição de consultas inválidas verificados.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
