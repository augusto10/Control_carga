import { analyzeBarcode } from '@/lib/barcode-validation';
import { ProdutoEtiqueta } from '@/types/labels';

const EXTERNAL_API_BASE_URL = process.env.API_SANTRI_BASE_URL || 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';
const EXTERNAL_API_USERNAME = process.env.API_EXTERNA_USERNAME || process.env.API_SANTRI_USERNAME || 'erp@santri.com.br';
const EXTERNAL_API_PASSWORD = process.env.API_EXTERNA_PASSWORD || process.env.API_SANTRI_PASSWORD || '';
const EXTERNAL_API_TIMEOUT_MS = 15000;

let cachedSantriToken: string | null = null;
let cachedSantriTokenExpiresAtMs = 0;

function readString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

function readProductPhoto(raw: Record<string, unknown>, produtoId: string): string | null {
  const photos = raw.fotos || raw.FOTOS;
  if (!Array.isArray(photos) || photos.length === 0) return null;

  const firstPhoto = photos.find((entry) => entry && typeof entry === 'object') as Record<string, unknown> | undefined;
  if (!firstPhoto) return null;

  const ordem = readString(firstPhoto, ['ORDEM', 'ordem']) || '0';
  return `/api/etiquetas/produto/${encodeURIComponent(produtoId)}/foto?ordem=${encodeURIComponent(ordem)}`;
}

function readBarcodeCandidates(record: Record<string, unknown>): string[] {
  const candidates: Array<{ score: number; value: string }> = [];
  const directKeys = [
    'codigo_barras',
    'codigoBarras',
    'CODIGO_BARRAS',
    'CODIGO_BARRA',
    'ean',
    'EAN',
    'ean_principal',
    'gtin',
    'GTIN',
    'gtin_principal',
    'codigo_de_barras',
  ];

  directKeys.forEach((key) => {
    const value = readString(record, [key]);
    if (value) candidates.push({ score: 0, value });
  });

  const collections = ['codigos_barras', 'codigosBarras', 'barcodes', 'gtins'];
  collections.forEach((key) => {
    const value = record[key];
    if (!Array.isArray(value)) return;
    value.forEach((entry) => {
      if (typeof entry === 'string' && entry.trim()) {
        candidates.push({ score: 0, value: entry.trim() });
        return;
      }

      if (entry && typeof entry === 'object') {
        const item = entry as Record<string, unknown>;
        const barcode = readString(item, ['codigo_barras', 'codigoBarras', 'CODIGO_BARRAS', 'ean', 'EAN', 'gtin', 'GTIN', 'valor', 'codigo']);
        if (!barcode) return;

        const score =
          (item.principal === true ? 100 : 0) +
          (item.padrao === true ? 80 : 0) +
          (String(item.tipo || '').toUpperCase().includes('EAN') ? 60 : 0) +
          (String(item.tipo || '').toUpperCase().includes('GTIN') ? 40 : 0);

        candidates.push({ score, value: barcode });
      }
    });
  });

  return candidates.sort((a, b) => b.score - a.score).map((item) => item.value);
}

function readClosedBoxData(raw: Record<string, unknown>, source: Record<string, unknown>) {
  const directBarcode = readString(source, [
    'CODIGO_BARRAS_CAIXA_FECHADA',
    'codigo_barras_caixa_fechada',
    'codigoBarrasCaixaFechada',
  ]);
  const directQuantity = readString(source, [
    'QUANTIDADE_CAIXA_FECHADA',
    'quantidade_caixa_fechada',
    'quantidadeCaixaFechada',
  ]);
  const auxiliaryCollections = [
    raw.codigos_auxiliares,
    raw.codigosAuxiliares,
    source.codigos_auxiliares,
    source.codigosAuxiliares,
  ];

  for (const collection of auxiliaryCollections) {
    if (!Array.isArray(collection)) continue;

    for (const entry of collection) {
      if (!entry || typeof entry !== 'object') continue;
      const item = entry as Record<string, unknown>;
      const barcode = readString(item, [
        'CODIGO_BARRAS',
        'codigo_barras',
        'codigoBarras',
        'CODIGO_BARRAS_CAIXA_FECHADA',
      ]);
      const quantity = readString(item, [
        'QUANTIDADE_CAIXA_FECHADA',
        'quantidade_caixa_fechada',
        'quantidadeCaixaFechada',
      ]);

      if (barcode && quantity && Number(quantity) > 0) {
        return { barcode, quantity: Number(quantity) };
      }
    }
  }

  return {
    barcode: directBarcode,
    quantity: directQuantity && Number(directQuantity) > 0 ? Number(directQuantity) : null,
  };
}

async function getSantriToken(): Promise<string> {
  const now = Date.now();
  if (cachedSantriToken && now < cachedSantriTokenExpiresAtMs) {
    return cachedSantriToken;
  }

  const formData = new URLSearchParams();
  formData.append('username', EXTERNAL_API_USERNAME);
  formData.append('password', EXTERNAL_API_PASSWORD);

  const response = await fetch(`${EXTERNAL_API_BASE_URL}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
    signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Falha na autenticação com a API Santri (${response.status})`);
  }

  const data = await response.json().catch(() => null) as { access_token?: string } | null;
  const token = data?.access_token;

  if (!token) {
    throw new Error('Token inválido retornado pela API Santri');
  }

  cachedSantriToken = token;
  cachedSantriTokenExpiresAtMs = Date.now() + (55 * 60 * 1000);
  return token;
}

export function mapSantriProductToEtiqueta(payload: unknown, produtoId: string): ProdutoEtiqueta {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  const nestedProduct = raw.produto && typeof raw.produto === 'object'
    ? raw.produto as Record<string, unknown>
    : null;
  const nestedBrand = raw.marca && typeof raw.marca === 'object'
    ? raw.marca as Record<string, unknown>
    : null;
  const source = (nestedProduct || (raw.data && typeof raw.data === 'object' ? raw.data : raw)) as Record<string, unknown>;

  const codigoAdm = readString(source, [
    'codigo_adm',
    'codigoAdm',
    'adm',
    'id',
    'produto_id',
    'PRODUTO_ID',
    'produto_ref',
    'PRODUTO_REF',
  ]) || produtoId;
  const nome = readString(source, [
    'descricao',
    'DESCRICAO',
    'NOME_VENDA',
    'nome',
    'NOME',
    'descricao_produto',
    'produto',
    'NOME_COMPRA',
    'NOME_PRODUTO_ETIQUETA',
  ]) || `Produto ${produtoId}`;
  const marca = readString(source, ['marca', 'nome_marca', 'fabricante', 'MARCA_NOME'])
    || readString(nestedBrand || {}, ['NOME', 'nome']);
  const barcodeCandidates = readBarcodeCandidates(source);
  const codigoBarras = barcodeCandidates.find((value) => analyzeBarcode(value).isValid) || barcodeCandidates[0] || null;
  const analysis = analyzeBarcode(codigoBarras);
  const closedBox = readClosedBoxData(raw, source);
  const resolvedProdutoId = readString(source, ['id', 'produto_id', 'produtoId', 'PRODUTO_ID']) || produtoId;
  const stock = companyRecord(raw, '1');
  const quantidadeEstoque = readNumber(
    stock.ESTOQUE_FISICO ??
      stock.estoque_fisico ??
      stock.QUANTIDADE_ESTOQUE ??
      stock.quantidade_estoque ??
      stock.ESTOQUE_ATUAL ??
      stock.estoque_atual ??
      stock.ESTOQUE ??
      stock.estoque ??
      stock.SALDO_ESTOQUE ??
      stock.saldo_estoque ??
      stock.DISPONIVEL ??
      stock.disponivel
  );

  return {
    produtoId: resolvedProdutoId,
    codigoAdm,
    nome,
    marca,
    codigoOriginal: readString(source, ['CODIGO_ORIGINAL', 'codigo_original', 'codigoOriginal', 'referencia', 'REFERENCIA']),
    imagemUrl: readProductPhoto(raw, resolvedProdutoId),
    codigoBarras,
    barcodeType: analysis.type,
    codigoBarrasCaixaFechada: closedBox.barcode,
    quantidadeCaixaFechada: closedBox.quantity,
    quantidadeEstoque,
  };
}

function readRecords(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    : [];
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toUpperCase();
  if (['S', 'SIM', 'Y', 'YES', 'TRUE', '1', 'ATIVO', 'ACTIVE'].includes(normalized)) return true;
  if (['N', 'NAO', 'NO', 'FALSE', '0', 'INATIVO', 'INACTIVE'].includes(normalized)) return false;
  return null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeSearchText(value: string | null) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function productRecord(detail: Record<string, unknown>) {
  return detail.produto && typeof detail.produto === 'object'
    ? detail.produto as Record<string, unknown>
    : detail;
}

function brandName(detail: Record<string, unknown>) {
  const product = productRecord(detail);
  const brand = detail.marca && typeof detail.marca === 'object'
    ? detail.marca as Record<string, unknown>
    : detail.MARCA && typeof detail.MARCA === 'object'
      ? detail.MARCA as Record<string, unknown>
      : {};
  return readString(product, ['MARCA_NOME', 'marca', 'MARCA']) || readString(brand, ['NOME', 'nome']);
}

function productName(detail: Record<string, unknown>) {
  return readString(productRecord(detail), ['NOME_VENDA', 'DESCRICAO', 'DESCRICAO_PRODUTO', 'NOME', 'nome']);
}

function productId(detail: Record<string, unknown>) {
  return readString(productRecord(detail), ['PRODUTO_ID', 'produto_id', 'id', 'ID', 'CODIGO', 'codigo']);
}

function groupName(detail: Record<string, unknown>) {
  const group = detail.grupo && typeof detail.grupo === 'object'
    ? detail.grupo as Record<string, unknown>
    : detail.GRUPO && typeof detail.GRUPO === 'object'
      ? detail.GRUPO as Record<string, unknown>
      : {};
  return readString(productRecord(detail), ['GRUPO_PRODUTO_NOME']) || readString(group, ['NOME', 'nome']);
}

function companyRecord(detail: Record<string, unknown>, companyId: string) {
  const stocks = readRecords(detail.estoques || detail.ESTOQUES || detail.estoque || detail.ESTOQUE);
  return stocks.find((stock) => {
    const id = readString(stock, ['EMPRESA_ID', 'empresa_id', 'ID_EMPRESA', 'id_empresa']);
    return !id || id === companyId;
  }) || stocks[0] || {};
}

function participatesInCompanyMix(detail: Record<string, unknown>, companyId: string) {
  const product = productRecord(detail);
  const keys = ['PARTICIPA_MIX_EMPRESA', 'participa_mix_empresa', 'PARTICIPA_MIX', 'participa_mix', 'MIX_EMPRESA', 'mix_empresa', 'MIX', 'mix'];
  for (const source of [product, detail, companyRecord(detail, companyId)]) {
    for (const key of keys) {
      const result = readBoolean(source[key]);
      if (result !== null) return result;
    }
  }
  return false;
}

const EXCLUDED_PRODUCT_IDS = new Set(['35501', '35358', '28603', '30989', '28290']);
const EXCLUDED_GROUPS = new Set(['BRITAS', 'UNIFICACAO/3']);

function isCatalogEligible(detail: Record<string, unknown>, companyId: string) {
  const product = productRecord(detail);
  const id = productId(detail);
  const name = normalizeSearchText(productName(detail));
  const brand = normalizeSearchText(brandName(detail));
  const group = normalizeSearchText(groupName(detail));
  const stock = companyRecord(detail, companyId);
  const conceptualPrice = readNumber(stock.PRECO_CONCEITUAL ?? stock.preco_conceitual ?? stock.precoConceitual);
  const averagePrice = readNumber(stock.PRECO_MEDIO ?? stock.preco_medio ?? stock.precoMedio);
  const photos = readRecords(detail.fotos || detail.FOTOS || detail.foto || detail.FOTO);
  const active = readBoolean(product.ATIVO ?? product.ativo) === true;
  const excludedGroup = EXCLUDED_GROUPS.has(group)
    || group.includes('USO E CONSUMO')
    || group.includes('MATERIAIS DE LIMPEZA')
    || group.includes('EXPOSITORES E BONIFICACOES');
  const excludedBrand = ['DIVERSOS', 'DIVERSAS', 'EMBRAMACO'].includes(brand) || brand.includes('MARDISA VEICULOS');
  const excludedProduct = name.includes('EXPOSITOR')
    || (brand === 'GERDAU' && (group.includes('CHAPAS GALVANIZADAS') || name.includes('CHAPA GALVANIZADA')));

  return Boolean(
    id
    && !EXCLUDED_PRODUCT_IDS.has(id)
    && !excludedGroup
    && !excludedBrand
    && !excludedProduct
    && active
    && participatesInCompanyMix(detail, companyId)
    && conceptualPrice !== null
    && conceptualPrice > 0
    && averagePrice !== null
    && averagePrice > 0
    && photos.length > 0,
  );
}

function extractProductList(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return readRecords(payload);
  if (!payload || typeof payload !== 'object') return [];
  const record = payload as Record<string, unknown>;
  for (const key of ['items', 'data', 'results', 'produtos', 'rows', 'content']) {
    if (Array.isArray(record[key])) return readRecords(record[key]);
  }
  return [];
}

async function fetchCompleteProductPayload(produtoId: string, companyId: string) {
  const token = await getSantriToken();
  const url = new URL(`/api/v1/produtos/${encodeURIComponent(produtoId)}/completo`, EXTERNAL_API_BASE_URL);
  url.searchParams.set('empresa_id', companyId);
  const response = await fetch(url, {
    headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Falha ao consultar produto ${produtoId} (${response.status})`);
  const payload = await response.json() as unknown;
  return ((payload && typeof payload === 'object' && 'data' in payload)
    ? (payload as Record<string, unknown>).data
    : payload) as Record<string, unknown>;
}

export async function searchEligibleSantriProductsByBrand(search: string): Promise<ProdutoEtiqueta[]> {
  const companyId = '1';
  const normalizedSearch = normalizeSearchText(search.trim());
  const token = await getSantriToken();
  const candidates = new Map<string, Record<string, unknown>>();
  const seenPageIds = new Set<string>();
  const pageSize = 100;

  for (let offset = 0; offset < 10000; offset += pageSize) {
    const url = new URL('/api/v1/produtos/completos', EXTERNAL_API_BASE_URL);
    url.searchParams.set('limit', String(pageSize));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('empresa_id', companyId);
    url.searchParams.set('ativo', 'S');
    url.searchParams.set('marca', search.trim());
    const response = await fetch(url, {
      headers: { accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Falha ao listar produtos por marca (${response.status})`);
    const items = extractProductList(await response.json());
    if (!items.length) break;

    let newIds = 0;
    for (const item of items) {
      const id = productId(item);
      if (!id || seenPageIds.has(id)) continue;
      seenPageIds.add(id);
      newIds += 1;
      const listedBrand = normalizeSearchText(brandName(item));
      if (!listedBrand || listedBrand.includes(normalizedSearch)) candidates.set(id, item);
    }
    if (!newIds || items.length < pageSize) break;
  }

  const ids = Array.from(candidates.keys());
  const eligible: ProdutoEtiqueta[] = [];
  for (let index = 0; index < ids.length; index += 8) {
    const batch = ids.slice(index, index + 8);
    const details = await Promise.all(batch.map(async (id) => {
      try {
        return await fetchCompleteProductPayload(id, companyId);
      } catch {
        return null;
      }
    }));
    details.forEach((detail, detailIndex) => {
      if (!detail || !isCatalogEligible(detail, companyId)) return;
      const item = mapSantriProductToEtiqueta(detail, batch[detailIndex]);
      if (normalizeSearchText(item.marca).includes(normalizedSearch)) eligible.push(item);
    });
  }

  return eligible.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function fetchSantriProductPhoto(produtoId: string, ordem: string) {
  const token = await getSantriToken();
  const response = await fetch(
    `${EXTERNAL_API_BASE_URL}/api/v1/produtos/${encodeURIComponent(produtoId)}/fotos/${encodeURIComponent(ordem)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    },
  );

  if (!response.ok) {
    throw new Error(response.status === 404 ? 'PHOTO_NOT_FOUND' : `Falha ao consultar foto do produto (${response.status})`);
  }

  return {
    contentType: response.headers.get('content-type') || 'image/jpeg',
    data: Buffer.from(await response.arrayBuffer()),
  };
}

export async function fetchSantriProductComplete(produtoId: string): Promise<ProdutoEtiqueta> {
  const token = await getSantriToken();
  const url = new URL(`/api/v1/produtos/${encodeURIComponent(produtoId)}/completo`, EXTERNAL_API_BASE_URL);
  url.searchParams.set('empresa_id', '1');
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 404) {
    throw new Error('NOT_FOUND');
  }

  if (response.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }

  if (!response.ok) {
    const detail = payload && typeof payload === 'object' && 'detail' in payload
      ? String((payload as Record<string, unknown>).detail)
      : 'Falha ao consultar produto na Santri';
    throw new Error(detail);
  }

  const normalizedPayload = payload && typeof payload === 'object' && 'data' in payload
    ? (payload as Record<string, unknown>).data
    : payload;

  return mapSantriProductToEtiqueta(normalizedPayload, produtoId);
}
