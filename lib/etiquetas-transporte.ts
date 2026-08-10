/**
 * Utilidades do Sistema de Etiquetas de Transporte.
 *
 * O codigoVolume e o codigo de barras unico de cada volume. Ele sera
 * escaneado na conferencia dos volumes (carregamento/entrega), por isso
 * mantemos um formato legivel: ETQ-<pedido>-<volume>.
 *
 * Como um mesmo pedido pode ser reimpresso (novo lote), um sufixo curto
 * aleatorio e adicionado apenas quando houver colisao, preservando a
 * unicidade global exigida pelo banco.
 */

const BASE_PREFIX = 'ETQ';
export const CODIGO_VOLUME_PREFIX = `${BASE_PREFIX}-`;

const MAX_VOLUMES = 9999;

// Valores validos do enum Transportadora do schema Prisma (sem ACERT, que e legado invalido).
export const TRANSPORTADORAS_VALIDAS = [
  'ACCERT',
  'EXPRESSO_GOIAS',
  'TERCEIRIZADA',
  'DETAFRA_TRANSPORTES',
  'RETIRA_VENDEDOR',
  'RETIRA_CLIENTE',
  'VLOG',
  'ZANUELO_TRANSPORTE_LOGISTICA',
] as const;

export const TRANSPORTADORA_PADRAO = 'ACCERT';

export function formatarNomeTransportadora(value: string | null | undefined): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const labels: Record<string, string> = {
    ACCERT: 'ACCERT',
    EXPRESSO_GOIAS: 'EXPRESSO GOIAS',
    TERCEIRIZADA: 'TERCEIRIZADA',
    DETAFRA_TRANSPORTES: 'DETAFRA TRANSPORTES',
    RETIRA_VENDEDOR: 'RETIRA VENDEDOR',
    RETIRA_CLIENTE: 'RETIRA CLIENTE',
    VLOG: 'VLOG',
    ZANUELO_TRANSPORTE_LOGISTICA: 'ZANUELO TRANSPORTE LOGISTICA',
  };

  return labels[raw] || raw.replace(/_/g, ' ');
}

export function sanitizeNumeroPedido(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .replace(/\s+/g, '')
    .slice(0, 24)
    .toUpperCase();
}

function randomSuffix(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 3; i += 1) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return suffix;
}

/**
 * Gera o codigo de um volume especifico de um lote.
 * Ex.: pedido "12345", volume 1 de 3 -> "ETQ-12345-001".
 */
export function gerarCodigoVolume(numeroPedido: string, indice: number, totalVolumes: number): string {
  const pedido = sanitizeNumeroPedido(numeroPedido) || 'SEM_PEDIDO';
  const pad = String(totalVolumes).length >= 3 ? String(totalVolumes).length : 3;
  const numero = String(indice).padStart(pad, '0');
  return `${BASE_PREFIX}-${pedido}-${numero}`;
}

/**
 * Gera os codigos de todos os volumes de um lote, garantindo unicidade
 * global mesmo quando o mesmo pedido e reimpresso.
 */
export function gerarCodigosVolumes(
  numeroPedido: string,
  volumes: number,
  existingCodes: Iterable<string> = [],
): string[] {
  const used = new Set<string>(existingCodes);
  const codes: string[] = [];

  for (let indice = 1; indice <= volumes; indice += 1) {
    let code = gerarCodigoVolume(numeroPedido, indice, volumes);

    if (used.has(code)) {
      let candidate = `${code}-${randomSuffix()}`;
      while (used.has(candidate)) {
        candidate = `${candidate}${randomSuffix()}`;
      }
      code = candidate;
    }

    used.add(code);
    codes.push(code);
  }

  return codes;
}

export function validateTransportLabelInput(input: {
  numeroPedido: string;
  volumes: number;
}): { ok: true } | { ok: false; message: string } {
  const numeroPedido = sanitizeNumeroPedido(input?.numeroPedido || '');
  if (!numeroPedido) {
    return { ok: false, message: 'Informe o numero do pedido.' };
  }

  if (!Number.isInteger(input?.volumes) || input.volumes <= 0) {
    return { ok: false, message: 'A quantidade de volumes deve ser um numero inteiro maior que zero.' };
  }

  if (input.volumes > MAX_VOLUMES) {
    return { ok: false, message: `Quantidade de volumes acima do limite permitido (${MAX_VOLUMES}).` };
  }

  return { ok: true };
}

// ─── Autopreenchimento a partir da API externa ───
// Endpoint usado: /api/v1/pedidos/{pedido_id}/logistica
// O retorno possui a estrutura { pedido, separacoes, itens_separacoes,
// entregas, itens_entregas, notas_fiscais }. Os campos reais variam entre
// maiusculas/minusculas conforme o cadastro, por isso a leitura e feita de
// forma case-insensitive sobre um conjunto de nomes candidatos.

export interface DadosPedidoEtiqueta {
  pedidoId: string;
  cliente: string;
  cnpj: string;
  transportadora: string | null;
  volumes: number;
  numeroNota: string;
}

function pickField(obj: unknown, ...keys: string[]): string | null {
  if (!obj || typeof obj !== 'object') return null;
  const record = obj as Record<string, any>;
  const wanted = new Set(keys.map((key) => key.toLowerCase()));

  for (const key of Object.keys(record)) {
    if (wanted.has(key.toLowerCase())) {
      const value = record[key];
      if (value === null || value === undefined) continue;
      // Objetos aninhados (ex.: notaFiscal.cliente) nao sao campos escalares.
      if (typeof value === 'object') continue;
      const text = String(value).trim();
      if (text && text !== '0') return text;
    }
  }
  return null;
}

export function formatarCnpj(value: string | null | undefined): string {
  return formatarDocumento(value);
}

/**
 * Formata um documento: CNPJ (14 digitos) ou CPF (11 digitos).
 * Retorna string vazia quando a quantidade de digitos nao corresponde.
 */
export function formatarDocumento(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return '';
}

export function normalizarTransportadoraEtiqueta(value: unknown): string | null {
  const raw = String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (!raw) return null;

  const exato = (TRANSPORTADORAS_VALIDAS as readonly string[]).find((item) => item === raw);
  if (exato) return exato;

  if (raw.includes('ACCERT') || raw === 'ACERT') return 'ACCERT';
  if (raw.includes('EXPRESSO') && raw.includes('GOIAS')) return 'EXPRESSO_GOIAS';
  if (raw.includes('ZANUELO')) return 'ZANUELO_TRANSPORTE_LOGISTICA';
  if (raw.includes('DETAFRA')) return 'DETAFRA_TRANSPORTES';
  if (raw.includes('VLOG')) return 'VLOG';
  if (raw.includes('RETIRA') && raw.includes('CLIENTE')) return 'RETIRA_CLIENTE';
  if (raw.includes('RETIRA') && raw.includes('VENDEDOR')) return 'RETIRA_VENDEDOR';
  if (raw.includes('TERCEIRIZADA') || raw.includes('TERCEIRO')) return 'TERCEIRIZADA';

  return null;
}

export function mapearDadosPedidoParaEtiqueta(
  logistica: Record<string, any> | null | undefined,
  clienteExterno?: Record<string, any> | null | undefined
): DadosPedidoEtiqueta {
  const pedido = (logistica?.pedido || {}) as Record<string, any>;
  const notasFiscais = Array.isArray(logistica?.notas_fiscais)
    ? (logistica.notas_fiscais as Record<string, any>[])
    : [];
  const entregas = Array.isArray(logistica?.entregas)
    ? (logistica.entregas as Record<string, any>[])
    : [];
  const notaFiscal = notasFiscais[0] || {};
  const entrega = entregas[0] || {};

  const cliente =
    pickField(
      pedido,
      'CLIENTE_NOME',
      'NOME_RAZAO_SOCIAL',
      'NOME_FANTASIA',
      'NOME',
      'RAZAO_SOCIAL',
      'CLIENTE'
    ) ||
    pickField(notaFiscal, 'CLIENTE_NOME', 'CLIENTE', 'NOME_CLIENTE', 'RAZAO_SOCIAL') ||
    pickField(notaFiscal.cliente, 'NOME', 'RAZAO_SOCIAL', 'RAZAO_SOCIAL_NOME') ||
    '';

  const cnpjRaw =
    pickField(pedido, 'CNPJ_CPF', 'CNPJCPF', 'CNPJ', 'CPF_CNPJ', 'CPF') ||
    pickField(pedido.cliente, 'CNPJ', 'CNPJ_CPF', 'CPF') ||
    pickField(
      notaFiscal,
      'CNPJ',
      'CNPJ_CPF',
      'CPF_CNPJ',
      'CNPJ_DESTINATARIO',
      'CNPJ_CPF_DESTINATARIO'
    ) ||
    pickField(notaFiscal.cliente, 'CNPJ', 'CNPJ_CPF', 'CPF') ||
    '';

  const transportadoraRaw =
    pickField(
      pedido,
      'ENTREGA_POR_TRANSPORTADORA',
      'TRANSPORTADORA',
      'TRANSPORTADORA_NOME',
      'NOME_TRANSPORTADORA'
    ) ||
    pickField(
      entrega,
      'TRANSPORTADORA',
      'TRANSPORTADORA_NOME',
      'NOME_TRANSPORTADORA',
      'TRANSPORTADORA_DESCRICAO'
    ) ||
    pickField(notaFiscal, 'TRANSPORTADORA', 'TRANSPORTADORA_NOME', 'NOME_TRANSPORTADORA') ||
    '';

  let volumes = 0;
  for (const nota of notasFiscais) {
    const valor = Number(
      pickField(
        nota,
        'VOLUMES',
        'QTD_VOLUMES',
        'QUANTIDADE_VOLUMES',
        'NUM_VOLUMES',
        'TOTAL_VOLUMES',
        'QTD_VOLUME',
        'VOLUME'
      ) || '0'
    );
    if (Number.isFinite(valor) && valor > 0) volumes += valor;
  }
  if (volumes <= 0) {
    volumes = Number(
      pickField(
        pedido,
        'VOLUMES',
        'QTD_VOLUMES',
        'TOTAL_VOLUMES',
        'VOLUME_TOTAL',
        'QTD_VOLUMES_ENTREGA',
        'VOLUMES_ENTREGA'
      ) || '0'
    );
  }
  if (volumes <= 0) {
    volumes = Number(pickField(entrega, 'QTD_VOLUMES', 'VOLUMES', 'TOTAL_VOLUMES') || '0');
  }
  if (!Number.isFinite(volumes) || volumes < 0) volumes = 0;

  const numeroNota =
    notasFiscais.length > 1
      ? [
          ...new Set(
            notasFiscais
              .map(
                (nota) => pickField(nota, 'NUMERO_NOTA', 'NUMERO', 'NOTA_NUMERO', 'NF_NUMERO') || ''
              )
              .filter(Boolean)
          ),
        ].join(', ')
      : (pickField(notaFiscal, 'NUMERO_NOTA', 'NUMERO', 'NOTA_NUMERO', 'NF_NUMERO') ||
          pickField(pedido, 'NUMERO_NOTA', 'NF_NUMERO') ||
          '');

  const pedidoId =
    pickField(pedido, 'ORCAMENTO_ID', 'PEDIDO_ID', 'ORCAMENTO_BASE_ID', 'ID') || '';

  let clienteFinal = cliente;
  let cnpjFinal = formatarCnpj(cnpjRaw);

  // Enriquecimento com o cadastro do cliente (/api/v1/clientes/{id}):
  // a razao social vem limpa (sem CPF concatenado ao nome) e o CNPJ/CPF
  // confiavel so existe neste endpoint.
  if (clienteExterno && typeof clienteExterno === 'object') {
    const nomeExterno = pickField(
      clienteExterno,
      'NOME_RAZAO_SOCIAL',
      'NOME_FANTASIA',
      'NOME',
      'CLIENTE_NOME'
    );
    if (nomeExterno) clienteFinal = nomeExterno;

    const documentoExterno = formatarDocumento(
      pickField(clienteExterno, 'CNPJ', 'CNPJ_CPF', 'CPF_CNPJ', 'CPF')
    );
    if (documentoExterno) cnpjFinal = documentoExterno;
  }

  return {
    pedidoId,
    cliente: clienteFinal,
    cnpj: cnpjFinal,
    transportadora: normalizarTransportadoraEtiqueta(transportadoraRaw),
    volumes,
    numeroNota,
  };
}
