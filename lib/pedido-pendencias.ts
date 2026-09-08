const numero = (value: unknown): number | null => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const parsed = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function saldoPendente(item: Record<string, unknown>): number {
  const devolvidos = numero(item.DEVOLVIDOS ?? item.devolvidos ?? item.QUANTIDADE_DEVOLVIDA ?? item.quantidade_devolvida ?? item.QTD_DEVOLVIDA) ?? 0;
  const quantidade = numero(item.QUANTIDADE ?? item.quantidade ?? item.QTD ?? item.qtd);
  const baixada = numero(item.QUANTIDADE_BAIXADA ?? item.quantidade_baixada ?? item.QTD_BAIXADA) ?? 0;
  const limiteAposDevolucao = devolvidos > 0 && quantidade !== null
    ? Math.max(0, quantidade - baixada - devolvidos) : Infinity;
  // Saldos informados pelo ERP ja consideram as baixas/devolucoes.
  // Zero e definitivo: nao recorrer a quantidades historicas nesse caso.
  for (const campo of ['SALDO_PENDENTE', 'QUANTIDADE_PENDENTE_TOTAL', 'QUANTIDADE_PENDENTE',
    'EM_SEPARACAO_PENDENTE', 'SALDO_NA_SEPARACAO', 'SALDO', 'QUANTIDADE_EM_SEPARACAO',
    'QTD_EM_SEPARACAO_TRAN_ENT_PEN', 'SALDO_GERAR_SEPARACAO']) {
    const saldo = numero(item[campo] ?? item[campo.toLowerCase()]);
    if (saldo !== null) return Math.min(limiteAposDevolucao, Math.max(0, saldo));
  }
  return Math.max(0,
    (quantidade ?? 0) - baixada - devolvidos);
}

export function itensComSaldoPendente(logistica: Record<string, any> | null): Record<string, any>[] | null {
  if (['S', 'SIM', 'TRUE', '1'].includes(String(logistica?.pedido?.TOTALMENTE_DEVOLVIDO ?? '').trim().toUpperCase())) return [];
  const comparativo = logistica?.comparativo_separacao_pendentes;
  const entregas = logistica?.itens_entregas_pendentes;
  if (!Array.isArray(comparativo) || comparativo.length === 0) {
    return Array.isArray(entregas) ? entregas : Array.isArray(comparativo) ? [] : null;
  }
  // O comparativo e os itens de entrega podem atualizar em momentos diferentes.
  // Uma devolucao registrada limita o saldo do mesmo produto no comparativo.
  const porProduto = new Map<string, { saldo: number; devolvido: boolean }>();
  const chave = (item: Record<string, unknown>) => {
    const id = item.PRODUTO_ID ?? item.produto_id ?? item.CODIGO_ORIGINAL ?? item.codigo_original;
    return id === null || id === undefined ? null : String(id);
  };
  for (const item of Array.isArray(entregas) ? entregas : []) {
    const id = chave(item);
    if (id === null) continue;
    const atual = porProduto.get(id) || { saldo: 0, devolvido: false };
    atual.saldo += saldoPendente(item);
    atual.devolvido ||= (numero(item.DEVOLVIDOS ?? item.devolvidos ?? item.QUANTIDADE_DEVOLVIDA) ?? 0) > 0;
    porProduto.set(id, atual);
  }
  return comparativo.map((item: Record<string, unknown>) => {
    const id = chave(item);
    const entrega = id === null ? null : porProduto.get(id);
    if (!entrega?.devolvido) return item;
    const saldo = Math.min(saldoPendente(item), entrega.saldo);
    entrega.saldo -= saldo;
    return { ...item, SALDO_PENDENTE: saldo };
  });
}

export function saldoDetalhadoPendente(logistica: Record<string, any> | null): boolean | null {
  const itens = itensComSaldoPendente(logistica);
  return itens === null ? null : itens.some((item) => saldoPendente(item) > 0);
}
