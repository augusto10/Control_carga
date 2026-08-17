import JsBarcode from 'jsbarcode';
import { analyzeBarcode } from '@/lib/barcode-validation';
import { formatProductAdm } from '@/lib/product-label';
import { formatarNomeTransportadora } from '@/lib/etiquetas-transporte';
import { LabelType, ProdutoEtiqueta } from '@/types/labels';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildBarcodeSvg(
  value: string,
  format: 'EAN13' | 'EAN8' | 'CODE128',
  options?: { displayValue?: boolean; height?: number; width?: number; textMargin?: number },
) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const displayValue = options?.displayValue ?? true;
  const height = options?.height ?? 44;
  const width = options?.width ?? (format === 'CODE128' ? 1.6 : 1.8);
  const textMargin = options?.textMargin ?? 6;

  JsBarcode(svg, value, {
    format,
    displayValue,
    fontOptions: 'bold',
    fontSize: 14,
    height,
    margin: 0,
    width,
    background: '#ffffff',
    lineColor: '#000000',
    textMargin,
  });

  return svg.outerHTML;
}

function buildProductLabelMarkup(
  produto: ProdutoEtiqueta,
  barcodeSvg: string,
  barcodeValue: string,
  variant: 'a4-horizontal' | 'a4-vertical' | 'a4-vertical-double' | 'small',
  isClosedBox: boolean,
) {
  if (variant === 'a4-horizontal') {
    return `
      <article class="label label-a4">
        <section class="product-details">
          <div class="product-image">
            <span class="image-placeholder">SEM FOTO</span>
            ${produto.imagemUrl ? `<img src="${escapeHtml(produto.imagemUrl)}" alt="${escapeHtml(produto.nome)}" />` : ''}
          </div>
          <div class="product-copy">
            <div class="adm-large">CÓDIGO ADM: ${escapeHtml(formatProductAdm(produto.codigoAdm))}</div>
            <div class="identity">
              <div class="meta-line"><strong>MARCA:</strong> ${escapeHtml(produto.marca || 'SEM MARCA')}</div>
              <div class="meta-line"><strong>CÓDIGO ORIGINAL:</strong> ${escapeHtml(produto.codigoOriginal || '-')}</div>
            </div>
            <div class="description"><strong>DESCRIÇÃO:</strong> ${escapeHtml(produto.nome)}</div>
          </div>
        </section>
        <div class="barcode barcode-large">
          ${barcodeSvg}
          <div class="barcode-number">${escapeHtml(barcodeValue)}</div>
        </div>
      </article>
    `;
  }

  if (variant === 'a4-vertical' || variant === 'a4-vertical-double') {
    return `
      <article class="label ${variant === 'a4-vertical' ? 'label-a4-vertical' : 'label-a4-vertical-double'}">
        <section class="product-image ${variant === 'a4-vertical' ? 'product-image-vertical' : 'product-image-vertical-double'}">
          <span class="image-placeholder">SEM FOTO</span>
          ${produto.imagemUrl ? `<img src="${escapeHtml(produto.imagemUrl)}" alt="${escapeHtml(produto.nome)}" />` : ''}
        </section>
        <section class="product-copy ${variant === 'a4-vertical' ? 'product-copy-vertical' : 'product-copy-vertical-double'}">
          <div class="adm-large ${variant === 'a4-vertical' ? 'adm-large-vertical' : 'adm-large-vertical-double'}">CÓDIGO ADM: ${escapeHtml(formatProductAdm(produto.codigoAdm))}</div>
          <div class="identity ${variant === 'a4-vertical' ? 'identity-vertical' : 'identity-vertical-double'}">
            <div class="meta-line ${variant === 'a4-vertical' ? 'meta-line-vertical' : 'meta-line-vertical-double'}"><strong>MARCA:</strong> ${escapeHtml(produto.marca || 'SEM MARCA')}</div>
            <div class="meta-line ${variant === 'a4-vertical' ? 'meta-line-vertical' : 'meta-line-vertical-double'}"><strong>CÓDIGO ORIGINAL:</strong> ${escapeHtml(produto.codigoOriginal || '-')}</div>
          </div>
          <div class="description ${variant === 'a4-vertical' ? 'description-vertical' : 'description-vertical-double'}"><strong>DESCRIÇÃO:</strong> ${escapeHtml(produto.nome)}</div>
        </section>
        <div class="barcode barcode-large ${variant === 'a4-vertical' ? 'barcode-large-vertical' : 'barcode-large-vertical-double'}">
          ${barcodeSvg}
          <div class="barcode-number ${variant === 'a4-vertical-double' ? 'barcode-number-double' : ''}">${escapeHtml(barcodeValue)}</div>
        </div>
      </article>
    `;
  }

  return `
    <article class="label">
      <div class="title">${escapeHtml(produto.nome)}</div>
      <div class="brand">${escapeHtml(produto.marca || 'Sem marca')}</div>
      ${isClosedBox ? `<div class="box-info">CAIXA FECHADA - ${produto.quantidadeCaixaFechada || '-'} UN</div>` : ''}
      <div class="barcode">${barcodeSvg}</div>
      <div class="adm">ADM ${escapeHtml(produto.codigoAdm)}</div>
    </article>
  `;
}

export function printProductLabelsInBrowser(
  produtos: ProdutoEtiqueta[],
  printerName: string,
  labelType: LabelType = 'UNITARIA',
  outputMode: 'print' | 'pdf' = 'print',
  options?: {
    documentTitle?: string;
    previewTitle?: string;
    primaryButtonLabel?: string;
    duplicateProductsPerSheet?: boolean;
  },
) {
  if (typeof window === 'undefined') return;

  const isClosedBox = labelType === 'CAIXA_FECHADA';
  const isA4Product = labelType === 'A4_PRODUTO';
  const isA4ProductVertical = labelType === 'A4_PRODUTO_VERTICAL';
  const isA4ProductVerticalDouble = labelType === 'A4_PRODUTO_VERTICAL_DUPLA';
  const isBrowserA4Product = isA4Product || isA4ProductVertical || isA4ProductVerticalDouble;
  const isLandscapeA4 = isA4ProductVerticalDouble;
  const targetPrinter = printerName.trim() || 'desejada';
  const duplicateProductsPerSheet = Boolean(options?.duplicateProductsPerSheet && isA4Product);
  const previewTitle = options?.previewTitle?.trim() || (outputMode === 'pdf' ? 'Gerar PDF das etiquetas' : 'Previa de etiquetas');
  const documentTitle = options?.documentTitle?.trim() || previewTitle;
  const primaryButtonLabel = options?.primaryButtonLabel?.trim() || (outputMode === 'pdf' ? 'Salvar como PDF' : 'Imprimir agora');
  if (!produtos.length) throw new Error('Selecione pelo menos um produto.');

  const labelItems = produtos.flatMap((produto) => {
    const selectedBarcode = isClosedBox ? produto.codigoBarrasCaixaFechada : produto.codigoBarras;
    const barcode = analyzeBarcode(selectedBarcode);
    if (!barcode.isValid || barcode.type === 'UNSUPPORTED') {
      throw new Error(`${produto.nome}: ${barcode.reason || 'codigo de barras invalido.'}`);
    }

    const barcodeSvg = buildBarcodeSvg(
      barcode.normalizedValue,
      barcode.type,
      isBrowserA4Product
        ? {
            displayValue: false,
            height: isA4ProductVerticalDouble ? 42 : 50,
            width: isA4ProductVerticalDouble ? (barcode.type === 'CODE128' ? 1.7 : 1.9) : (barcode.type === 'CODE128' ? 2.1 : 2.4),
            textMargin: 0,
          }
        : undefined,
    );

    const variant = isA4Product
      ? 'a4-horizontal'
      : isA4ProductVertical
        ? 'a4-vertical'
        : isA4ProductVerticalDouble
          ? 'a4-vertical-double'
          : 'small';

    const labelMarkup = buildProductLabelMarkup(
      produto,
      barcodeSvg,
      barcode.normalizedValue,
      variant,
      isClosedBox,
    );

    return duplicateProductsPerSheet ? [labelMarkup, labelMarkup] : [labelMarkup];
  });

  const total = labelItems.length;
  const labelsHtml = labelItems.join('');
  const labelsPerSheet = isA4Product ? 2 : isA4ProductVertical ? 1 : isA4ProductVerticalDouble ? 2 : labelItems.length;
  const totalSheets = isBrowserA4Product ? Math.ceil(labelItems.length / labelsPerSheet) : 1;
  const sheetsHtml = isBrowserA4Product
    ? Array.from({ length: totalSheets }, (_, pageIndex) => {
        const labels = labelItems.slice(pageIndex * labelsPerSheet, (pageIndex * labelsPerSheet) + labelsPerSheet).join('');
        const isLastPage = pageIndex === totalSheets - 1;
        return `<section class="sheet${isLastPage ? ' last-sheet' : ''}">${labels}</section>`;
      }).join('')
    : `<section class="sheet last-sheet">${labelsHtml}</section>`;

  const popup = window.open('', '_blank', 'width=1200,height=900');
  if (!popup) {
    throw new Error('Nao foi possivel abrir a janela de impressao do navegador.');
  }

  popup.document.open();
  popup.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          @page {
            size: A4 ${isLandscapeA4 ? 'landscape' : isBrowserA4Product ? 'portrait' : 'landscape'};
            margin: ${isBrowserA4Product ? '0' : '10mm'};
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #e5e7eb;
          }

          .page {
            max-width: 1120px;
            margin: 0 auto;
            padding: 24px;
          }

          .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 16px 18px;
            margin-bottom: 20px;
            border-radius: 16px;
            background: #0f172a;
            color: #ffffff;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.22);
          }

          .toolbar-title {
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 6px;
          }

          .toolbar-text {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.82);
            margin: 0;
          }

          .toolbar-actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
          }

          .btn {
            border: 0;
            border-radius: 12px;
            padding: 12px 18px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-primary {
            background: #22c55e;
            color: #052e16;
          }

          .btn-secondary {
            background: rgba(255, 255, 255, 0.12);
            color: #ffffff;
          }

          .sheet {
            display: grid;
            grid-template-columns: ${isA4Product ? '180mm' : isA4ProductVertical ? '150mm' : isA4ProductVerticalDouble ? 'repeat(2, 125mm)' : isClosedBox ? 'repeat(2, 100mm)' : 'repeat(3, 66mm)'};
            grid-template-rows: ${isA4Product ? 'repeat(2, 110mm)' : isA4ProductVertical ? '210mm' : isA4ProductVerticalDouble ? '180mm' : 'none'};
            gap: ${isA4Product ? '40mm 0' : isA4ProductVertical ? '0' : isA4ProductVerticalDouble ? '20mm' : '4mm'};
            justify-content: center;
            align-content: ${isA4ProductVertical || isA4ProductVerticalDouble ? 'center' : 'start'};
            width: ${isLandscapeA4 ? '297mm' : isBrowserA4Product ? '210mm' : 'auto'};
            min-height: ${isLandscapeA4 ? '210mm' : isBrowserA4Product ? '297mm' : 'auto'};
            padding: ${isA4Product ? '18.5mm 15mm' : isA4ProductVertical ? '43.5mm 30mm' : isA4ProductVerticalDouble ? '15mm' : '10mm'};
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
          }

          .label {
            width: ${isA4Product ? '180mm' : isA4ProductVertical ? '150mm' : isA4ProductVerticalDouble ? '125mm' : isClosedBox ? '100mm' : '66mm'};
            height: ${isA4Product ? '110mm' : isA4ProductVertical ? '210mm' : isA4ProductVerticalDouble ? '180mm' : isClosedBox ? '60mm' : '44mm'};
            border: 1px solid #94a3b8;
            padding: ${isBrowserA4Product ? '0' : '3mm'};
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            background: #ffffff;
          }

          .title {
            font-size: 11px;
            font-weight: 700;
            text-align: center;
            line-height: 1.2;
          }

          .brand,
          .adm,
          .box-info {
            font-size: 10px;
            text-align: center;
          }

          .brand {
            color: #4b5563;
            margin-top: 2mm;
          }

          .box-info {
            margin-top: 2mm;
            font-size: ${isClosedBox ? '14px' : '10px'};
            font-weight: 800;
          }

          .barcode {
            display: flex;
            justify-content: center;
            margin: 2mm 0;
          }

          .barcode svg {
            width: 100%;
            max-width: 54mm;
            height: auto;
          }

          .label-a4 {
            border: 0.6mm solid #172033;
            border-radius: 3mm;
            overflow: hidden;
            display: grid;
            grid-template-rows: 74mm 36mm;
            font-family: "Arial Narrow", "Roboto Condensed", Arial, sans-serif;
          }

          .product-details {
            display: grid;
            grid-template-columns: 56mm 1fr;
            min-height: 0;
          }

          .product-image {
            position: relative;
            display: grid;
            place-items: center;
            padding: 5mm;
            border-right: 0.6mm solid #172033;
            overflow: hidden;
          }

          .product-image img {
            position: absolute;
            inset: 4mm;
            width: calc(100% - 8mm);
            height: calc(100% - 8mm);
            object-fit: contain;
            background: #ffffff;
          }

          .image-placeholder {
            color: #94a3b8;
            font-size: 12pt;
            font-weight: 800;
          }

          .product-copy {
            display: grid;
            grid-template-rows: 19mm 25mm 30mm;
            min-width: 0;
          }

          .adm-large,
          .identity,
          .description {
            padding: 1.2mm 3mm;
            overflow: hidden;
          }

          .adm-large,
          .identity {
            border-bottom: 0.6mm solid #172033;
          }

          .adm-large {
            display: flex;
            align-items: center;
            color: #07559b;
            font-size: 27pt;
            line-height: 1;
            font-weight: 950;
            white-space: nowrap;
          }

          .identity {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 0.6mm;
          }

          .meta-line {
            font-size: 18pt;
            line-height: 1.05;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .description {
            font-size: 18pt;
            line-height: 1.12;
          }

          .barcode-large {
            margin: 0;
            padding: 1mm 36mm 0.5mm;
            border-top: 0.6mm solid #172033;
            align-items: center;
            justify-content: center;
            flex-direction: column;
          }

          .barcode-large svg {
            width: 100%;
            max-width: 100mm;
            max-height: 16mm;
          }

          .label-a4-vertical,
          .label-a4-vertical-double {
            border: 0.6mm solid #172033;
            border-radius: 3mm;
            overflow: hidden;
            display: grid;
            font-family: "Arial Narrow", "Roboto Condensed", Arial, sans-serif;
          }

          .label-a4-vertical {
            grid-template-rows: 100mm 75mm 35mm;
          }

          .label-a4-vertical-double {
            grid-template-rows: 82mm 67mm 31mm;
          }

          .product-image-vertical,
          .product-image-vertical-double {
            position: relative;
            display: grid;
            place-items: center;
            border-right: 0;
            border-bottom: 0.6mm solid #172033;
            overflow: hidden;
          }

          .product-image-vertical {
            padding: 6mm;
          }

          .product-image-vertical-double {
            padding: 5mm;
          }

          .product-image-vertical img,
          .product-image-vertical-double img {
            position: absolute;
            object-fit: contain;
            background: #ffffff;
          }

          .product-image-vertical img {
            inset: 5mm;
            width: calc(100% - 10mm);
            height: calc(100% - 10mm);
          }

          .product-image-vertical-double img {
            inset: 3.5mm;
            width: calc(100% - 7mm);
            height: calc(100% - 7mm);
          }

          .product-copy-vertical,
          .product-copy-vertical-double {
            display: grid;
            min-width: 0;
          }

          .product-copy-vertical {
            grid-template-rows: 18mm 24mm 1fr;
          }

          .product-copy-vertical-double {
            grid-template-rows: 16mm 21mm 1fr;
          }

          .adm-large-vertical,
          .identity-vertical,
          .description-vertical,
          .adm-large-vertical-double,
          .identity-vertical-double,
          .description-vertical-double {
            overflow: hidden;
          }

          .adm-large-vertical,
          .identity-vertical,
          .adm-large-vertical-double,
          .identity-vertical-double {
            border-bottom: 0.6mm solid #172033;
          }

          .adm-large-vertical,
          .identity-vertical,
          .description-vertical {
            padding: 1.5mm 4mm;
          }

          .adm-large-vertical-double,
          .identity-vertical-double,
          .description-vertical-double {
            padding: 1.4mm 3.6mm;
          }

          .adm-large-vertical {
            font-size: 24pt;
          }

          .adm-large-vertical-double {
            font-size: 20pt;
          }

          .identity-vertical {
            gap: 0.8mm;
          }

          .identity-vertical-double {
            gap: 0.55mm;
          }

          .meta-line-vertical {
            font-size: 16pt;
            line-height: 1.08;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .meta-line-vertical-double {
            font-size: 13pt;
            line-height: 1.08;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .description-vertical {
            font-size: 18pt;
            line-height: 1.12;
            padding-top: 2mm;
          }

          .description-vertical-double {
            font-size: 14pt;
            line-height: 1.12;
            padding-top: 1.6mm;
          }

          .barcode-large-vertical {
            padding: 1.5mm 18mm 1mm;
          }

          .barcode-large-vertical-double {
            padding: 1.2mm 14mm 0.9mm;
          }

          .barcode-large-vertical svg {
            max-width: 112mm;
            max-height: 16mm;
          }

          .barcode-large-vertical-double svg {
            max-width: 104mm;
            max-height: 15mm;
          }

          .barcode-number {
            margin-top: 1mm;
            font-family: Arial, sans-serif;
            font-size: 20pt;
            font-weight: 700;
            line-height: 1;
            letter-spacing: 0;
            white-space: nowrap;
            text-align: center;
          }

          .barcode-number-double {
            font-size: 18pt;
          }

          .summary {
            margin: 14px 0 0;
            font-size: 13px;
            color: #475569;
            text-align: center;
          }

          @media print {
            body {
              background: #ffffff;
            }

            .page {
              max-width: none;
              padding: 0;
            }

            .toolbar {
              display: none;
            }

            .sheet {
              padding: ${isA4Product ? '18.5mm 15mm' : isA4ProductVertical ? '43.5mm 30mm' : isA4ProductVerticalDouble ? '15mm' : '0'};
              border-radius: 0;
              box-shadow: none;
            }

            .sheet:not(.last-sheet) {
              break-after: page;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="toolbar">
            <div>
              <p class="toolbar-title">${escapeHtml(previewTitle)}</p>
              <p class="toolbar-text">${outputMode === 'pdf'
                ? 'Este e o mesmo arquivo usado na impressao. Clique abaixo e escolha Salvar como PDF, com escala 100%.'
                : `Confira o layout abaixo. Quando estiver certo, clique em imprimir e escolha a impressora ${escapeHtml(targetPrinter)}.`}</p>
            </div>
            <div class="toolbar-actions">
              <button class="btn btn-primary" onclick="window.print()">${escapeHtml(primaryButtonLabel)}</button>
              <button class="btn btn-secondary" onclick="window.close()">Fechar</button>
            </div>
          </section>
          ${sheetsHtml}
          <p class="summary">${total} etiqueta${total > 1 ? 's' : ''} pronta${total > 1 ? 's' : ''} para impressao.</p>
        </main>
        <script>
          window.onload = function() {
            window.focus();
          };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();

  window.setTimeout(() => popup.focus(), 100);
}

export function printLabelsInBrowser(
  produto: ProdutoEtiqueta,
  quantidade: number,
  printerName: string,
  labelType: LabelType = 'UNITARIA',
  outputMode: 'print' | 'pdf' = 'print',
) {
  const total = Math.max(1, Math.floor(quantidade));
  printProductLabelsInBrowser(Array.from({ length: total }, () => produto), printerName, labelType, outputMode);
}

/**
 * Abre a janela de impressao do navegador com as etiquetas de transporte.
 * Uma etiqueta por volume, cada uma com codigo de barras (CODE128) do
 * codigoVolume gerado para a conferencia dos volumes.
 */
export function printTransportLabelsInBrowser(
  lote: {
    numeroPedido: string;
    numeroNota: string;
    cliente: string;
    cnpj?: string | null;
    transportadora: string;
  },
  volumes: { codigoVolume: string; indiceVolume: number; totalVolumes: number }[],
  printerName: string,
) {
  if (typeof window === 'undefined') return;
  if (volumes.length === 0) {
    throw new Error('Nenhum volume para imprimir.');
  }

  const popup = window.open('', '_blank', 'width=1200,height=900');
  if (!popup) {
    throw new Error('Nao foi possivel abrir a janela de impressao do navegador.');
  }

  const labelsHtml = volumes.map((volume) => {
    const barcodeSvg = buildBarcodeSvg(volume.codigoVolume, 'CODE128', {
      displayValue: false,
      height: 50,
      width: 1.7,
    });
    const data = new Date().toLocaleDateString('pt-BR');
    const transportadora =
      lote.transportadora && lote.transportadora !== 'RETIRA_CLIENTE'
        ? formatarNomeTransportadora(lote.transportadora)
        : '';

    return `
      <article class="label">
        <div class="header">
          <div class="tag">PEDIDO</div>
          <div class="brand">ESPLENDOR</div>
          <div class="meta">${data}</div>
        </div>
        <div class="pedido">${escapeHtml(lote.numeroPedido)}</div>
        <div class="qr-placeholder"><span>QR</span><span>PED</span></div>
        <div class="barcode">${barcodeSvg}</div>
        <div class="row">
          <span class="transportadora">${escapeHtml(transportadora)}</span>
          <span class="volume">${volume.indiceVolume}/${volume.totalVolumes}</span>
        </div>
        <div class="footer">
          ${lote.numeroNota ? `<div class="nota">NF: ${escapeHtml(lote.numeroNota)}</div>` : ''}
          <div class="cliente">${escapeHtml(lote.cliente || 'Sem cliente')}</div>
          ${lote.cnpj ? `<div class="cnpj">CNPJ: ${escapeHtml(lote.cnpj)}</div>` : ''}
        </div>
      </article>
    `;
  }).join('');

  popup.document.open();
  popup.document.write(`

    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Previa de etiquetas de transporte</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 8mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            color: #111827;
            background: #e5e7eb;
          }

          .page {
            max-width: 1120px;
            margin: 0 auto;
            padding: 24px;
          }

          .toolbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            padding: 16px 18px;
            margin-bottom: 20px;
            border-radius: 16px;
            background: #0f172a;
            color: #ffffff;
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.22);
          }

          .toolbar-title {
            font-size: 18px;
            font-weight: 800;
            margin: 0;
          }

          .toolbar-text {
            font-size: 13px;
            margin: 4px 0 0;
            color: #cbd5e1;
          }

          .toolbar-actions {
            display: flex;
            gap: 10px;
          }

          .btn {
            border: 0;
            border-radius: 10px;
            padding: 10px 16px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
          }

          .btn-primary {
            background: #2563eb;
            color: #ffffff;
          }

          .btn-secondary {
            background: #1e293b;
            color: #ffffff;
          }

          .sheet {
            display: grid;
            grid-template-columns: repeat(2, 100mm);
            gap: 4mm;
            justify-content: center;
            padding: 10mm;
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
          }

          .label {
            width: 100mm;
            height: 60mm;
            border: 1px solid #94a3b8;
            padding: 3mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            background: #ffffff;
            position: relative;
            overflow: hidden;
          }

          .header {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 8px;
          }

          .tag {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #000000;
          }

          .brand {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 0.4px;
            justify-self: center;
          }

          .pedido {
            font-size: 36px;
            font-weight: 900;
            text-align: center;
            line-height: 1;
            margin: 1.5mm 0 1mm;
          }

          .barcode {
            display: flex;
            justify-content: center;
            min-height: 16mm;
            padding-right: 14mm;
          }

          .qr-placeholder {
            position: absolute;
            top: 10mm;
            right: 4mm;
            width: 12mm;
            height: 12mm;
            border: 1px solid #111827;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 7px;
            font-weight: 900;
            line-height: 1;
            letter-spacing: 0.4px;
          }

          .barcode svg {
            width: 100%;
            max-width: 84mm;
            height: auto;
          }

          .nota {
            font-size: 10px;
            font-weight: 800;
            line-height: 1.15;
            color: #111827;
          }

          .cliente {
            font-size: 11px;
            font-weight: 700;
            line-height: 1.2;
            text-transform: uppercase;
            max-width: 72mm;
          }

          .cnpj {
            font-size: 9.5px;
            font-weight: 700;
            line-height: 1.2;
            color: #000000;
          }

          .row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
          }

          .volume {
            font-size: 26px;
            font-weight: 900;
          }

          .meta {
            font-size: 10px;
            color: #000000;
          }

          .transportadora {
            font-size: 14px;
            font-weight: 900;
            max-width: 55mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            text-transform: uppercase;
          }

          .footer {
            display: flex;
            flex-direction: column;
            gap: 2px;
            position: relative;
            min-height: 20mm;
          }

          .summary {
            margin: 14px 0 0;
            font-size: 13px;
            color: #475569;
            text-align: center;
          }

          @media print {
            body {
              background: #ffffff;
            }

            .page {
              max-width: none;
              padding: 0;
            }

            .toolbar {
              display: none;
            }

            .sheet {
              padding: 0;
              border-radius: 0;
              box-shadow: none;
            }
          }
        </style>
      </head>
      <body>
        <main class="page">
          <section class="toolbar">
            <div>
              <p class="toolbar-title">Previa das etiquetas de transporte</p>
              <p class="toolbar-text">Pedido ${escapeHtml(lote.numeroPedido)} - ${volumes.length} volume(s). Confira e clique em imprimir, escolhendo a impressora ${escapeHtml(printerName)}.</p>
            </div>
            <div class="toolbar-actions">
              <button class="btn btn-primary" onclick="window.print()">Imprimir agora</button>
              <button class="btn btn-secondary" onclick="window.close()">Fechar</button>
            </div>
          </section>
          <section class="sheet">${labelsHtml}</section>
          <p class="summary">${volumes.length} etiqueta${volumes.length > 1 ? 's' : ''} pronta${volumes.length > 1 ? 's' : ''} para impressao.</p>
        </main>
        <script>
          window.onload = function() {
            window.focus();
          };
        </script>
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();

  window.setTimeout(() => popup.focus(), 100);
}
