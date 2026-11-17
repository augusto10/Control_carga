import assert from 'node:assert/strict';
import { sign } from 'jsonwebtoken';

// Substitui somente a fronteira externa do banco; executa o handler e a autenticação reais.
const controles = [{ id: 'c1', finalizado: false, transportadora: 'ACCERT', motorista: 'Original' }];
const notas = [
  { id: 'n1', controleId: 'c1' as string | null, transportadoraDestino: 'ACCERT' },
  { id: 'n2', controleId: null as string | null, transportadoraDestino: 'ACCERT' },
  { id: 'n3', controleId: 'outro' as string | null, transportadoraDestino: 'ACCERT' },
  { id: 'n4', controleId: null as string | null, transportadoraDestino: 'EXPRESSO_GOIAS' },
];
function matches(row: any, where: any): boolean {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (key === 'OR') return value.some((branch: any) => matches(row, branch));
    if (typeof value === 'object' && value !== null) {
      if (value.in) return value.in.includes(row[key]);
      if (value.notIn) return !value.notIn.includes(row[key]);
    }
    return row[key] === value;
  });
}
const pedidos = [{ id: 'p1', controleId: 'c1' as string | null }];
const itensFrete = [{ id: 'f1', controleId: 'c1' }];
function table(rows: any[]) {
  return {
    findUnique: async ({ where }: any) => rows.find((row) => matches(row, where)) ?? null,
    findUniqueOrThrow: async ({ where }: any) => ({ ...rows.find((row) => matches(row, where)), notas: notas.filter((nota) => nota.controleId === where.id) }),
    findMany: async ({ where }: any) => rows.filter((row) => matches(row, where)),
    updateMany: async ({ where, data }: any) => {
      const selected = rows.filter((row) => matches(row, where));
      selected.forEach((row) => Object.entries(data).forEach(([key, value]) => { if (value !== undefined) row[key] = value; }));
      return { count: selected.length };
    },
    deleteMany: async ({ where }: any) => {
      const selected = rows.filter((row) => matches(row, where));
      selected.forEach((row) => rows.splice(rows.indexOf(row), 1));
      return { count: selected.length };
    },
  };
}
const transaction = { controleCarga: table(controles), notaFiscal: table(notas), pedido: table(pedidos), fretePagamentoControle: table(itensFrete) };
const prismaPath = require.resolve('../lib/prisma');
require.cache[prismaPath] = { id: prismaPath, filename: prismaPath, loaded: true, exports: { __esModule: true, default: {
  $transaction: async (fn: any) => {
    const snapshots = [controles, notas, pedidos, itensFrete].map((rows) => structuredClone(rows));
    try { return await fn(transaction); } catch (error) {
      [controles, notas, pedidos, itensFrete].forEach((rows, index) => rows.splice(0, rows.length, ...snapshots[index] as any));
      throw error;
    }
  },
} } } as any;
const handler = require('../pages/api/controles/[id]').default;
async function request(method: string, tipo: string, body: any = {}) {
  const result = { status: 200, body: undefined as any };
  const res: any = {
    status(code: number) { result.status = code; return res; },
    json(value: any) { result.body = value; return res; },
    end() { return res; },
  };
  await handler({ method, body, query: { id: 'c1' }, cookies: { auth_token: sign({ id: 'u1', tipo }, process.env.JWT_SECRET || 'seu_segredo_secreto') } }, res);
  return result;
}
async function main() {
  const edited = await request('PUT', 'USUARIO', { motorista: 'Novo motorista', notasIds: ['n2'] });
  assert.equal(edited.status, 200);
  assert.equal(controles[0].motorista, 'Novo motorista');
  assert.deepEqual(notas.map((nota) => nota.controleId), [null, 'c1', 'outro', null], 'salvar deve substituir as notas sem tocar em outro controle');
  assert.equal((await request('PUT', 'USUARIO', { notasIds: ['n3'] })).status, 409);
  assert.equal(notas[1].controleId, 'c1', 'conflito deve preservar as notas anteriores');
  assert.equal((await request('PUT', 'USUARIO', { motorista: 'Não salvar', notasIds: ['n4'] })).status, 409);
  assert.equal(controles[0].motorista, 'Novo motorista', 'conflito nas notas desfaz também a troca de motorista');
  assert.equal((await request('PUT', 'USUARIO', { notasIds: ['inexistente'] })).status, 409);
  assert.equal((await request('PUT', 'USUARIO', { motorista: 'Sem alterar notas' })).status, 200);
  assert.equal(notas[1].controleId, 'c1', 'omitir notasIds deve preservar a seleção existente');
  assert.equal((await request('PUT', 'USUARIO', { notasIds: ['n2', 'n2'] })).status, 400);
  controles[0].finalizado = true;
  assert.equal((await request('PUT', 'USUARIO', { motorista: 'Bloqueado', notasIds: [] })).status, 403);
  assert.equal((await request('PUT', 'GERENTE', { notasIds: [] })).status, 403);
  assert.equal(controles[0].motorista, 'Sem alterar notas');
  assert.equal((await request('PUT', 'ADMIN', { motorista: 'Administrador', notasIds: ['n1', 'n2'] })).status, 200);
  assert.deepEqual(notas.slice(0, 2).map((nota) => nota.controleId), ['c1', 'c1'], 'administrador pode adicionar notas depois de finalizar');
  assert.equal((await request('PUT', 'ADMIN', { motorista: 'Administrador', notasIds: [] })).status, 200);
  assert.equal(notas[1].controleId, null);
  notas[0].controleId = 'c1';
  assert.equal((await request('DELETE', 'USUARIO')).status, 403);
  assert.equal(controles.length, 1);
  assert.equal((await request('DELETE', 'ADMIN')).status, 204);
  assert.equal(controles.length, 0);
  assert.equal(notas.length, 4, 'exclusão preserva as notas fiscais');
  assert.equal(notas[0].controleId, null);
  assert.equal(notas[2].controleId, 'outro');
  assert.equal(pedidos[0].controleId, null);
  assert.equal(itensFrete.length, 0);
  console.log('Edição e exclusão: permissões, seleção de notas, conflitos e preservação de dados verificados.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
