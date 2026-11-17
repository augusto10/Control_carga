export function filtrarNotasDisponiveis<T extends {
  controleId: string | null;
  transportadoraDestino?: string | null;
}>(notas: T[], destino: string): T[] {
  return notas.filter((nota) => (
    nota.controleId === null && nota.transportadoraDestino === destino
  ));
}

export function filtrarNotasSemTransportadora<T extends {
  controleId: string | null;
  transportadoraDestino?: string | null;
}>(notas: T[]): T[] {
  return notas.filter((nota) => (
    nota.controleId === null && nota.transportadoraDestino == null
  ));
}

export function limparSelecaoAoTrocarTransportadora(
  selecionadas: string[],
  atual: string,
  proxima: string
): string[] {
  return atual === proxima ? selecionadas : [];
}

export function removerNotasTransferidas<T extends { id: string }>(
  notas: T[],
  ids: string[]
): T[] {
  const transferidas = new Set(ids);
  return notas.filter((nota) => !transferidas.has(nota.id));
}
