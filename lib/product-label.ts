export function formatProductAdm(value: string): string {
  const normalized = value.trim();
  return /^\d+$/.test(normalized)
    ? normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : normalized;
}
