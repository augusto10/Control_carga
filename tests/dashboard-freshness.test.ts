import assert from 'node:assert/strict';
import { shouldPreferStoredDashboard } from '../lib/dashboard-freshness';

const current = {
  generatedAt: '2024-01-10T10:00:00.000Z',
  filtros: { dataInicio: '2024-01-01', dataFim: '2024-01-31' },
  indicadores: [{ total: 5 }],
};

const incoming = {
  generatedAt: '2024-01-10T11:00:00.000Z',
  filtros: { dataInicio: '2024-01-01', dataFim: '2024-01-31' },
  indicadores: [{ total: 7 }],
};

const stored = {
  generatedAt: '2024-01-10T10:30:00.000Z',
  filtros: { dataInicio: '2024-01-01', dataFim: '2024-01-31' },
  indicadores: [{ total: 6 }],
};

const newerStored = {
  generatedAt: '2024-01-10T12:00:00.000Z',
  filtros: { dataInicio: '2024-01-01', dataFim: '2024-01-31' },
  indicadores: [{ total: 8 }],
};

assert.equal(shouldPreferStoredDashboard(current, incoming, stored), false);
assert.equal(shouldPreferStoredDashboard(current, incoming, newerStored), true);
console.log('Freshness precedence: 2 verificacoes passaram.');
