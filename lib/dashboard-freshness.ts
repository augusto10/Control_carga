export type DatedDashboard = {
  generatedAt: string;
  filtros?: { dataInicio?: string | null; dataFim?: string | null };
};

export function canReplaceDashboard(current: DatedDashboard | null, incoming: DatedDashboard): boolean {
  const nextTime = Date.parse(incoming.generatedAt);
  if (!Number.isFinite(nextTime)) return false;
  if (!current) return true;
  const samePeriod = (current.filtros?.dataInicio || '') === (incoming.filtros?.dataInicio || '') &&
    (current.filtros?.dataFim || '') === (incoming.filtros?.dataFim || '');
  if (!samePeriod) return true;
  const currentTime = Date.parse(current.generatedAt);
  return !Number.isFinite(currentTime) || nextTime > currentTime;
}
