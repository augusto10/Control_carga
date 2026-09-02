import productsData from '@/src/data/products-maxima.json';
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
    atualizadoEm: products.reduce<string | null>((latest, product) => {
      if (!latest || product.updatedAt > latest) return product.updatedAt;
      return latest;
    }, null),
  };
}
