import productsData from '@/src/data/products-maxima.json';
import productsMetadata from '@/src/data/products-maxima-meta.json';
import { analyzeBarcode } from '@/lib/barcode-validation';
import type { ProdutoEtiqueta, ProdutoEtiquetaCatalogo } from '@/types/labels';

const products = productsData as ProdutoEtiquetaCatalogo[];

function normalize(value: string | null) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function toLabelProduct(product: ProdutoEtiquetaCatalogo): ProdutoEtiqueta {
  const barcode = analyzeBarcode(product.codigoBarras);
  return {
    produtoId: product.id,
    codigoAdm: product.codigoAdm,
    nome: product.nomeVenda,
    marca: product.marca,
    codigoOriginal: product.codigoOriginal,
    imagemUrl: product.imagemPrincipal,
    codigoBarras: product.codigoBarras,
    barcodeType: barcode.type,
    codigoBarrasCaixaFechada: product.codigoBarrasCaixaFechada ?? null,
    quantidadeCaixaFechada: product.quantidadeCaixa,
    quantidadeEstoque: null,
  };
}

export function searchLabelProductsByBrand(search: string): ProdutoEtiqueta[] {
  const normalizedSearch = normalize(search.trim());
  if (!normalizedSearch) return [];

  return products
    .filter((product) => (
      product.ativo
      && product.imagemPrincipal.startsWith('/products/erp/')
      && normalize(product.marca).includes(normalizedSearch)
    ))
    .map(toLabelProduct)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
}

export function getLabelProductsCatalogInfo() {
  return {
    total: products.length,
    atualizadoEm: productsMetadata.sincronizadoEm || products.reduce<string | null>((latest, product) => {
      if (!latest || product.updatedAt > latest) return product.updatedAt;
      return latest;
    }, null),
  };
}

/** Map de id (=PRODUTO_ID do ERP) para codigoAdm, para lookup rápido nos itens de pedido. */
const admById = new Map<string, string>(products.map((p) => [String(p.id), p.codigoAdm]));
const brandById = new Map<string, string>(
  products.flatMap((product) => product.marca ? [[String(product.id), product.marca] as const] : [])
);

/**
 * Retorna o Código ADM do produto dado seu ID (PRODUTO_ID do ERP).
 * Retorna null se o produto não estiver na base local.
 */
export function getLabelProductAdmById(produtoId: string | number | null | undefined): string | null {
  if (produtoId === null || produtoId === undefined) return null;
  return admById.get(String(produtoId)) ?? null;
}

export function getLabelProductBrandById(produtoId: string | number | null | undefined): string | null {
  if (produtoId === null || produtoId === undefined) return null;
  return brandById.get(String(produtoId)) ?? null;
}
