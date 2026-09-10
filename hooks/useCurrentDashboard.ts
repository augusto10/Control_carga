import { useCallback, useRef, useState, type SetStateAction } from 'react';
import { canReplaceDashboard, type DatedDashboard } from '@/lib/dashboard-freshness';

// A ref is updated immediately so consecutive responses cannot compare against stale React state.
export function useCurrentDashboard<T extends DatedDashboard | null>(initial: T, cacheKey: string) {
  const [value, setValue] = useState<T>(initial);
  const current = useRef(initial);
  const accept = useCallback((action: SetStateAction<T>) => {
    const isPartialUpdate = typeof action === 'function';
    const next = isPartialUpdate ? (action as (previous: T) => T)(current.current) : action as T;
    if (!next || next === current.current) return;
    if (!isPartialUpdate && !canReplaceDashboard(current.current, next)) return;
    // Another screen in this browser may already have saved a more recent response.
    try {
      const saved = JSON.parse(window.localStorage.getItem(cacheKey) || 'null') as T;
      if (saved && canReplaceDashboard(next, saved) &&
          (saved.filtros?.dataInicio || '') === (next.filtros?.dataInicio || '') &&
          (saved.filtros?.dataFim || '') === (next.filtros?.dataFim || '')) {
        if (canReplaceDashboard(current.current, saved)) {
          current.current = saved;
          setValue(saved);
        }
        return;
      }
    } catch { /* Ignore invalid or unavailable storage. */ }
    current.current = next;
    setValue(next);
    try { window.localStorage.setItem(cacheKey, JSON.stringify(next)); } catch { /* Storage is optional. */ }
  }, [cacheKey]);
  return [value, accept] as const;
}
