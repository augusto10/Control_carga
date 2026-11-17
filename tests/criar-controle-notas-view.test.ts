import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const helperModule = resolve(__dirname, '../lib/controles/notas-direcionamento.ts');
assert.ok(existsSync(helperModule), 'available note view helpers should exist');

const {
  filtrarNotasDisponiveis,
  filtrarNotasSemTransportadora,
  limparSelecaoAoTrocarTransportadora,
  removerNotasTransferidas,
} = require(helperModule) as {
  filtrarNotasDisponiveis: <T extends {
    controleId: string | null;
    transportadoraDestino?: string | null;
  }>(notas: T[], destino: string) => T[];
  filtrarNotasSemTransportadora: <T extends {
    controleId: string | null;
    transportadoraDestino?: string | null;
  }>(notas: T[]) => T[];
  limparSelecaoAoTrocarTransportadora: (
    selecionadas: string[],
    atual: string,
    proxima: string
  ) => string[];
  removerNotasTransferidas: <T extends { id: string }>(notas: T[], ids: string[]) => T[];
};

const notas = [
  { id: 'accert', controleId: null, transportadoraDestino: 'ACCERT' },
  { id: 'linked', controleId: 'controle-1', transportadoraDestino: 'ACCERT' },
  { id: 'other', controleId: null, transportadoraDestino: 'EXPRESSO_GOIAS' },
  { id: 'unassigned', controleId: null, transportadoraDestino: null },
];

assert.deepEqual(
  filtrarNotasDisponiveis(notas, 'ACCERT').map((nota) => nota.id),
  ['accert']
);
assert.deepEqual(
  filtrarNotasSemTransportadora(notas).map((nota) => nota.id),
  ['unassigned']
);
assert.deepEqual(limparSelecaoAoTrocarTransportadora(['accert'], 'ACCERT', 'EXPRESSO_GOIAS'), []);
assert.deepEqual(
  removerNotasTransferidas(notas, ['accert']).map((nota) => nota.id),
  ['linked', 'other', 'unassigned']
);

console.log('Filtragem, seleção e remoção das notas transferidas verificadas.');
