import assert from 'node:assert/strict';
import { resolveCachedSswTracking } from '../services/sswPersistentCache';
import type { SswTrackingResult } from '../services/sswTracking';

const delivered: SswTrackingResult = {
  found: true, delivered: true, status: 'MERCADORIA ENTREGUE', message: 'Entrega realizada',
  deliveredAt: '2026-11-25T12:00:00-03:00', receiverName: null, photoUrl: null,
  occurrences: [], source: 'tracking',
};
const pending: SswTrackingResult = { ...delivered, delivered: false, status: 'EM TRANSITO', deliveredAt: null };

async function main() {
  const rows = new Map<string, { result: SswTrackingResult; refreshAt: Date | null }>();
  const repository = {
    read: async (key: string) => rows.get(key) ?? null,
    save: async (key: string, result: SswTrackingResult) => { rows.set(key, { result, refreshAt: new Date(Date.now() + 60_000) }); },
  };
  let calls = 0;
  const fetchLive = async () => { calls++; return delivered; };

  rows.set('existing', { result: pending, refreshAt: new Date(Date.now() + 60_000) });
  assert.deepEqual(await resolveCachedSswTracking('existing', repository, fetchLive), pending);
  assert.equal(calls, 0, 'a consulta repetida deve responder pelo banco');

  assert.deepEqual(await resolveCachedSswTracking('new', repository, fetchLive), delivered);
  assert.equal(calls, 1);
  assert.deepEqual(rows.get('new')?.result, delivered);

  rows.set('expired', { result: pending, refreshAt: new Date(Date.now() - 1) });
  assert.deepEqual(await resolveCachedSswTracking('expired', repository, fetchLive), delivered);
  assert.equal(calls, 2, 'cache vencido deve buscar dados atualizados na SSW');
  rows.set('expired', { result: pending, refreshAt: new Date(Date.now() - 1) });
  const failed = async () => { throw new Error('SSW indisponivel'); };
  assert.deepEqual(await resolveCachedSswTracking('expired', repository, failed), pending);

  assert.deepEqual(await resolveCachedSswTracking('existing', repository, fetchLive, true), delivered);
  assert.equal(calls, 3, 'sincronizacao deve buscar na SSW mesmo com cache');
  assert.deepEqual(rows.get('existing')?.result, delivered);

  await assert.rejects(() => resolveCachedSswTracking('existing', repository, failed, true), /SSW indisponivel/);
  assert.deepEqual(rows.get('existing')?.result, delivered);
  const notFound = async (): Promise<SswTrackingResult> => ({ ...pending, found: false, source: null });
  await assert.rejects(() => resolveCachedSswTracking('existing', repository, notFound, true), /nao confirmou/);
  assert.deepEqual(rows.get('existing')?.result, delivered);
  await assert.rejects(() => resolveCachedSswTracking('missing', repository, failed), /SSW indisponivel/);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
