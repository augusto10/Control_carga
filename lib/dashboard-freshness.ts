export type DatedDashboard = {
  generatedAt: string;
  filtros?: { dataInicio?: string | null; dataFim?: string | null };
};

export function shouldPreferStoredDashboard(
  current: DatedDashboard | null,
  incoming: DatedDashboard,
  stored: DatedDashboard
): boolean {
  const storedTime = Date.parse(stored.generatedAt);
  const incomingTime = Date.parse(incoming.generatedAt);
  if (!Number.isFinite(storedTime) || !Number.isFinite(incomingTime)) return false;

  const samePeriod = (stored.filtros?.dataInicio || '') === (incoming.filtros?.dataInicio || '') &&
    (stored.filtros?.dataFim || '') === (incoming.filtros?.dataFim || '');
  if (!samePeriod) return false;

  const currentTime = current ? Date.parse(current.generatedAt) : NaN;
  if (Number.isFinite(currentTime) && currentTime > storedTime) return false;

  return storedTime > incomingTime;
}

export function canReplaceDashboard(current: DatedDashboard | null, incoming: DatedDashboard): boolean {
  const nextTime = Date.parse(incoming.generatedAt);
  if (!Number.isFinite(nextTime)) return false;
  if (!current) return true;
  const currentTotal = Array.isArray((current as any).indicadores)
    ? (current as any).indicadores.reduce((sum: number, item: any) => sum + (Number(item?.total) || 0), 0)
    : 0;
  const incomingTotal = Array.isArray((incoming as any).indicadores)
    ? (incoming as any).indicadores.reduce((sum: number, item: any) => sum + (Number(item?.total) || 0), 0)
    : 0;
  // Uma resposta vazia durante a atualização não pode apagar o último quadro válido.
  if (currentTotal > 0 && incomingTotal === 0) return false;
  const samePeriod = (current.filtros?.dataInicio || '') === (incoming.filtros?.dataInicio || '') &&
    (current.filtros?.dataFim || '') === (incoming.filtros?.dataFim || '');
  if (!samePeriod) return true;
  const currentTime = Date.parse(current.generatedAt);
  return !Number.isFinite(currentTime) || nextTime > currentTime;
}
