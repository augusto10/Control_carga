import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { SswTrackingResult } from './sswTracking';
import type { SswTrackingRepository } from './sswPersistentCache';

function isTrackingResult(value: unknown): value is SswTrackingResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return typeof data.found === 'boolean'
    && typeof data.delivered === 'boolean'
    && Array.isArray(data.occurrences)
    && typeof data.source === 'string';
}

export const sswTrackingRepository: SswTrackingRepository = {
  async read(chaveNfe) {
    const row = await prisma.sswEntregaConsulta.findUnique({
      where: { chaveNfe },
      select: { trackingPayload: true },
    });
    return isTrackingResult(row?.trackingPayload) ? row.trackingPayload : null;
  },

  async save(chaveNfe, result) {
    const now = new Date();
    const nextRefreshAt = new Date(now.getTime() + (result.delivered ? 24 * 60 : 15) * 60_000);
    const status = result.status || result.message || 'SEM_SITUACAO';
    const payload = result as unknown as Prisma.InputJsonValue;
    await prisma.sswEntregaConsulta.upsert({
      where: { chaveNfe },
      create: {
        chaveNfe,
        situacao: status,
        entregue: result.delivered,
        sswStatus: result.status,
        dataEntrega: result.deliveredAt,
        trackingPayload: payload,
        consultadoEm: now,
        proximaConsultaEm: nextRefreshAt,
      },
      update: {
        situacao: status,
        entregue: result.delivered,
        sswStatus: result.status,
        dataEntrega: result.deliveredAt,
        trackingPayload: payload,
        consultadoEm: now,
        proximaConsultaEm: nextRefreshAt,
      },
    });
  },
};
