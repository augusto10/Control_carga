type DadosNota = Record<string, unknown>;

const objeto = (value: unknown): DadosNota => value !== null && typeof value === 'object' ? value as DadosNota : {};
const texto = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) return String(value).trim();
  }
  return undefined;
};
const numero = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    let raw = String(value).trim().replace(/R\$\s*/g, '').replace(/\s/g, '');
    if (!raw) continue;
    if (raw.includes(',')) raw = raw.replace(/\./g, '').replace(',', '.');
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

export function temDadosCompletosNotaPdf(nota: unknown): boolean {
  const dados = objeto(nota);
  return typeof dados.valorPedido === 'number' && Number.isFinite(dados.valorPedido)
    && typeof dados.pesoBruto === 'number' && Number.isFinite(dados.pesoBruto)
    && Boolean(texto(dados.razaoSocial))
    && Boolean(texto(dados.cnpj))
    && Boolean(texto(dados.dataEmissao))
    && !Number.isNaN(Date.parse(String(dados.dataEmissao)));
}

export function dadosPdfCompletos(controle: { notas?: unknown[] }): boolean {
  return Array.isArray(controle.notas) && controle.notas.every(temDadosCompletosNotaPdf);
}

export function validarNotasPdf(notas: unknown[]): void {
  const semDados = notas.map(objeto).filter((nota) => !texto(nota.razaoSocial) || typeof nota.valorPedido !== 'number' || !Number.isFinite(nota.valorPedido));
  if (semDados.length > 0) {
    const numeros = semDados.map((nota) => texto(nota.numeroNota) || 'sem número').join(', ');
    throw new Error(`Não foi possível carregar os dados das notas ${numeros}. Verifique a consulta no ERP e tente gerar o PDF novamente.`);
  }
}

export function normalizarNotaPdf<T extends object>(nota: T, externa?: unknown) {
  const base = objeto(nota);
  const dados = objeto(externa);
  const cliente = objeto(dados.cliente);
  const clienteBase = objeto(base.cliente);
  const emitente = objeto(dados.emitente);
  const emitenteBase = objeto(base.emitente);
  const pesoBase = numero(base.pesoBruto, base.peso, base.TOTAL_PESO, base.PESO_TOTAL, base.PESO_NOTA, base.PESO_BRUTO, base.PESO, base.PESO_LIQUIDO, base.peso_liquido);
  const pesoExterno = numero(dados.TOTAL_PESO, dados.PESO_TOTAL, dados.PESO_NOTA, dados.pesoBruto, dados.peso, dados.PESO_BRUTO, dados.PESO, dados.PESO_LIQUIDO, dados.peso_liquido);
  const result = {
    ...nota,
    valorPedido: numero(base.valorPedido, base.valor, base.VALOR_TOTAL_NOTA, base.VALOR_TOTAL, base.TOTAL, base.total, base.valor_total,
      dados.valorPedido, dados.valor, dados.VALOR_TOTAL_NOTA, dados.VALOR_TOTAL, dados.TOTAL, dados.total, dados.valor_total),
    pesoBruto: pesoBase !== undefined && pesoBase > 0 ? pesoBase : pesoExterno ?? pesoBase,
    razaoSocial: texto(base.razaoSocial, base.NOME_RAZAO_SOCIAL, clienteBase.nome, clienteBase.razaoSocial, emitenteBase.razaoSocial,
      dados.razaoSocial, dados.NOME_RAZAO_SOCIAL, cliente.nome, cliente.razaoSocial, emitente.razaoSocial, dados.NOME_FANTASIA),
    cnpj: texto(base.CNPJ_CPF, base.cnpj, base.CNPJ, base.CNPJ_DESTINATARIO, base.CNPJ_CLIENTE, base.CNPJ_CPF_DESTINATARIO, base.CPF_CNPJ, clienteBase.cnpj, emitenteBase.cnpj,
      dados.CNPJ_CPF, dados.cnpj, dados.CNPJ, dados.CNPJ_DESTINATARIO, dados.CNPJ_CLIENTE, dados.CNPJ_CPF_DESTINATARIO, dados.CPF_CNPJ, cliente.cnpj, emitente.cnpj, dados.CNPJ_EMITENTE),
    dataEmissao: texto(base.dataEmissao, base.DATA_EMISSAO, base.DATA_HORA_EMISSAO, dados.dataEmissao, dados.DATA_EMISSAO, dados.DATA_HORA_EMISSAO),
    volumes: texto(base.volumes, dados.volumes, dados.VOLUMES) ?? '1',
  };
  return { ...result, _pdfEnriquecida: temDadosCompletosNotaPdf(result) };
}
