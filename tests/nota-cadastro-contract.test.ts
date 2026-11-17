import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const contractModule = resolve(__dirname, '../lib/notas/salvar-multiplas-contract.ts');
assert.ok(existsSync(contractModule), 'nota save contract should exist');

const {
  DUPLICATE_NOTE_RESPONSE,
  getNotaIdentityLookupQuery,
  getNotasIdentityLookupQuery,
  salvarMultiplasNotasSchema,
} = require(contractModule) as {
  DUPLICATE_NOTE_RESPONSE: {
    status: number;
    body: { error: string; message: string };
  };
  getNotaIdentityLookupQuery: (nota: { codigo: string; numeroNota: string }) => {
    sql: string;
    values: unknown[];
  } | null;
  getNotasIdentityLookupQuery: (notas: Array<{ codigo: string; numeroNota: string }>) => {
    sql: string;
    values: unknown[];
  } | null;
  salvarMultiplasNotasSchema: {
    safeParse: (input: unknown) => {
      success: boolean;
      data?: { notas: Array<{ transportadoraDestino: string | null }> };
    };
  };
};

const payloadNovo = salvarMultiplasNotasSchema.safeParse({
  notas: [{
    codigo: '00012345678901234567890123456789012345678901',
    numeroNota: '123456789',
    volumes: '2',
    transportadoraDestino: 'ACCERT',
  }],
});
assert.equal(payloadNovo.success, true);

const payloadLegado = salvarMultiplasNotasSchema.safeParse({
  notas: [{ codigo: 'MANUAL-456', numeroNota: '456', volumes: '1' }],
});
assert.equal(payloadLegado.success, true);
assert.equal(payloadLegado.data?.notas[0].transportadoraDestino, null);

const duplicidadeNoLote = salvarMultiplasNotasSchema.safeParse({
  notas: [
    { codigo: 'MANUAL-456', numeroNota: '456' },
    { codigo: 'MANUAL-0456', numeroNota: '000456' },
  ],
});
assert.equal(duplicidadeNoLote.success, false);

assert.deepEqual(DUPLICATE_NOTE_RESPONSE, {
  status: 409,
  body: { error: 'duplicate_note', message: 'Esta nota já está salva' },
});

const identidadePersistida = getNotaIdentityLookupQuery({
  codigo: 'MANUAL-123',
  numeroNota: '123',
});
assert.ok(identidadePersistida);
assert.match(identidadePersistida.sql, /REGEXP_REPLACE/);
assert.match(identidadePersistida.sql, /LTRIM/);
assert.ok(identidadePersistida.values.includes('123'));

const identidadesDoLote = getNotasIdentityLookupQuery([
  { codigo: 'MANUAL-123', numeroNota: '123' },
  { codigo: 'MANUAL-456', numeroNota: '456' },
]);
assert.ok(identidadesDoLote);
assert.match(identidadesDoLote.sql, /\bOR\b/);
assert.ok(identidadesDoLote.values.includes('123'));
assert.ok(identidadesDoLote.values.includes('456'));

console.log('Contrato de cadastro, legado e conflito de duplicidade verificado.');
