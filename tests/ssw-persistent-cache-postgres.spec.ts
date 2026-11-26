import assert from 'node:assert/strict';
import prisma from '../lib/prisma';
import { resolveCachedSswTracking } from '../services/sswPersistentCache';
import { sswTrackingRepository } from '../services/sswTrackingRepository';
import type { SswTrackingResult } from '../services/sswTracking';

const databaseUrl = process.env.DATABASE_URL || '';
const parsedUrl = new URL(databaseUrl);
if (!['127.0.0.1', 'localhost'].includes(parsedUrl.hostname)) {
  throw new Error('Este teste exige um PostgreSQL local e isolado');
}

const chaveNfe = '00000000000000000000000000000000000000000001';
const result: SswTrackingResult = {
  found: true,
  delivered: false,
  status: 'EM TRANSITO',
  message: 'Carga em transporte',
  deliveredAt: null,
  receiverName: null,
  photoUrl: null,
  occurrences: [],
  source: 'tracking',
};

async function main() {
  await prisma.sswEntregaConsulta.deleteMany({ where: { chaveNfe } });
  let liveCalls = 0;
  const fetchLive = async () => { liveCalls++; return result; };

  try {
    assert.deepEqual(await resolveCachedSswTracking(chaveNfe, sswTrackingRepository, fetchLive), result);
    assert.deepEqual(await resolveCachedSswTracking(chaveNfe, sswTrackingRepository, fetchLive), result);
    assert.equal(liveCalls, 1, 'segunda leitura deve vir do PostgreSQL');

    const saved = await prisma.sswEntregaConsulta.findUniqueOrThrow({ where: { chaveNfe } });
    assert.deepEqual(saved.trackingPayload, result);
    assert.equal(saved.entregue, false);
    assert.ok(saved.proximaConsultaEm && saved.proximaConsultaEm > saved.consultadoEm);

    const delivered: SswTrackingResult = { ...result, delivered: true, status: 'ENTREGUE', deliveredAt: '2026-11-25T12:00:00-03:00' };
    assert.deepEqual(await resolveCachedSswTracking(chaveNfe, sswTrackingRepository, async () => delivered, true), delivered);
    assert.deepEqual(await sswTrackingRepository.read(chaveNfe), delivered);
    assert.equal((await prisma.sswEntregaConsulta.findUniqueOrThrow({ where: { chaveNfe } })).entregue, true);
  } finally {
    await prisma.sswEntregaConsulta.deleteMany({ where: { chaveNfe } });
    await prisma.$disconnect();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
