import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const transportadoraModule = resolve(__dirname, '../lib/notas/transportadora.ts');
const permissionsModule = resolve(__dirname, '../lib/auth/permissions.ts');

assert.ok(existsSync(transportadoraModule), 'transportadora helpers should exist');
assert.ok(existsSync(permissionsModule), 'control permissions helper should exist');

const { isTransportadora, normalizeNotaIdentity } = require(transportadoraModule) as {
  isTransportadora: (value: unknown) => boolean;
  normalizeNotaIdentity: (input: { codigo?: string | null; numeroNota?: string | null }) => string | null;
};
const { canEditControle } = require(permissionsModule) as {
  canEditControle: (
    user: { tipo: string } | null | undefined,
    controle: { finalizado: boolean }
  ) => boolean;
};

assert.equal(
  normalizeNotaIdentity({ codigo: '  000abc-12 ', numeroNota: '0000456' }),
  'codigo:000ABC-12'
);
assert.equal(
  normalizeNotaIdentity({ codigo: ' ', numeroNota: '000-0456' }),
  'numero:456'
);
assert.equal(normalizeNotaIdentity({ codigo: '', numeroNota: '---' }), null);

assert.equal(isTransportadora('ACCERT'), true);
assert.equal(isTransportadora('TRANSPORTADORA_INVALIDA'), false);
assert.equal(isTransportadora(undefined), false);

assert.equal(canEditControle(null, { finalizado: false }), false);
assert.equal(canEditControle({ tipo: 'USUARIO' }, { finalizado: false }), true);
assert.equal(canEditControle({ tipo: 'USUARIO' }, { finalizado: true }), false);
assert.equal(canEditControle({ tipo: 'ADMIN' }, { finalizado: true }), true);

console.log('Regras de identidade, enum e edição de controles verificadas.');
