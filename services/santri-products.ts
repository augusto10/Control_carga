import { analyzeBarcode } from '@/lib/barcode-validation';
import { ProdutoEtiqueta } from '@/types/labels';

const EXTERNAL_API_BASE_URL = process.env.API_SANTRI_BASE_URL || 'http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com';
const EXTERNAL_API_USERNAME = process.env.API_EXTERNA_USERNAME || process.env.API_SANTRI_USERNAME || 'erp@santri.com.br';
const EXTERNAL_API_PASSWORD = process.env.API_EXTERNA_PASSWORD || process.env.API_SANTRI_PASSWORD || '';

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

function readBarcodeCandidates(record: Record<string, unknown>): string[] {
  const candidates: Array<{ score: number; value: string }> = [];
  const directKeys = [
    'codigo_barras',
    'codigoBarras',
    'CODIGO_BARRAS',
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

  return {
    produtoId: readString(source, ['id', 'produto_id', 'produtoId', 'PRODUTO_ID']) || produtoId,
    codigoAdm,
    nome,
    marca,
    codigoBarras,
    barcodeType: analysis.type,
    codigoBarrasCaixaFechada: closedBox.barcode,
    quantidadeCaixaFechada: closedBox.quantity,
  };
}

export async function fetchSantriProductComplete(produtoId: string): Promise<ProdutoEtiqueta> {
  const token = await getSantriToken();
  const response = await fetch(`${EXTERNAL_API_BASE_URL}/api/v1/produtos/${encodeURIComponent(produtoId)}/completo`, {
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

  return mapSantriProductToEtiqueta(payload, produtoId);
}
