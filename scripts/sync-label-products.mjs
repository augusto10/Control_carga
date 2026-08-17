import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE_URL = "http://ec2-15-229-152-29.sa-east-1.compute.amazonaws.com";
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_PAGE_SIZE = 100;
const DEFAULT_PHOTO_ORDERS = 5;
const DEFAULT_COMPANY_ID = "1";
const COMPANY_LOGO_IMAGE = "/brand/logo-esplendor.png";
const REQUIRE_PRODUCT_PHOTO = false;
const DEFAULT_REPORT_DIR = "reports/catalogo-sync";
const EXCLUDED_CATALOG_PRODUCT_IDS = new Set(["35501", "35358", "28603", "30989", "28290"]);
const EXCLUDED_CATALOG_GROUP_NAMES = new Set(["BRITAS", "UNIFICACAO/3"]);
const BLOCK_NEW_PRODUCTS_FROM_GROUP_NAMES = new Set(["ACESSORIOS"]);
const ALLOWED_NEW_ACCESSORY_PRODUCT_IDS = new Set([
  "6027",
  "6552",
  "6557",
  "6558",
  "6559",
  "8116",
  "8123",
  "14994",
  "15958",
  "18182",
  "18183",
  "21377",
  "21697",
  "23288",
  "23289",
  "33199",
  "33200",
  "35740",
  "35741",
  "35742",
  "35743",
  "35744",
  "35745",
  "35746",
  "37209",
  "38312",
  "38326",
  "38327",
  "38328",
  "38330",
  "32203",
  "38482",
  "38483",
  "38484",
  "38485",
  "38486",
  "38487",
  "38488",
]);
const PRODUCT_BRAND_OVERRIDES = new Map([
  ["28518", "IV PLAST"],
  ["28830", "PRO ELETRONIC"],
]);
const COLORS = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
};

function colorize(color, value) {
  return `${COLORS[color] ?? ""}${value}${COLORS.reset}`;
}

function formatPercent(done, total) {
  if (!total) return "?";
  return `${Math.min(100, Math.round((done / total) * 100))}%`;
}

async function readEnv(projectRoot) {
  const envFile = path.join(projectRoot, ".env.local");
  const env = { ...process.env };

  try {
    const content = await fs.readFile(envFile, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator);
      const value = trimmed.slice(separator + 1);
      if (!env[key]) env[key] = value;
    }
  } catch {
    // Permite uso somente com variaveis de ambiente do processo.
  }

  return env;
}

function normalizeString(value) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function normalizeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.replace(",", "."));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripUtf8Bom(value) {
  return typeof value === "string" ? value.replace(/^\uFEFF/, "") : value;
}

function isActive(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (["S", "SIM", "Y", "YES", "TRUE", "1", "ATIVO", "ACTIVE"].includes(normalized)) return true;
    if (["N", "NAO", "NO", "FALSE", "0", "INATIVO", "INACTIVE"].includes(normalized)) return false;
  }
  return true;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  const record = payload && typeof payload === "object" ? payload : {};
  for (const key of ["items", "data", "results", "produtos", "rows", "content"]) {
    if (Array.isArray(record[key])) return record[key];
  }
  return [];
}

function extractTotal(payload, fallback) {
  const record = payload && typeof payload === "object" ? payload : {};
  const total = record.total ?? record.count ?? record.totalItems ?? record.totalElements ?? fallback;
  return typeof total === "number" ? total : fallback;
}

function productIdFrom(value) {
  return normalizeString(
    value?.PRODUTO_ID ??
      value?.produto_id ??
      value?.id ??
      value?.ID ??
      value?.codigo ??
      value?.CODIGO ??
      value?.CODIGO_PRODUTO ??
      value?.codigo_produto,
  );
}

function getProductRecord(detail) {
  return detail?.produto && typeof detail.produto === "object" ? detail.produto : detail;
}

function getGroupRecord(detail) {
  if (detail?.grupo && typeof detail.grupo === "object") return detail.grupo;
  if (detail?.GRUPO && typeof detail.GRUPO === "object") return detail.GRUPO;
  return {};
}

function getBrandRecord(detail) {
  if (detail?.marca && typeof detail.marca === "object") return detail.marca;
  if (detail?.MARCA && typeof detail.MARCA === "object") return detail.MARCA;
  return {};
}

function getCharacteristicsRecord(detail) {
  if (detail?.caracteristicas && typeof detail.caracteristicas === "object") return detail.caracteristicas;
  if (detail?.CARACTERISTICAS && typeof detail.CARACTERISTICAS === "object") return detail.CARACTERISTICAS;
  return {};
}

function recordsFrom(value) {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function companyIdFrom(value) {
  return normalizeString(
    value?.EMPRESA_ID ??
      value?.empresa_id ??
      value?.ID_EMPRESA ??
      value?.id_empresa ??
      value?.CODIGO_EMPRESA ??
      value?.codigo_empresa,
  );
}

function matchesCompany(value, companyId) {
  const valueCompanyId = companyIdFrom(value);
  return !valueCompanyId || valueCompanyId === String(companyId);
}

function recordForCompany(records, companyId) {
  return records.find((record) => matchesCompany(record, companyId)) ?? records[0] ?? {};
}

function stockRecordsFromDetail(detail) {
  return recordsFrom(detail?.estoques ?? detail?.ESTOQUES ?? detail?.estoque ?? detail?.ESTOQUE);
}

function stockRecordForCompany(detail, companyId) {
  const stocks = stockRecordsFromDetail(detail).filter((stock) => matchesCompany(stock, companyId));
  return recordForCompany(stocks, companyId);
}

function isCompanyMixEligible(detail, companyId) {
  const product = getProductRecord(detail);
  const directMixFlag = [
    product?.PARTICIPA_MIX_EMPRESA,
    product?.participa_mix_empresa,
    product?.PARTICIPA_MIX,
    product?.participa_mix,
    product?.MIX_EMPRESA,
    product?.mix_empresa,
    product?.MIX,
    product?.mix,
    detail?.PARTICIPA_MIX_EMPRESA,
    detail?.participa_mix_empresa,
    detail?.PARTICIPA_MIX,
    detail?.participa_mix,
    detail?.MIX_EMPRESA,
    detail?.mix_empresa,
    detail?.MIX,
    detail?.mix,
  ]
    .map((value) => {
      if (typeof value === "boolean") return value;
      if (typeof value === "number") return value > 0;
      if (typeof value === "string") {
        const normalized = value.trim().toUpperCase();
        if (["S", "SIM", "Y", "YES", "TRUE", "1", "ATIVO", "ACTIVE"].includes(normalized)) return true;
        if (["N", "NAO", "NO", "FALSE", "0", "INATIVO", "INACTIVE"].includes(normalized)) return false;
      }
      return null;
    })
    .find((value) => value !== null);

  if (typeof directMixFlag === "boolean") return directMixFlag;

  const stocks = stockRecordsFromDetail(detail).filter((stock) => matchesCompany(stock, companyId));

  for (const stock of stocks) {
    const mixFlag = [
      stock.PARTICIPA_MIX_EMPRESA,
      stock.participa_mix_empresa,
      stock.PARTICIPA_MIX,
      stock.participa_mix,
      stock.MIX_EMPRESA,
      stock.mix_empresa,
      stock.MIX,
      stock.mix,
    ]
      .map((value) => {
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return value > 0;
        if (typeof value === "string") {
          const normalized = value.trim().toUpperCase();
          if (["S", "SIM", "Y", "YES", "TRUE", "1", "ATIVO", "ACTIVE"].includes(normalized)) return true;
          if (["N", "NAO", "NO", "FALSE", "0", "INATIVO", "INACTIVE"].includes(normalized)) return false;
        }
        return null;
      })
      .find((value) => value !== null);

    if (typeof mixFlag === "boolean") return mixFlag;
  }

  return false;
}

function salePriceFromRecord(value) {
  return normalizeNumber(
    value?.PRECO_VENDA ??
      value?.preco_venda ??
      value?.precoVenda ??
      value?.price ??
      value?.PRICE,
  );
}

function salePriceFromDetail(detail) {
  const product = getProductRecord(detail);
  return salePriceFromRecord(product) ?? salePriceFromRecord(detail);
}

function hasSalePrice(value) {
  const price = salePriceFromDetail(value);
  return price !== null && price > 0;
}

function conceptualPriceFromStock(stock) {
  return normalizeNumber(stock?.PRECO_CONCEITUAL ?? stock?.preco_conceitual ?? stock?.precoConceitual);
}

function averagePriceFromStock(stock) {
  return normalizeNumber(stock?.PRECO_MEDIO ?? stock?.preco_medio ?? stock?.precoMedio);
}

function hasRequiredCatalogPrices(detail, companyId) {
  const stock = stockRecordForCompany(detail, companyId);
  const conceptualPrice = conceptualPriceFromStock(stock);
  const averagePrice = averagePriceFromStock(stock);

  return conceptualPrice !== null && conceptualPrice > 0 && averagePrice !== null && averagePrice > 0;
}

function isCatalogEligible(detail, companyId) {
  const product = getProductRecord(detail);
  const photos = recordsFrom(detail?.fotos ?? detail?.FOTOS ?? detail?.foto ?? detail?.FOTO);
  return (
    !isExcludedCatalogProductId(detail) &&
    !isExcludedCatalogProduct(detail) &&
    !isExcludedCatalogGroupName(groupNameFromDetail(detail)) &&
    isActive(product?.ATIVO) &&
    isCompanyMixEligible(detail, companyId) &&
    hasRequiredCatalogPrices(detail, companyId) &&
    photos.length > 0
  );
}

function isExcludedCatalogProductId(value) {
  const product = getProductRecord(value);
  const productId = productIdFrom(product) ?? productIdFrom(value);
  return !!productId && EXCLUDED_CATALOG_PRODUCT_IDS.has(productId);
}

function normalizeGroupName(value) {
  return normalizeString(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function isExcludedCatalogGroupName(value) {
  const groupName = normalizeGroupName(value);
  return (
    !!groupName &&
    (EXCLUDED_CATALOG_GROUP_NAMES.has(groupName) ||
      groupName.includes("USO E CONSUMO") ||
      groupName.includes("MATERIAIS DE LIMPEZA") ||
      groupName.includes("EXPOSITORES E BONIFICACOES"))
  );
}

function shouldBlockNewProductByGroupName(value) {
  const groupName = normalizeGroupName(value);
  return !!groupName && BLOCK_NEW_PRODUCTS_FROM_GROUP_NAMES.has(groupName);
}

function groupNameFromDetail(detail) {
  const product = getProductRecord(detail);
  const group = getGroupRecord(detail);
  return normalizeString(product?.GRUPO_PRODUTO_NOME) ?? normalizeString(group?.NOME);
}

function groupNameFromList(item) {
  return normalizeString(item?.GRUPO_PRODUTO_NOME ?? item?.grupo ?? item?.GRUPO);
}

function brandNameFromDetail(detail) {
  const product = getProductRecord(detail);
  const brand = getBrandRecord(detail);
  return normalizeString(product?.MARCA_NOME) ?? normalizeString(brand?.NOME) ?? normalizeString(product?.marca);
}

function brandNameFromList(item) {
  return normalizeString(item?.MARCA_NOME ?? item?.marca ?? item?.MARCA);
}

function productNameFromDetail(detail) {
  const product = getProductRecord(detail);
  return normalizeString(product?.NOME_VENDA ?? product?.DESCRICAO ?? product?.DESCRICAO_PRODUTO ?? product?.NOME);
}

function productNameFromList(item) {
  return normalizeString(item?.NOME_VENDA ?? item?.nomeVenda ?? item?.DESCRICAO ?? item?.DESCRICAO_PRODUTO ?? item?.NOME);
}

function normalizeCatalogText(value) {
  return normalizeString(value)
    ?.normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

function isExcludedGalvanizedSheetProduct({ brand, group, name }) {
  const normalizedBrand = normalizeCatalogText(brand);
  const normalizedGroup = normalizeCatalogText(group);
  const normalizedName = normalizeCatalogText(name);

  return (
    normalizedBrand === "GERDAU" &&
    (normalizedGroup?.includes("CHAPAS GALVANIZADAS") || normalizedName?.includes("CHAPA GALVANIZADA"))
  );
}

function isExcludedCatalogBrandName(value) {
  const brandName = normalizeCatalogText(value);
  return ["DIVERSOS", "DIVERSAS", "EMBRAMACO"].includes(brandName) || brandName?.includes("MARDISA VEICULOS");
}

function isExcludedCatalogProductName(value) {
  const productName = normalizeCatalogText(value);
  return productName?.includes("EXPOSITOR") === true;
}

function isExcludedCatalogProduct(detail) {
  if (isExcludedCatalogBrandName(brandNameFromDetail(detail))) return true;
  if (isExcludedCatalogProductName(productNameFromDetail(detail))) return true;

  return isExcludedGalvanizedSheetProduct({
    brand: brandNameFromDetail(detail),
    group: groupNameFromDetail(detail),
    name: productNameFromDetail(detail),
  });
}

function isExcludedCatalogProductFromList(item) {
  if (isExcludedCatalogBrandName(brandNameFromList(item))) return true;
  if (isExcludedCatalogProductName(productNameFromList(item))) return true;

  return isExcludedGalvanizedSheetProduct({
    brand: brandNameFromList(item),
    group: groupNameFromList(item),
    name: productNameFromList(item),
  });
}

function booleanFlagFrom(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    const normalized = value.trim().toUpperCase();
    if (["S", "SIM", "Y", "YES", "TRUE", "1", "ATIVO", "ACTIVE"].includes(normalized)) return true;
    if (["N", "NAO", "NO", "FALSE", "0", "INATIVO", "INACTIVE"].includes(normalized)) return false;
  }
  return null;
}

function envFlagEnabled(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") {
    return ["1", "S", "SIM", "TRUE", "YES", "Y"].includes(value.trim().toUpperCase());
  }
  return false;
}

async function readProductIdsFile(filePath) {
  if (!filePath) return [];

  const content = await fs.readFile(filePath, "utf8");
  const ids = [];
  const seen = new Set();

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const [firstColumn] = trimmed.split(/[;,]/);
    const id = normalizeString(firstColumn);
    if (!id || (index === 0 && /codigo|código|code/i.test(id))) continue;
    if (seen.has(id)) continue;

    seen.add(id);
    ids.push(id);
  }

  return ids;
}

function listMixFlagFrom(item) {
  return booleanFlagFrom(
    item?.PARTICIPA_MIX_EMPRESA ??
      item?.participa_mix_empresa ??
      item?.PARTICIPA_MIX ??
      item?.participa_mix ??
      item?.MIX_EMPRESA ??
      item?.mix_empresa ??
      item?.MIX ??
      item?.mix,
  );
}

function listHasRequiredCatalogPrices(item) {
  const conceptualPrice = conceptualPriceFromStock(item);
  const averagePrice = averagePriceFromStock(item);

  return conceptualPrice !== null && conceptualPrice > 0 && averagePrice !== null && averagePrice > 0;
}

function shouldFetchDetailFromList(item) {
  const mixFlag = listMixFlagFrom(item);
  return (
    !isExcludedCatalogProductId(item) &&
    !isExcludedCatalogProductFromList(item) &&
    !isExcludedCatalogGroupName(groupNameFromList(item)) &&
    isActive(item?.ATIVO) &&
    mixFlag === true
  );
}

function hasListMixInformation(item) {
  return listMixFlagFrom(item) !== null;
}

function isCatalogEligibleFromList(item) {
  return (
    !isExcludedCatalogProductId(item) &&
    !isExcludedCatalogProductFromList(item) &&
    !isExcludedCatalogGroupName(groupNameFromList(item)) &&
    isActive(item?.ATIVO) &&
    listMixFlagFrom(item) === true &&
    listHasRequiredCatalogPrices(item)
  );
}

function multipleSaleFromList(item) {
  return normalizeNumber(
    item?.MULTIPLO_VENDA ??
      item?.MULTIPLO_VENDA_AVISO_VENDA ??
      item?.MULTIPLO_VENDA_WEB ??
      item?.EMBALAGEM_FRACIONADA,
  );
}

function closedBoxQuantityFromList(item) {
  const value = normalizeNumber(
    item?.QUANTIDADE_CAIXA_FECHADA ?? item?.quantidade_caixa_fechada ?? item?.quantidadeCaixaFechada,
  );
  return value !== null && value > 0 ? value : null;
}

function listSignatureFrom(item) {
  const values = [
    productIdFrom(item),
    normalizeString(item?.DATA_HORA_ALTERACAO ?? item?.DATA_ATUALIZACAO ?? item?.updatedAt ?? item?.UPDATED_AT ?? item?.ALTERADO_EM),
    normalizeString(item?.DATA_HORA_ULTIMA_ATUALIZ_FOTO),
    normalizeString(item?.ATIVO),
    normalizeString(
      item?.PARTICIPA_MIX_EMPRESA ??
        item?.participa_mix_empresa ??
        item?.PARTICIPA_MIX ??
        item?.MIX_EMPRESA ??
        item?.MIX,
    ),
    normalizeString(item?.NOME_VENDA ?? item?.DESCRICAO ?? item?.DESCRICAO_PRODUTO ?? item?.NOME),
    normalizeString(item?.CARACTERISTICAS_PRODUTO_WEB ?? item?.CARACTER_PROD_WEB_SEM_HTML ?? item?.CARACTERISTICAS_PRODUTO ?? item?.DESCRICAO_TECNICA ?? item?.NOME_COMPRA),
    normalizeString(item?.UNIDADE_VENDA ?? item?.UNIDADE),
    normalizeString(item?.CODIGO_BARRAS ?? item?.CODIGO_BARRA ?? item?.EAN ?? item?.GTIN),
    normalizeString(item?.CODIGO_ORIGINAL ?? item?.CODIGO_FABRICANTE ?? item?.REFERENCIA),
    normalizeString(item?.GRUPO_PRODUTO_NOME),
    normalizeString(item?.MARCA_NOME),
    normalizeString(item?.QUANTIDADE_CAIXA_FECHADA),
    normalizeString(item?.CODIGO_BARRAS_CAIXA_FECHADA),
    normalizeString(item?.MULTIPLO_VENDA),
    normalizeString(item?.MULTIPLO_VENDA_AVISO_VENDA),
    normalizeString(item?.MULTIPLO_VENDA_WEB),
    normalizeString(item?.EMBALAGEM_FRACIONADA),
    normalizeString(item?.PRECO_VENDA ?? item?.preco_venda ?? item?.precoVenda),
    normalizeString(item?.PRECO_CONCEITUAL ?? item?.preco_conceitual ?? item?.precoConceitual),
    normalizeString(item?.PRECO_MEDIO ?? item?.preco_medio ?? item?.precoMedio),
    normalizeString(item?.PRECO_VENDA_TABELA_PRECO_ID ?? item?.preco_venda_tabela_preco_id),
    normalizeString(item?.POSSUI_FOTOS),
    normalizeString(item?.QTD_FOTOS),
  ];

  return values.map((value) => value ?? "").join("|");
}

function legacyListSignatureFrom(item) {
  const values = [
    productIdFrom(item),
    normalizeString(item?.DATA_HORA_ULTIMA_ATUALIZ_FOTO),
    normalizeString(item?.ATIVO),
    normalizeString(
      item?.PARTICIPA_MIX_EMPRESA ??
        item?.participa_mix_empresa ??
        item?.PARTICIPA_MIX ??
        item?.MIX_EMPRESA ??
        item?.MIX,
    ),
    normalizeString(item?.NOME_VENDA ?? item?.DESCRICAO ?? item?.DESCRICAO_PRODUTO ?? item?.NOME),
    normalizeString(item?.UNIDADE_VENDA ?? item?.UNIDADE),
    normalizeString(item?.CODIGO_BARRAS ?? item?.CODIGO_BARRA ?? item?.EAN ?? item?.GTIN),
    normalizeString(item?.CODIGO_ORIGINAL ?? item?.CODIGO_FABRICANTE ?? item?.REFERENCIA),
    normalizeString(item?.GRUPO_PRODUTO_NOME),
    normalizeString(item?.MARCA_NOME),
    normalizeString(item?.QUANTIDADE_CAIXA_FECHADA),
    normalizeString(item?.CODIGO_BARRAS_CAIXA_FECHADA),
    normalizeString(item?.MULTIPLO_VENDA),
    normalizeString(item?.MULTIPLO_VENDA_AVISO_VENDA),
    normalizeString(item?.MULTIPLO_VENDA_WEB),
    normalizeString(item?.EMBALAGEM_FRACIONADA),
    normalizeString(item?.PRECO_VENDA ?? item?.preco_venda ?? item?.precoVenda),
    normalizeString(item?.PRECO_VENDA_TABELA_PRECO_ID ?? item?.preco_venda_tabela_preco_id),
    normalizeString(item?.POSSUI_FOTOS),
    normalizeString(item?.QTD_FOTOS),
  ];

  return values.map((value) => value ?? "").join("|");
}
function hasListPhotoInformation(item) {
  return [
    item?.DATA_HORA_ULTIMA_ATUALIZ_FOTO,
    item?.POSSUI_FOTOS,
    item?.QTD_FOTOS,
  ].some((value) => normalizeString(value) !== null);
}

function canReuseProductFromList(item, previous) {
  if (!previous) return false;
  if (!hasListPhotoInformation(item)) return false;

  const currentListSignature = listSignatureFrom(item);
  if (previous.syncListSignature && previous.syncListSignature === currentListSignature) return true;

  const productId = productIdFrom(item);
  const previousId = normalizeString(previous.id) ?? normalizeString(previous.codigoAdm);
  if (productId && previousId && productId !== previousId) return false;

  const nomeVenda = normalizeString(item?.NOME_VENDA ?? item?.DESCRICAO ?? item?.DESCRICAO_PRODUTO ?? item?.NOME);
  if (nomeVenda && previous.nomeVenda && nomeVenda !== previous.nomeVenda) return false;

  const unidadeVenda = normalizeString(item?.UNIDADE_VENDA ?? item?.UNIDADE);
  if (unidadeVenda && previous.unidadeVenda && unidadeVenda !== previous.unidadeVenda) return false;

  const marca = normalizeString(item?.MARCA_NOME);
  if (marca && previous.marca && marca !== previous.marca) return false;

  const grupo = normalizeString(item?.GRUPO_PRODUTO_NOME);
  if (grupo && previous.grupo && grupo !== previous.grupo) return false;

  const codigoOriginal = normalizeString(item?.CODIGO_ORIGINAL ?? item?.CODIGO_FABRICANTE ?? item?.REFERENCIA);
  if (codigoOriginal && previous.codigoOriginal && codigoOriginal !== previous.codigoOriginal) return false;

  const codigoBarras = normalizeString(item?.CODIGO_BARRAS ?? item?.CODIGO_BARRA ?? item?.EAN ?? item?.GTIN);
  if (codigoBarras && previous.codigoBarras && codigoBarras !== previous.codigoBarras) return false;

  const multiploVenda = multipleSaleFromList(item);
  if (multiploVenda !== null && multiploVenda > 0 && multiploVenda !== previous.multiploVenda) return false;

  const quantidadeCaixa = closedBoxQuantityFromList(item);
  if (quantidadeCaixa !== previous.quantidadeCaixa) return false;

  if (!hasSalePrice(item)) return false;

  return true;
}

function closedBoxQuantityFrom(detail) {
  const product = getProductRecord(detail);
  const closedBoxBarcode = normalizeString(
    product?.CODIGO_BARRAS_CAIXA_FECHADA ??
      product?.codigo_barras_caixa_fechada ??
      product?.codigoBarrasCaixaFechada,
  );
  const auxiliaryCodes = recordsFrom(detail?.codigos_auxiliares ?? detail?.CODIGOS_AUXILIARES ?? detail?.codigosAuxiliares);
  const matchingAuxiliary = closedBoxBarcode
    ? auxiliaryCodes.find((item) => normalizeString(item?.CODIGO_BARRAS ?? item?.codigo_barras ?? item?.codigoBarras) === closedBoxBarcode)
    : null;
  const quantities = [];

  for (const source of [product, matchingAuxiliary, ...auxiliaryCodes]) {
    const value = normalizeNumber(source?.QUANTIDADE_CAIXA_FECHADA ?? source?.quantidade_caixa_fechada ?? source?.quantidadeCaixaFechada);
    if (value !== null && value > 0) quantities.push(value);
  }

  return quantities.length ? Math.max(...quantities) : null;
}

function closedBoxBarcodeFrom(detail) {
  const product = getProductRecord(detail);
  const direct = normalizeString(
    product?.CODIGO_BARRAS_CAIXA_FECHADA ??
      product?.codigo_barras_caixa_fechada ??
      product?.codigoBarrasCaixaFechada,
  );
  if (direct) return direct;

  const auxiliaryCodes = recordsFrom(detail?.codigos_auxiliares ?? detail?.CODIGOS_AUXILIARES ?? detail?.codigosAuxiliares);
  const closedBox = auxiliaryCodes.find((item) => {
    const barcode = normalizeString(item?.CODIGO_BARRAS ?? item?.codigo_barras ?? item?.codigoBarras);
    const quantity = normalizeNumber(
      item?.QUANTIDADE_CAIXA_FECHADA ?? item?.quantidade_caixa_fechada ?? item?.quantidadeCaixaFechada,
    );
    return barcode && quantity !== null && quantity > 0;
  });

  return normalizeString(closedBox?.CODIGO_BARRAS ?? closedBox?.codigo_barras ?? closedBox?.codigoBarras);
}

function signatureFrom(value, companyId = DEFAULT_COMPANY_ID) {
  const product = getProductRecord(value);
  const group = getGroupRecord(value);
  const brand = getBrandRecord(value);
  const characteristics = getCharacteristicsRecord(value);
  const photos = recordsFrom(value?.fotos ?? value?.FOTOS ?? value?.foto ?? value?.FOTO);
  const stocks = recordsFrom(value?.estoques ?? value?.ESTOQUES ?? value?.estoque ?? value?.ESTOQUE)
    .filter((stock) => matchesCompany(stock, companyId))
    .map((stock) =>
      [
        normalizeString(stock?.EMPRESA_ID),
        normalizeString(stock?.PARTICIPA_MIX_EMPRESA),
        normalizeString(stock?.PRECO_CONCEITUAL ?? stock?.preco_conceitual ?? stock?.precoConceitual),
        normalizeString(stock?.PRECO_MEDIO ?? stock?.preco_medio ?? stock?.precoMedio),
        normalizeString(stock?.DATA_HORA_ALTERACAO),
      ]
        .filter(Boolean)
        .join(":"),
    );
  const multiples = recordsFrom(value?.multiplos ?? value?.MULTIPLOS)
    .filter((multiple) => matchesCompany(multiple, companyId))
    .map((multiple) =>
      [
        normalizeString(multiple?.EMPRESA_ID),
        normalizeString(multiple?.MULTIPLO_VENDA),
        normalizeString(multiple?.MULTIPLO_VENDA_AVISO_VENDA),
        normalizeString(multiple?.QTD_PECAS_UND_ENT_MULT_VENDA),
        normalizeString(multiple?.DATA_HORA_ALTERACAO),
      ]
        .filter(Boolean)
        .join(":"),
    );
  const auxiliaryCodes = recordsFrom(value?.codigos_auxiliares ?? value?.CODIGOS_AUXILIARES ?? value?.codigosAuxiliares).map((item) =>
    [
      normalizeString(item?.CODIGO_BARRAS ?? item?.codigo_barras ?? item?.codigoBarras),
      normalizeString(item?.QUANTIDADE_CAIXA_FECHADA ?? item?.quantidade_caixa_fechada ?? item?.quantidadeCaixaFechada),
    ]
      .filter(Boolean)
      .join(":"),
  );
  return [
    productIdFrom(product),
    normalizeString(product?.DATA_HORA_ALTERACAO ?? product?.DATA_ATUALIZACAO ?? product?.updatedAt),
    normalizeString(product?.DATA_HORA_ULTIMA_ATUALIZ_FOTO),
    normalizeString(product?.POSSUI_FOTOS ?? product?.possui_fotos ?? value?.POSSUI_FOTOS ?? value?.possui_fotos),
    normalizeString(product?.QTD_FOTOS ?? product?.qtd_fotos ?? value?.QTD_FOTOS ?? value?.qtd_fotos),
    normalizeString(product?.ATIVO),
    normalizeString(product?.CODIGO_BARRAS ?? product?.CODIGO_BARRA ?? product?.EAN ?? product?.GTIN),
    normalizeString(product?.GRUPO_PRODUTO_NOME ?? group?.NOME),
    normalizeString(product?.MARCA_NOME ?? brand?.NOME),
    normalizeString(product?.QUANTIDADE_CAIXA_FECHADA),
    normalizeString(product?.CODIGO_BARRAS_CAIXA_FECHADA),
    normalizeString(product?.PRECO_VENDA ?? value?.PRECO_VENDA ?? value?.preco_venda ?? value?.precoVenda),
    normalizeString(product?.PRECO_VENDA_TABELA_PRECO_ID ?? value?.PRECO_VENDA_TABELA_PRECO_ID),
    ...auxiliaryCodes,
    normalizeString(product?.EMBALAGEM_FRACIONADA),
    normalizeString(product?.QUANTIDADE_UNIDADE_LOGISTICA),
    ...stocks,
    ...multiples,
    normalizeString(
      characteristics?.CARACTERISTICAS_PRODUTO_WEB ??
        characteristics?.CARACTER_PROD_WEB_SEM_HTML ??
        characteristics?.CARACTERISTICAS_PRODUTO ??
        product?.CARACTERISTICAS ??
        product?.caracteristicas ??
        product?.DESCRICAO_TECNICA ??
        product?.NOME_COMPRA,
    ),
    ...photos.map((photo) =>
      [
        normalizeString(photo?.ORDEM),
        normalizeString(photo?.DATA_HORA_ALTERACAO),
        normalizeString(photo?.TAMANHO_BYTES),
      ]
        .filter(Boolean)
        .join(":"),
    ),
  ]
    .filter(Boolean)
    .join("|");
}

async function fetchJson({ url, token, timeoutMs, attempt = 1 }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status >= 500 && attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        return fetchJson({ url, token, timeoutMs, attempt: attempt + 1 });
      }
      if (response.status === 404) return null;
      const message = await response.text().catch(() => "");
      const error = new Error(`ERP response ${response.status} on ${url}${message ? `: ${message}` : ""}`);
      error.status = response.status;
      throw error;
    }

    return response.json();
  } catch (error) {
    if (error?.name === "AbortError" && attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      return fetchJson({ url, token, timeoutMs, attempt: attempt + 1 });
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function getAccessToken(env, baseUrl) {
  if (env.ERP_API_TOKEN && tokenExpiresAt(env.ERP_API_TOKEN) > Date.now() + 120000) return env.ERP_API_TOKEN;

  const username = env.ERP_API_USERNAME ?? env.API_EXTERNA_USERNAME;
  const password = env.ERP_API_PASSWORD ?? env.API_EXTERNA_PASSWORD;

  if (!username || !password) {
    throw new Error("Configure ERP_API_USERNAME e ERP_API_PASSWORD em .env.local");
  }

  const response = await fetch(new URL("/token", baseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ username, password }).toString(),
  });

  if (!response.ok) {
    throw new Error(`Token response ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.access_token) {
    throw new Error("Token nao retornado pela integracao");
  }

  return payload.access_token;
}

function tokenExpiresAt(token) {
  const [, payload] = token.split(".");
  if (!payload) return Date.now() + 45 * 60 * 1000;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : Date.now() + 45 * 60 * 1000;
  } catch {
    return Date.now() + 45 * 60 * 1000;
  }
}

async function runPool(items, concurrency, worker) {
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });

  await Promise.all(workers);
}

async function downloadPhoto({ baseUrl, token, productId, order, targetPath, timeoutMs, companyId, attempt = 1 }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const maxAttempts = 3;

  try {
    const url = new URL(`/api/v1/produtos/${encodeURIComponent(productId)}/fotos/${order}`, baseUrl);
    url.searchParams.set("empresa_id", companyId);
    const response = await fetch(url, {
      headers: {
        accept: "image/*,application/octet-stream,*/*",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (attempt < maxAttempts && ![404, 422].includes(response.status)) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        return downloadPhoto({ baseUrl, token, productId, order, targetPath, timeoutMs, companyId, attempt: attempt + 1 });
      }
      return false;
    }

    const contentType = response.headers.get("content-type") || "";
    const extension = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" : ".jpg";
    const filePath = targetPath.replace(/\.[a-z0-9]+$/i, extension);
    await fs.writeFile(filePath, Buffer.from(await response.arrayBuffer()));
    return filePath;
  } catch {
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
      return downloadPhoto({ baseUrl, token, productId, order, targetPath, timeoutMs, companyId, attempt: attempt + 1 });
    }
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function syncPhotos({ projectRoot, baseUrl, token, productId, orders, timeoutMs, companyId, photoMetadata = [], forceRefresh = false }) {
  const imageDir = path.join(projectRoot, "public", "products", "erp", productId);
  await fs.mkdir(imageDir, { recursive: true });
  const images = [];
  const metadataOrders = photoMetadata
    .map((photo) => Number(photo?.ORDEM))
    .filter((order) => Number.isInteger(order) && order >= 0);
  const ordersToTry = metadataOrders.length
    ? [...new Set(metadataOrders)].sort((a, b) => a - b)
    : Array.from({ length: orders }, (_, index) => index);

  for (const order of ordersToTry) {
    const existing = await findExistingImage(imageDir, order);
    if (existing && !forceRefresh) {
      images.push(`/products/erp/${productId}/${path.basename(existing)}`);
      continue;
    }

    const targetPath = path.join(imageDir, `${order}.jpg`);
    const downloaded = await downloadPhoto({ baseUrl, token, productId, order, targetPath, timeoutMs, companyId });
    if (downloaded) {
      images.push(`/products/erp/${productId}/${path.basename(downloaded)}`);
    } else if (existing) {
      images.push(`/products/erp/${productId}/${path.basename(existing)}`);
    }
  }

  return images;
}

async function findExistingImage(imageDir, order) {
  for (const extension of [".jpg", ".png", ".webp"]) {
    const filePath = path.join(imageDir, `${order}${extension}`);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // Tenta a proxima extensao.
    }
  }
  return null;
}

async function writeJsonFileAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  await fs.copyFile(temporaryPath, filePath);
  await fs.rm(temporaryPath, { force: true });
}

async function writeTextFileAtomic(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(16).slice(2)}.tmp`;
  await fs.writeFile(temporaryPath, value);
  await fs.copyFile(temporaryPath, filePath);
  await fs.rm(temporaryPath, { force: true });
}

function sortCatalogProducts(products) {
  return products.sort((a, b) => a.nomeVenda.localeCompare(b.nomeVenda, "pt-BR", { numeric: true }));
}

function normalizeReportValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeReportValue(item));
  }
  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalizeReportValue(value[key]);
        return accumulator;
      }, {});
  }
  return value;
}

function compactReportValue(value, limit = 180) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) || typeof value === "object" ? JSON.stringify(value) : String(value);
  return text.length > limit ? `${text.slice(0, limit - 3)}...` : text;
}

function diffProductRecords(previous, next) {
  const labels = {
    nomeVenda: "Nome",
    grupo: "Grupo",
    marca: "Marca",
    subgrupo: "Subgrupo",
    caracteristicas: "Características",
    codigoOriginal: "Código original",
    codigoBarras: "Código de barras",
    unidadeVenda: "Unidade",
    multiploVenda: "Múltiplo de venda",
    quantidadeCaixa: "Quantidade caixa",
    ativo: "Ativo",
    imagemPrincipal: "Imagem principal",
    imagens: "Imagens",
    slug: "Slug",
    codigoAdm: "Código administrativo",
    updatedAt: "Atualização",
  };

  const keys = new Set([
    ...Object.keys(previous ?? {}),
    ...Object.keys(next ?? {}),
  ]);
  const changes = [];
  for (const key of Array.from(keys).filter((value) => !["syncSignature", "syncListSignature"].includes(value)).sort()) {
    const before = normalizeReportValue(previous?.[key]);
    const after = normalizeReportValue(next?.[key]);
    if (JSON.stringify(before) === JSON.stringify(after)) continue;
    changes.push({
      field: labels[key] ?? key,
      before: compactReportValue(before),
      after: compactReportValue(after),
    });
  }

  return changes;
}

async function writeSyncReport({ projectRoot, report }) {
  const baseReportDir = path.join(projectRoot, process.env.ERP_SYNC_REPORT_DIR ?? DEFAULT_REPORT_DIR);
  const reportDate = new Date(report.generatedAt).toISOString().slice(0, 10);
  const reportDir = path.join(baseReportDir, reportDate);
  await fs.mkdir(reportDir, { recursive: true });

  const stamp = new Date(report.generatedAt).toISOString().replace(/[:.]/g, "-");
  const baseName = `sync-erp-${stamp}`;
  const jsonPath = path.join(reportDir, `${baseName}.json`);
  const mdPath = path.join(reportDir, `${baseName}.md`);

  const mdLines = [
    `# Relatório de sincronização ERP`,
    "",
    `Gerado em: ${report.generatedAt}`,
    `Base: ${report.baseUrl}`,
    `Empresa: ${report.companyId}`,
    "",
    `## Resumo`,
    `- Candidatos listados: ${report.summary.listed}`,
    `- Novos: ${report.summary.added}`,
    `- Alterados: ${report.summary.changed}`,
    `- Sem mudança: ${report.summary.unchanged}`,
    `- Sugestões de remoção: ${report.summary.removalCandidates}`,
    `- Falhas: ${report.summary.failed}`,
    "",
    `## Novos produtos`,
    ...(report.added.length
      ? report.added.map((item) => `- ${item.id} | ${item.name} | ${item.brand || "sem marca"} | ${item.group || "sem grupo"}`)
      : ["- Nenhum"]),
    "",
    `## Produtos alterados`,
    ...(report.changed.length
      ? report.changed.map((item) => [
          `- ${item.id} | ${item.name}`,
          ...item.changes.map((change) => `  - ${change.field}: ${change.before || "(vazio)"} -> ${change.after || "(vazio)"}`),
        ]).flat()
      : ["- Nenhum"]),
    "",
    `## Sugestões de remoção`,
    ...(report.removalCandidates.length
      ? report.removalCandidates.map((item) => `- ${item.id} | ${item.name} | ${item.reason}`)
      : ["- Nenhum"]),
    "",
    `## Falhas`,
    ...(report.failed.length
      ? report.failed.map((item) => `- ${item.id || "-"} | ${item.reason}`)
      : ["- Nenhum"]),
  ];

  await writeJsonFileAtomic(jsonPath, report);
  await writeTextFileAtomic(mdPath, `${mdLines.join("\n")}\n`);
  return { jsonPath, mdPath };
}

function normalizeProduct(detail, index, images, companyId, syncListSignature = null) {
  const product = getProductRecord(detail);
  const group = getGroupRecord(detail);
  const brand = getBrandRecord(detail);
  const characteristics = getCharacteristicsRecord(detail);
  const multiples = recordsFrom(detail?.multiplos ?? detail?.MULTIPLOS);
  const primaryMultiple = recordForCompany(multiples, companyId);
  const productId = productIdFrom(product) ?? `ERP-${index + 1}`;
  const nomeVenda =
    normalizeString(product.NOME_VENDA) ??
    normalizeString(product.DESCRICAO) ??
    normalizeString(product.DESCRICAO_PRODUTO) ??
    normalizeString(product.NOME) ??
    `Produto ${index + 1}`;
  const grupo = normalizeString(product.GRUPO_PRODUTO_NOME) ?? normalizeString(group.NOME);
  const marca = PRODUCT_BRAND_OVERRIDES.get(productId) ?? normalizeString(product.MARCA_NOME) ?? normalizeString(brand.NOME);
  const caracteristicas =
    normalizeString(characteristics.CARACTERISTICAS_PRODUTO_WEB) ??
    normalizeString(characteristics.CARACTER_PROD_WEB_SEM_HTML) ??
    normalizeString(characteristics.CARACTERISTICAS_PRODUTO) ??
    normalizeString(product.CARACTERISTICAS) ??
    normalizeString(product.DESCRICAO_TECNICA) ??
    normalizeString(product.NOME_COMPRA);

  return {
    id: productId,
    slug: slugify(`${nomeVenda}-${productId}`),
    codigoAdm: productId,
    nomeVenda,
    unidadeVenda: normalizeString(product.UNIDADE_VENDA) ?? normalizeString(product.UNIDADE),
    multiploVenda: normalizeNumber(primaryMultiple?.MULTIPLO_VENDA ?? primaryMultiple?.MULTIPLO_VENDA_AVISO_VENDA ?? product.MULTIPLO_VENDA_WEB ?? product.MULTIPLO_VENDA ?? product.EMBALAGEM_FRACIONADA),
    quantidadeCaixa: closedBoxQuantityFrom(detail),
    codigoBarrasCaixaFechada: closedBoxBarcodeFrom(detail),
    marca,
    codigoOriginal: normalizeString(product.CODIGO_ORIGINAL ?? product.CODIGO_FABRICANTE ?? product.REFERENCIA),
    codigoBarras: normalizeString(product.CODIGO_BARRAS ?? product.CODIGO_BARRA ?? product.EAN ?? product.GTIN),
    grupo,
    subgrupo: null,
    caracteristicas,
    imagens: images.length ? images : [COMPANY_LOGO_IMAGE],
    imagemPrincipal: images[0] ?? COMPANY_LOGO_IMAGE,
    ativo: isActive(product.ATIVO),
    updatedAt: normalizeString(product.DATA_HORA_ALTERACAO ?? product.DATA_ATUALIZACAO) ?? new Date().toISOString(),
    syncSignature: signatureFrom(detail, companyId),
    syncListSignature,
  };
}

async function main() {
  const projectRoot = process.cwd();
  const env = await readEnv(projectRoot);
  const baseUrl = env.ERP_API_URL || env.ERP_API_BASE_URL || DEFAULT_BASE_URL;
  const legacyProductsPath = env.ERP_SYNC_PRODUCTS_PATH ?? env.ERP_PRODUCTS_PATH ?? "";
  const productsPath =
    !legacyProductsPath || legacyProductsPath === "/api/v1/consultas/produtos"
      ? "/api/v1/produtos/completos"
      : legacyProductsPath;
  const companyId = env.ERP_EMPRESA_ID ?? env.ERP_COMPANY_ID ?? DEFAULT_COMPANY_ID;
  const concurrency = Math.max(1, Number(env.ERP_SYNC_CONCURRENCY ?? 8) || 8);
  const timeoutMs = Math.max(1000, Number(env.ERP_SYNC_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS);
  const pageSize = Math.max(1, Number(env.ERP_SYNC_PAGE_SIZE ?? DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE);
  const maxProducts = Math.max(0, Number(env.ERP_SYNC_LIMIT ?? 0) || 0);
  const startIndex = Math.max(0, Number(env.ERP_SYNC_START_INDEX ?? 0) || 0);
  const productIdsFromEnv = (env.ERP_SYNC_PRODUCT_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const productIdsFromFile = await readProductIdsFile(env.ERP_SYNC_PRODUCT_IDS_FILE);
  const explicitProductIds = [...new Set([...productIdsFromEnv, ...productIdsFromFile])];
  const photoOrders = Math.max(1, Number(env.ERP_SYNC_PHOTO_ORDERS ?? DEFAULT_PHOTO_ORDERS) || DEFAULT_PHOTO_ORDERS);
  const forcePhotoRefresh = process.argv.includes("--force-photos") || envFlagEnabled(env.ERP_SYNC_FORCE_PHOTOS);
  const keepLocalProducts = process.argv.includes("--keep-local-products") || envFlagEnabled(env.ERP_SYNC_KEEP_LOCAL_PRODUCTS);
  const skipPhotoSync = envFlagEnabled(env.ERP_SYNC_SKIP_PHOTOS);
  const dataFile = path.join(projectRoot, "src", "data", "products-maxima.json");
  const incrementalOnly = process.argv.includes("--incremental") || envFlagEnabled(env.ERP_SYNC_INCREMENTAL_ONLY);
  const fullRefresh = !incrementalOnly && !explicitProductIds.length && maxProducts === 0 && startIndex === 0;

  const previousProducts = JSON.parse(stripUtf8Bom(await fs.readFile(dataFile, "utf8").catch(() => "[]")));
  const previousById = new Map(previousProducts.map((product) => [normalizeString(product.id) ?? normalizeString(product.codigoAdm), product]));
  let token = await getAccessToken(env, baseUrl);
  let tokenExpiration = tokenExpiresAt(token);
  let refreshPromise = null;

  async function getValidToken(force = false) {
    const shouldRefresh = force || Date.now() > tokenExpiration - 120000;
    if (!shouldRefresh) return token;

    refreshPromise ??= getAccessToken(env, baseUrl).then((nextToken) => {
      token = nextToken;
      tokenExpiration = tokenExpiresAt(nextToken);
      refreshPromise = null;
      return nextToken;
    });

    return refreshPromise;
  }

  const candidates = [];
  const candidateIds = new Set();
  const listedIds = new Set();
  let listingRepeated = false;
  let total = 0;
  let offset = 0;

  for (const productId of explicitProductIds) {
    candidateIds.add(productId);
    candidates.push({ PRODUTO_ID: productId, ATIVO: "S" });
  }

  process.stdout.write(
    `${colorize("cyan", incrementalOnly ? "Sincronizacao incremental" : "Sincronizacao completa")}: listando produtos ERP para validar mix da empresa ${companyId}. Page size: ${pageSize}. Limite: ${
      maxProducts || "sem limite"
    }. Detalhe: /api/v1/produtos/{produto_id}/completo?empresa_id=${companyId}\n`,
  );

  while (!explicitProductIds.length && (!maxProducts || candidates.length < maxProducts)) {
    const url = new URL(productsPath, baseUrl);
    url.searchParams.set("limit", String(pageSize));
    url.searchParams.set("offset", String(offset));
    url.searchParams.set("empresa_id", companyId);
    url.searchParams.set("ativo", "S");

    const payload = await fetchJson({ url, token: await getValidToken(), timeoutMs });
    const pageItems = extractList(payload);
    total = extractTotal(payload, total);

    if (!pageItems.length) break;
    const pageIds = pageItems.map(productIdFrom).filter(Boolean);
    const hasNewListedId = pageIds.some((id) => !listedIds.has(id));

    for (const id of pageIds) {
      listedIds.add(id);
    }

    if (!hasNewListedId && offset > 0) {
      process.stdout.write(
        incrementalOnly
          ? "Listagem repetida detectada; mantendo base local e sincronizando somente os itens ja listados.\n"
          : "Listagem repetida detectada; usando os IDs locais como base para completar a sincronizacao.\n",
      );
      listingRepeated = true;
      break;
    }

    for (const item of pageItems.filter(shouldFetchDetailFromList)) {
      const productId = productIdFrom(item);
      if (!productId || candidateIds.has(productId)) continue;
      candidateIds.add(productId);
      candidates.push(item);
    }
    offset += pageItems.length;

    process.stdout.write(
      `${colorize("gray", "Listagem")} ${Math.min(candidates.length, maxProducts || candidates.length)}/${total || "?"} candidatos\n`,
    );

    if (pageItems.length < pageSize || (total && offset >= total)) break;
  }

  if (!incrementalOnly && ((!fullRefresh && !explicitProductIds.length) || listingRepeated)) {
    for (const previous of previousProducts) {
      const productId = productIdFrom(previous);
      if (!productId || EXCLUDED_CATALOG_PRODUCT_IDS.has(productId) || candidateIds.has(productId) || previous.ativo === false) continue;
      candidateIds.add(productId);
      candidates.push(previous);
    }
  }

  const incrementalCandidates = incrementalOnly && !explicitProductIds.length
    ? candidates.filter((candidate) => {
        const productId = productIdFrom(candidate);
        if (!productId) return false;

        const previous = previousById.get(productId);
        if (!previous) return true;
        if (!Object.prototype.hasOwnProperty.call(previous, "codigoBarrasCaixaFechada")) return true;

        const currentListSignature = hasListMixInformation(candidate) ? listSignatureFrom(candidate) : null;
        const legacyListSignature = hasListMixInformation(candidate) ? legacyListSignatureFrom(candidate) : null;
        if (!currentListSignature || !previous.syncListSignature) return true;

        return previous.syncListSignature !== currentListSignature && previous.syncListSignature !== legacyListSignature;
      })
    : candidates;
  const skippedByIncremental = candidates.length - incrementalCandidates.length;
  if (incrementalOnly && skippedByIncremental > 0) {
    process.stdout.write(
      `${colorize("gray", "Incremental")} ${skippedByIncremental} produtos sem alteracao rapida foram preservados sem consultar detalhe/foto.\n`,
    );
  }

  const limitedCandidates = maxProducts
    ? incrementalCandidates.slice(startIndex, startIndex + maxProducts)
    : incrementalCandidates.slice(startIndex);
  process.stdout.write(
    `${colorize("cyan", "Processando")} ${limitedCandidates.length} produtos a partir do indice ${startIndex}. Vou mostrar progresso a cada 100.\n`,
  );
  const normalizedById = new Map(
    previousProducts.map((product) => [normalizeString(product.id) ?? normalizeString(product.codigoAdm), product]).filter(([id]) => id),
  );
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    companyId,
    summary: {
      listed: 0,
      added: 0,
      changed: 0,
      unchanged: 0,
      removalCandidates: 0,
      failed: 0,
    },
    added: [],
    changed: [],
    removalCandidates: [],
    failed: [],
  };
  const removalCandidateById = new Map();
  let unchanged = 0;
  let added = 0;
  let changed = 0;
  let failed = 0;
  let lastSavedProgress = 0;
  let nextProgressLog = 100;
  let flushPromise = Promise.resolve();

  const registerRemovalCandidate = (productId, name, reason) => {
    if (!productId || !reason) return;
    const current = removalCandidateById.get(productId);
    if (current) {
      if (!current.reasons.includes(reason)) {
        current.reasons.push(reason);
      }
      return;
    }

    removalCandidateById.set(productId, {
      id: productId,
      name: name ?? productId,
      reasons: [reason],
    });
  };

  const logProgress = (force = false) => {
    const processed = added + changed + unchanged + failed;
    if (!force && processed < nextProgressLog) return;

    const statusColor = failed ? "yellow" : "green";
    process.stdout.write(
      `${colorize(statusColor, "Progresso")} ${processed}/${limitedCandidates.length} (${formatPercent(processed, limitedCandidates.length)}) | ` +
        `${colorize("green", `Novos: ${added}`)} | ` +
        `${colorize("cyan", `Alterados: ${changed}`)} | ` +
        `${colorize("gray", `Sem mudança: ${unchanged}`)} | ` +
        `${colorize(failed ? "red" : "gray", `Falhas: ${failed}`)}\n`,
    );

    while (processed >= nextProgressLog) {
      nextProgressLog += 100;
    }
  };

  const flushProgress = async (force = false) => {
    const processed = added + changed + unchanged + failed;
    logProgress(force);
    if (!force && processed - lastSavedProgress < 50) return;

    flushPromise = flushPromise.then(async () => {
      const sortedProducts = sortCatalogProducts(Array.from(normalizedById.values()));
      await writeJsonFileAtomic(dataFile, sortedProducts);
      lastSavedProgress = processed;
    });

    await flushPromise;
  };

  await runPool(limitedCandidates, concurrency, async (candidate, index) => {
    const productId = productIdFrom(candidate);
    if (!productId) return;

    const previous = previousById.get(productId);
    const hasFastListData = hasListMixInformation(candidate);
    const currentListSignature = hasFastListData ? listSignatureFrom(candidate) : null;

    try {
      const detailUrl = new URL(`/api/v1/produtos/${encodeURIComponent(productId)}/completo`, baseUrl);
      detailUrl.searchParams.set("empresa_id", companyId);
      let detailPayload;
      try {
        detailPayload = await fetchJson({ url: detailUrl, token: await getValidToken(), timeoutMs });
      } catch (error) {
        if (error.status !== 401) throw error;
        detailPayload = await fetchJson({ url: detailUrl, token: await getValidToken(true), timeoutMs });
      }
      const detail = detailPayload?.data ?? detailPayload;
      if (
        !previous &&
        shouldBlockNewProductByGroupName(groupNameFromDetail(detail)) &&
        !ALLOWED_NEW_ACCESSORY_PRODUCT_IDS.has(productId)
      ) {
        registerRemovalCandidate(productId, productNameFromDetail(detail) ?? productId, "produto novo em grupo bloqueado para novas entradas");
        await flushProgress();
        return;
      }

      if (!detail || !isCatalogEligible(detail, companyId)) {
        if (previous) {
          normalizedById.delete(productId);
          registerRemovalCandidate(productId, previous.nomeVenda ?? productId, "produto nao atendeu mais aos criterios da sincronizacao");
        }
        failed += previous ? 0 : 0;
        await flushProgress();
        return;
      }

      const detailSignature = signatureFrom(detail, companyId);
      const nextProduct = normalizeProduct(detail, index, [], companyId, currentListSignature);
      const images = skipPhotoSync
        ? previous?.imagens?.length
          ? previous.imagens
          : []
        : await syncPhotos({
            projectRoot,
            baseUrl,
            token: await getValidToken(),
            productId,
            orders: photoOrders,
            timeoutMs,
            companyId,
            photoMetadata: recordsFrom(detail.fotos ?? detail.FOTOS ?? detail.foto ?? detail.FOTO),
            forceRefresh: forcePhotoRefresh || !previous || previous.syncSignature !== detailSignature,
      });
      if (!images.length) {
        normalizedById.delete(productId);
        failed += 1;
        report.failed.push({
          id: productId,
          reason: "produto novo sem foto real; manter fora do catalogo para avaliacao",
        });
        await flushProgress();
        return;
      }
      nextProduct.imagens = images.length ? images : [COMPANY_LOGO_IMAGE];
      nextProduct.imagemPrincipal = images[0] ?? COMPANY_LOGO_IMAGE;
      normalizedById.set(productId, nextProduct);
      if (!previous) {
        added += 1;
        report.added.push({
          id: productId,
          name: nextProduct.nomeVenda,
          brand: nextProduct.marca,
          group: nextProduct.grupo,
        });
      } else {
        const nextProduct = normalizedById.get(productId);
        const changes = diffProductRecords(previous, nextProduct);
        if (changes.length) {
          changed += 1;
          report.changed.push({
            id: productId,
            name: nextProduct.nomeVenda,
            changes,
          });
        } else {
          unchanged += 1;
        }
      }
    } catch {
      failed += 1;
      if (previous) {
        normalizedById.set(productId, previous);
        registerRemovalCandidate(productId, previous.nomeVenda ?? productId, "falha ao consultar os detalhes no ERP");
      } else {
        report.failed.push({
          id: productId,
          reason: "falha ao consultar os detalhes no ERP",
        });
      }
    }

    await flushProgress();
  });

  await flushProgress(true);
  const canEvaluateMissingProducts = !explicitProductIds.length && !maxProducts && startIndex === 0 && !listingRepeated;
  if (canEvaluateMissingProducts) {
    for (const previous of previousProducts) {
      const productId = productIdFrom(previous);
      if (!productId || candidateIds.has(productId) || listedIds.has(productId)) continue;
      normalizedById.delete(productId);
      registerRemovalCandidate(productId, previous.nomeVenda ?? productId, "produto nao apareceu na listagem atual do ERP");
    }
  }

  report.summary.listed = listedIds.size;
  report.summary.added = added;
  report.summary.changed = changed;
  report.summary.unchanged = unchanged;
  report.summary.removalCandidates = removalCandidateById.size;
  report.summary.failed = failed;
  report.removalCandidates = Array.from(removalCandidateById.values()).map((item) => ({
    id: item.id,
    name: item.name,
    reason: item.reasons.join("; "),
  }));
  report.added.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  report.changed.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  report.removalCandidates.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));
  report.failed.sort((a, b) => String(a.id ?? "").localeCompare(String(b.id ?? ""), "pt-BR", { numeric: true }));

  const finalProducts = Array.from(normalizedById.values());
  const sortedProducts = sortCatalogProducts(finalProducts);
  await writeJsonFileAtomic(dataFile, sortedProducts);
  const reportPaths = await writeSyncReport({ projectRoot, report });
  process.stdout.write(
    `${colorize("green", "Sincronizacao concluida.")} Produtos no catalogo: ${sortedProducts.length}. ` +
      `Novos: ${added}. Alterados: ${changed}. Sem mudança: ${unchanged}. ` +
      `Sugestoes de remocao: ${report.summary.removalCandidates}. Falhas: ${failed}. ` +
      `Relatorio: ${path.relative(projectRoot, reportPaths.jsonPath)}\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
