import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const contractModule = resolve(__dirname, '../lib/notas/transferencia-contract.ts');
assert.ok(existsSync(contractModule), 'note transfer contract should exist');

const {
  notasDisponiveisQuerySchema,
  buildNotasDisponiveisWhere,
  NOTA_TRANSFERENCIA_CONFLICT_RESPONSE,
  transferenciaNotasSchema,
} = require(contractModule) as {
  notasDisponiveisQuerySchema: { safeParse: (input: unknown) => { success: boolean } };
  buildNotasDisponiveisWhere: (filters: {
    semTransportadora?: boolean;
    transportadoraDestino?: string;
  }) => Record<string, unknown>;
  NOTA_TRANSFERENCIA_CONFLICT_RESPONSE: {
    status: number;
    body: { error: string };
  };
  transferenciaNotasSchema: { safeParse: (input: unknown) => { success: boolean } };
};

assert.equal(notasDisponiveisQuerySchema.safeParse({
  disponiveis: '1',
  transportadoraDestino: 'ACCERT',
}).success, true);
assert.equal(notasDisponiveisQuerySchema.safeParse({
  disponiveis: '1',
  semTransportadora: '1',
}).success, true);
assert.equal(notasDisponiveisQuerySchema.safeParse({
  disponiveis: '1',
  transportadoraDestino: 'INVALIDA',
}).success, false);

assert.deepEqual(buildNotasDisponiveisWhere({}), {
  controleId: null,
  transportadoraDestino: { not: null },
});
assert.deepEqual(buildNotasDisponiveisWhere({ semTransportadora: true }), {
  controleId: null,
  transportadoraDestino: null,
});
assert.deepEqual(buildNotasDisponiveisWhere({ transportadoraDestino: 'ACCERT' }), {
  controleId: null,
  transportadoraDestino: 'ACCERT',
});

assert.equal(transferenciaNotasSchema.safeParse({
  notaIds: ['nota-1', 'nota-1'],
  transportadoraDestino: 'ACCERT',
}).success, false);
assert.equal(transferenciaNotasSchema.safeParse({
  notaIds: ['nota-1'],
  transportadoraDestino: 'INVALIDA',
}).success, false);
assert.equal(transferenciaNotasSchema.safeParse({
  notaIds: ['nota-vinculada'],
  transportadoraDestino: 'ACCERT',
}).success, true);

assert.equal(NOTA_TRANSFERENCIA_CONFLICT_RESPONSE.status, 409);
assert.equal(NOTA_TRANSFERENCIA_CONFLICT_RESPONSE.body.error, 'notes_unavailable');

console.log('Contrato de filtros e transferência de notas verificado.');
