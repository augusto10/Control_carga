import assert from 'node:assert/strict';
import { parseSswDashboardTrackingCachePayload } from '../lib/ssw-dashboard-cache';

const payload = {
  found: true,
  delivered: false,
  status: 'Em trânsito',
  message: 'Mercadoria em transferência',
  deliveredAt: null,
  receiverName: null,
  photoUrl: null,
  occurrences: [{
    dataHora: '2026-11-04T10:00:00-03:00',
    ocorrencia: 'EM TRANSFERENCIA',
    descricao: null,
    cidade: 'Goiânia',
    dominio: 'Transportadora',
  }],
};

assert.deepEqual(parseSswDashboardTrackingCachePayload(JSON.stringify(payload)), payload);
assert.equal(parseSswDashboardTrackingCachePayload('{invalid json'), null);
assert.equal(parseSswDashboardTrackingCachePayload(JSON.stringify({
  ...payload,
  found: 'true',
})), null);
assert.equal(parseSswDashboardTrackingCachePayload(JSON.stringify({
  ...payload,
  occurrences: [{ ...payload.occurrences[0], cidade: 12 }],
})), null);

console.log('Leitura e validação do cache SSW: 4 verificações passaram.');
