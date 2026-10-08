import assert from 'node:assert/strict';
import { isDashboardSnapshotFresh, shouldPreferStoredDashboard } from '../lib/dashboard-freshness';

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
assert.equal(isDashboardSnapshotFresh('2024-01-10T11:55:00.000Z', 10 * 60_000, Date.parse('2024-01-10T12:00:00.000Z')), true);
assert.equal(isDashboardSnapshotFresh('2024-01-10T11:40:00.000Z', 10 * 60_000, Date.parse('2024-01-10T12:00:00.000Z')), false);
assert.equal(isDashboardSnapshotFresh(null, 10 * 60_000, Date.parse('2024-01-10T12:00:00.000Z')), false);
console.log('Freshness e validade do snapshot: 5 verificacoes passaram.');
