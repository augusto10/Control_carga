import assert from 'node:assert/strict';
import { analyzeBarcode, analyzeBarcodeWithAdmFallback, isValidEan13, isValidEan8 } from '@/lib/barcode-validation';
import { generateZplLabels } from '@/lib/zpl-generator';
import { formatProductAdm } from '@/lib/product-label';
import { mapSantriProductToEtiqueta } from '@/services/santri-products';
import { getProductLabelPdfPageCount } from '@/services/product-label-pdf';

const santriFixture = {
  id: '100879',
  codigo_adm: '100879',
  descricao: 'BASE REG GAVETA 3/4"',
  CODIGO_ORIGINAL: 'BASE-REG-34',
  marca: 'VERSALLI',
  codigos_barras: [
    { codigo_barras: '0087946736552', principal: true, tipo: 'EAN' },
  ],
  codigos_auxiliares: [
    { CODIGO_BARRAS: '10087946736559', QUANTIDADE_CAIXA_FECHADA: 6 },
  ],
  fotos: [
    { ORDEM: 0, TAMANHO_BYTES: 12345 },
  ],
  estoques: [
    { EMPRESA_ID: 1, QUANTIDADE_ESTOQUE: 42 },
  ],
};

const produto = mapSantriProductToEtiqueta(santriFixture, '100879');
const produtoNested = mapSantriProductToEtiqueta({
  produto: {
    PRODUTO_ID: 38448,
    NOME: 'BASE REG GAVETA 3/4"',
    MARCA_NOME: 'VERSALLI',
    CODIGO_BARRAS: '0087946736552',
  },
  marca: {
    NOME: 'VERSALLI',
  },
}, '38448');

assert.equal(produto.codigoBarras, '0087946736552');
assert.equal(produto.codigoBarrasCaixaFechada, '10087946736559');
assert.equal(produto.quantidadeCaixaFechada, 6);
assert.equal(produto.nome, 'BASE REG GAVETA 3/4"');
assert.equal(produto.codigoOriginal, 'BASE-REG-34');
assert.equal(produto.imagemUrl, '/api/etiquetas/produto/100879/foto?ordem=0');
assert.equal(produto.quantidadeEstoque, 42);
assert.equal(formatProductAdm('38136'), '38.136');
assert.equal(formatProductAdm('ABC-38136'), 'ABC-38136');
assert.equal(getProductLabelPdfPageCount(1), 1);
assert.equal(getProductLabelPdfPageCount(2), 1);
assert.equal(getProductLabelPdfPageCount(3), 2);
assert.equal(getProductLabelPdfPageCount(10), 5);
assert.equal(produtoNested.produtoId, '38448');
assert.equal(produtoNested.nome, 'BASE REG GAVETA 3/4"');
assert.equal(produtoNested.marca, 'VERSALLI');
assert.equal(produtoNested.codigoBarras, '0087946736552');
assert.equal(isValidEan13('0087946736552'), true);
assert.equal(isValidEan8('55123457'), true);
assert.equal(analyzeBarcode('ABCD-1234').type, 'CODE128');
assert.equal(analyzeBarcode('').isValid, false);
assert.equal(analyzeBarcode('1234567890123').isValid, false);
assert.deepEqual(analyzeBarcodeWithAdmFallback(null, '100879'), {
  isValid: true,
  type: 'CODE128',
  normalizedValue: '100879',
});
assert.equal(analyzeBarcodeWithAdmFallback('1234567890123', '100879').isValid, false);

const zpl1 = generateZplLabels(produto, 1);
const zpl2 = generateZplLabels(produto, 2);
const zpl3 = generateZplLabels(produto, 3);
const zpl4 = generateZplLabels(produto, 4);
const zpl6 = generateZplLabels(produto, 6);

assert.match(zpl1, /\^FO22,10/);
assert.match(zpl2, /\^FO286,10/);
assert.match(zpl3, /\^FO550,10/);
assert.equal((zpl4.match(/\^XA/g) || []).length, 2);
assert.equal((zpl6.match(/\^XA/g) || []).length, 2);
assert.equal((generateZplLabels(produto, 50).match(/\^XA/g) || []).length, 17);
assert.equal((generateZplLabels(produto, 50).match(/\^FD0087946736552/g) || []).length, 50);
assert.match(generateZplLabels(produto, 1), /~SD25/);
const closedBoxZpl = generateZplLabels(produto, 2, 'CAIXA_FECHADA');
assert.equal((closedBoxZpl.match(/\^XA/g) || []).length, 2);
assert.match(closedBoxZpl, /\^LL480/);
assert.match(closedBoxZpl, /10087946736559/);
assert.match(closedBoxZpl, /CAIXA FECHADA - 6 UN/);
const product100x60Zpl = generateZplLabels(produto, 2, 'PRODUTO_100X60');
assert.equal((product100x60Zpl.match(/\^XA/g) || []).length, 2);
assert.match(product100x60Zpl, /\^LL480/);
assert.match(product100x60Zpl, /0087946736552/);
assert.match(product100x60Zpl, /BASE REG GAVETA 3\/4/);
assert.match(product100x60Zpl, /VERSALLI/);
assert.doesNotMatch(product100x60Zpl, /CAIXA FECHADA/);
const productWithoutBarcode = { ...produto, codigoBarras: null, codigoBarrasCaixaFechada: null };
assert.match(generateZplLabels(productWithoutBarcode, 1), /\^BCN/);
assert.match(generateZplLabels(productWithoutBarcode, 1), /\^FD100879\^FS/);
assert.match(generateZplLabels(productWithoutBarcode, 1, 'PRODUTO_100X60'), /\^FD100879\^FS/);
assert.match(generateZplLabels(productWithoutBarcode, 1, 'CAIXA_FECHADA'), /\^FD100879\^FS/);
assert.match(
  generateZplLabels({ ...produto, nome: 'PRODUTO COM NOME MUITO GRANDE PARA TESTE DE QUEBRA CONTROLADA NA ETIQUETA' }, 1),
  /…|\^FDPRODUTO COM NOME/
);

async function testQzIntegrationMocks() {
  const mockConnect = async () => { throw new Error('QZ Tray não está conectado.'); };
  const mockPrint = async () => 'ok';

  await assert.rejects(mockConnect, /QZ Tray não está conectado/);
  assert.equal(await mockPrint(), 'ok');
}

void testQzIntegrationMocks().then(() => {
  console.log('labels.test.ts: ok');
});
