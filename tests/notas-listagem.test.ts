import assert from 'node:assert/strict';
import type { NextApiRequest, NextApiResponse } from 'next';

// Simula somente a fronteira externa que rejeita consultas acima de 5 MB.
// Datas iguais nas fronteiras dos lotes não podem perder ou duplicar notas.
const notas = Array.from({ length: 2501 }, (_, index) => ({
  id: String(3000 - index),
  dataCriacao: new Date('2026-11-16T12:00:00Z'),
  codigo: `MANUAL-${index}`,
  numeroNota: String(index),
  controleId: null,
  usuarioId: null,
  volumes: '1',
  transportadoraDestino: null,
  controle: null,
  usuario: null,
}));
let registros = notas;

Object.assign(globalThis, { prisma: {
  notaFiscal: {
    async findMany(query: any) {
      if (!query.take || query.take > 1000) {
        throw new Error('P6009: response exceeded maximum of 5MB');
      }
      assert.equal(query.orderBy[0].dataCriacao, 'desc');
      assert.equal(query.orderBy[1].id, 'desc');
      const rows = registros.filter((nota) => (
        !query.where.numeroNota
        || nota.numeroNota.includes(query.where.numeroNota.contains)
      ));
      const start = query.cursor
        ? rows.findIndex((nota) => nota.id === query.cursor.id) + query.skip
        : 0;
      return rows.slice(start, start + query.take);
    },
  },
} });

const handler = require('../pages/api/notas').default;

async function consultar(query: Record<string, string>) {
  let status = 0;
  let body: unknown;
  const res = {
    status(code: number) { status = code; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as NextApiResponse;
  await handler({ method: 'GET', query } as NextApiRequest, res);
  assert.equal(status, 200);
  return body;
}

(async () => {
  assert.deepEqual(await consultar({}), notas);
  assert.deepEqual(await consultar({ numeroNota: '2500' }), [notas[2500]]);
  assert.deepEqual(await consultar({ numeroNota: 'inexistente' }), []);
  registros = notas.slice(0, 2000);
  assert.deepEqual(await consultar({}), notas.slice(0, 2000));
  registros = [];
  assert.deepEqual(await consultar({}), []);
  console.log('Listagem retorna todas as notas sem ultrapassar o limite por consulta.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
