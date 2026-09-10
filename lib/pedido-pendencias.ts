const numero = (value: unknown): number | null => {
  if (value === null || value === undefined || (typeof value === 'string' && !value.trim())) return null;
  const parsed = Number(typeof value === 'string' ? value.replace(',', '.') : value);
  return Number.isFinite(parsed) ? parsed : null;
};

const SIM = new Set(['S', 'SIM', 'TRUE', '1', 'Y', 'YES']);

const ehVerdadeiro = (value: unknown) => SIM.has(String(value ?? '').trim().toUpperCase());

/** Usa o ADM do produto no painel; CODIGO_ORIGINAL e CODIGO_BARRAS sao apenas identificadores auxiliares. */
export const codigoAdmDoProduto = (item: Record<string, unknown>): string | null =>
  ['CODIGO_ADM', 'codigo_adm', 'CODIGO_ADM_PRODUTO', 'codigoAdm', 'ADM', 'adm']
    .map((campo) => item[campo])
    .map((value) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '')
    .find(Boolean) || null;

const temQuantidadeDevolvida = (value: Record<string, unknown>) =>
  ['DEVOLVIDOS', 'devolvidos', 'QUANTIDADE_DEVOLVIDA', 'quantidade_devolvida', 'QTD_DEVOLVIDA', 'qtd_devolvida']
    .some((campo) => (numero(value[campo]) ?? 0) > 0);

const temStatusDevolucao = (value: Record<string, unknown>) =>
  Object.entries(value).some(([campo, dado]) =>
    /devolu|devolvido/i.test(campo) &&
    (ehVerdadeiro(dado) ||
      (typeof dado === 'string' && /devolu|devolvido/i.test(dado)) ||
      (Array.isArray(dado) && dado.length > 0) ||
      (dado !== null && typeof dado === 'object' && Object.keys(dado as object).length > 0) ||
      temQuantidadeDevolvida({ [campo]: dado }))
  );

/** Regra do painel: qualquer devolução tira o pedido do quadro de pendências. */
export function pedidoTemDevolucao(
  pedido: Record<string, unknown> | null | undefined,
  logistica: Record<string, any> | null | undefined
): boolean {
  const valores = [pedido, (pedido as any)?.logistica, logistica, logistica?.pedido, logistica?.status_logistico].filter(
    (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')
  );
  if (valores.some(temStatusDevolucao)) return true;

  for (const raiz of valores) {
    for (const campo of ['devolucoes', 'devolvidos', 'itens_devolucoes', 'entregas_devolvidas']) {
      const itens = raiz[campo];
      if (Array.isArray(itens) && itens.length > 0) return true;
    }
    for (const campo of ['entregas', 'itens_entregas_pendentes', 'comparativo_separacao_pendentes']) {
      const itens = raiz[campo];
      if (Array.isArray(itens) && itens.some((item) => item && typeof item === 'object' && (temStatusDevolucao(item) || temQuantidadeDevolvida(item)))) return true;
    }
  }
  return false;
}

/** Pendencia só pode ser exibida depois que o ERP gerar a entrega do pedido. */
export function pedidoTemEntregaGerada(
  pedido: Record<string, unknown> | null | undefined,
  logistica: Record<string, any> | null | undefined
): boolean {
  const valores = [pedido, (pedido as any)?.logistica, logistica, logistica?.pedido].filter(
    (item): item is Record<string, unknown> => Boolean(item && typeof item === 'object')
  );
  return valores.some((raiz) =>
    (['entregas', 'itens_entregas_pendentes'].some((campo) => Array.isArray(raiz[campo]) && (raiz[campo] as unknown[]).length > 0)) ||
    ['ENTREGA_ID', 'entrega_id', 'ULTIMA_ENTREGA_ID', 'ultima_entrega_id', 'ENTREGA_GERADA', 'entrega_gerada']
      .some((campo) => raiz[campo] !== null && raiz[campo] !== undefined && String(raiz[campo]).trim() !== '' && String(raiz[campo]).trim() !== '0')
  );
}

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
