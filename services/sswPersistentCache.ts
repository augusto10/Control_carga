import type { SswTrackingResult } from './sswTracking';

export type SswTrackingRepository = {
  read(chaveNfe: string): Promise<{ result: SswTrackingResult; refreshAt: Date | null } | null>;
  save(chaveNfe: string, result: SswTrackingResult): Promise<void>;
};

export async function resolveCachedSswTracking(
  chaveNfe: string,
  repository: SswTrackingRepository,
  fetchLive: () => Promise<SswTrackingResult>,
  forceRefresh = false,
): Promise<SswTrackingResult> {
  let cached: SswTrackingResult | null = null;
  let refreshAt: Date | null = null;
  try {
    const row = await repository.read(chaveNfe);
    cached = row?.result ?? null;
    refreshAt = row?.refreshAt ?? null;
  } catch (error) {
    console.warn('[SSW] Falha ao ler cache persistente:', error);
  }

  if (cached && !forceRefresh && refreshAt && refreshAt.getTime() > Date.now()) return cached;

  try {
    const result = await fetchLive();
    if (result.found && result.source) {
      try {
        await repository.save(chaveNfe, result);
      } catch (error) {
        console.warn('[SSW] Falha ao salvar cache persistente:', error);
      }
    }
    if (forceRefresh && cached && !result.found) {
      throw new Error('SSW nao confirmou a atualizacao do rastreamento');
    }
    return cached && !result.found ? cached : result;
  } catch (error) {
    if (cached && !forceRefresh) return cached;
    throw error;
  }
}
