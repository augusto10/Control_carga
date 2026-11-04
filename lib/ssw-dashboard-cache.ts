export type SswDashboardTrackingCachePayload = {
  found: boolean;
  delivered: boolean;
  status: string | null;
  message: string | null;
  deliveredAt: string | null;
  receiverName: string | null;
  photoUrl: string | null;
  occurrences: Array<{
    dataHora: string | null;
    ocorrencia: string | null;
    descricao: string | null;
    cidade: string | null;
    dominio: string | null;
  }>;
};

const isNullableString = (value: unknown) => value === null || typeof value === 'string';

export function parseSswDashboardTrackingCachePayload(
  serialized: string
): SswDashboardTrackingCachePayload | null {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  if (
    typeof payload.found !== 'boolean' ||
    typeof payload.delivered !== 'boolean' ||
    !isNullableString(payload.status) ||
    !isNullableString(payload.message) ||
    !isNullableString(payload.deliveredAt) ||
    !isNullableString(payload.receiverName) ||
    !isNullableString(payload.photoUrl) ||
    !Array.isArray(payload.occurrences)
  ) {
    return null;
  }

  const occurrences = payload.occurrences;
  if (occurrences.some((occurrence) => {
    if (!occurrence || typeof occurrence !== 'object' || Array.isArray(occurrence)) return true;
    const item = occurrence as Record<string, unknown>;
    return ['dataHora', 'ocorrencia', 'descricao', 'cidade', 'dominio']
      .some((key) => !isNullableString(item[key]));
  })) {
    return null;
  }

  return payload as SswDashboardTrackingCachePayload;
}
