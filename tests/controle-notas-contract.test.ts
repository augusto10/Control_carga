import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const contractModule = resolve(__dirname, '../lib/controles/nota-control-contract.ts');
assert.ok(existsSync(contractModule), 'atomic control note contract should exist');

const {
  CONTROLE_NOTAS_CONFLICT_RESPONSE,
  controleCreateSchema,
  notasCompativeisComControle,
  vinculoCompleto,
} = require(contractModule) as {
  CONTROLE_NOTAS_CONFLICT_RESPONSE: { status: number; body: { error: string } };
  controleCreateSchema: { safeParse: (input: unknown) => { success: boolean } };
  notasCompativeisComControle: (
    requestedIds: string[],
    notas: Array<{ id: string; controleId: string | null; transportadoraDestino: string | null }>,
    transportadora: string
  ) => boolean;
  vinculoCompleto: (requestedCount: number, updatedCount: number) => boolean;
};
const { canDeleteControle } = require(resolve(__dirname, '../lib/auth/permissions.ts')) as {
  canDeleteControle: (
    user: { tipo: string } | null,
    controle: { finalizado: boolean; notasCount: number }
  ) => boolean;
};
const { canEditControle } = require(resolve(__dirname, '../lib/auth/permissions.ts')) as {
  canEditControle: (
    user: { tipo: string } | null,
    controle: { finalizado: boolean }
  ) => boolean;
};

assert.equal(controleCreateSchema.safeParse({
  motorista: 'Motorista',
  responsavel: 'Responsável',
  transportadora: 'ACCERT',
}).success, true);

assert.equal(notasCompativeisComControle(
  ['nota-1'],
  [{ id: 'nota-1', controleId: null, transportadoraDestino: 'EXPRESSO_GOIAS' }],
  'ACCERT'
), false);
assert.equal(notasCompativeisComControle(
  ['nota-1'],
  [{ id: 'nota-1', controleId: null, transportadoraDestino: 'ACCERT' }],
  'ACCERT'
), true);
assert.equal(notasCompativeisComControle(
  ['nota-legada'],
  [{ id: 'nota-legada', controleId: null, transportadoraDestino: null }],
  'ACCERT'
), true);

assert.equal(vinculoCompleto(2, 1), false);
assert.equal(vinculoCompleto(2, 2), true);
assert.equal(CONTROLE_NOTAS_CONFLICT_RESPONSE.status, 409);

assert.equal(canEditControle({ tipo: 'USUARIO' }, { finalizado: false }), true);
assert.equal(canEditControle({ tipo: 'USUARIO' }, { finalizado: true }), false);
assert.equal(canEditControle({ tipo: 'ADMIN' }, { finalizado: true }), true);
assert.equal(canDeleteControle({ tipo: 'USUARIO' }, { finalizado: false, notasCount: 0 }), false);
assert.equal(canDeleteControle({ tipo: 'ADMIN' }, { finalizado: true, notasCount: 0 }), true);
assert.equal(canDeleteControle({ tipo: 'ADMIN' }, { finalizado: false, notasCount: 1 }), true);
assert.equal(canDeleteControle({ tipo: 'ADMIN' }, { finalizado: true, notasCount: 3 }), true);
assert.equal(canDeleteControle({ tipo: 'ADMIN' }, { finalizado: false, notasCount: 0 }), true);

console.log('Contrato de controle atômico, concorrência e edição verificado.');
