import JsBarcode from 'jsbarcode';
import type { PDFFont, PDFPage } from 'pdf-lib';
import type { ProdutoEtiqueta } from '@/types/labels';
import { analyzeBarcode } from '@/lib/barcode-validation';
import { formatProductAdm } from '@/lib/product-label';

const MM = 72 / 25.4;
const A4_WIDTH = 210 * MM;
const A4_HEIGHT = 297 * MM;
const LABEL_WIDTH = 180 * MM;
const LABEL_HEIGHT = 110 * MM;
const LABEL_X = 15 * MM;
// Two 110 mm labels with a 40 mm gap, centered vertically on an A4 sheet.
const LABEL_Y = [168.5 * MM, 18.5 * MM];

export function getProductLabelPdfPageCount(quantidade: number) {
  return Math.ceil(Math.max(1, Math.floor(quantidade)) / 2);
}

function fitFontSize(font: PDFFont, text: string, maxWidth: number, preferred: number, minimum: number) {
  let size = preferred;
  while (size > minimum && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5;
  return size;
}

function wrapText(font: PDFFont, text: string, maxWidth: number, fontSize: number, maxLines: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
      if (lines.length === maxLines - 1) break;
    }
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.join(' ').length < text.trim().length && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && font.widthOfTextAtSize(`${last}...`, fontSize) > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last.trim()}...`;
  }
  return lines;
}

async function canvasToPngBytes(canvas: HTMLCanvasElement) {
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Falha ao gerar imagem para o PDF')), 'image/png');
  });
  return new Uint8Array(await blob.arrayBuffer());
}

async function buildBarcodePng(value: string, format: 'EAN13' | 'EAN8' | 'CODE128') {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format,
    displayValue: false,
    fontOptions: 'bold',
    fontSize: 26,
    height: 105,
    margin: 8,
    width: format === 'CODE128' ? 2.4 : 3,
    background: '#ffffff',
    lineColor: '#000000',
    textMargin: 8,
  });
  return canvasToPngBytes(canvas);
}

async function loadProductImagePng(url: string | null) {
  if (!url) return null;

  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    const bitmap = await createImageBitmap(await response.blob());
    const maxDimension = 700;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvasToPngBytes(canvas);
  } catch {
    return null;
  }
}

async function createProductLabelsPdfBlob(produto: ProdutoEtiqueta, quantidade: number) {
  const total = Math.max(1, Math.floor(quantidade));
  const barcode = analyzeBarcode(produto.codigoBarras);
  if (!barcode.isValid || barcode.type === 'UNSUPPORTED') {
    throw new Error(barcode.reason || 'Codigo de barras invalido.');
  }

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const barcodeImage = await pdf.embedPng(await buildBarcodePng(barcode.normalizedValue, barcode.type));
  const productImageBytes = await loadProductImagePng(produto.imagemUrl);
  const productImage = productImageBytes ? await pdf.embedPng(productImageBytes) : null;
  const dark = rgb(0.07, 0.1, 0.16);
  const blue = rgb(0.03, 0.33, 0.61);
  const muted = rgb(0.58, 0.64, 0.72);
  const border = 0.6 * MM;

  function drawLabel(page: PDFPage, x: number, y: number) {
    const detailsBottom = y + (36 * MM);
    const imageRight = x + (56 * MM);
    const rightX = imageRight;
    const rightWidth = LABEL_WIDTH - (56 * MM);
    const top = y + LABEL_HEIGHT;

    page.drawRectangle({ x, y, width: LABEL_WIDTH, height: LABEL_HEIGHT, borderColor: dark, borderWidth: border });
    page.drawLine({ start: { x, y: detailsBottom }, end: { x: x + LABEL_WIDTH, y: detailsBottom }, color: dark, thickness: border });
    page.drawLine({ start: { x: imageRight, y: detailsBottom }, end: { x: imageRight, y: top }, color: dark, thickness: border });
    page.drawLine({ start: { x: rightX, y: top - (21 * MM) }, end: { x: x + LABEL_WIDTH, y: top - (21 * MM) }, color: dark, thickness: border });
    page.drawLine({ start: { x: rightX, y: top - (49 * MM) }, end: { x: x + LABEL_WIDTH, y: top - (49 * MM) }, color: dark, thickness: border });

    if (productImage) {
      const boxX = x + (4 * MM);
      const boxY = detailsBottom + (4 * MM);
      const boxWidth = (48 * MM);
      const boxHeight = (66 * MM);
      const scale = Math.min(boxWidth / productImage.width, boxHeight / productImage.height);
      const width = productImage.width * scale;
      const height = productImage.height * scale;
      page.drawImage(productImage, { x: boxX + ((boxWidth - width) / 2), y: boxY + ((boxHeight - height) / 2), width, height });
    } else {
      const text = 'SEM FOTO';
      const size = 10;
      page.drawText(text, {
        x: x + ((56 * MM) - bold.widthOfTextAtSize(text, size)) / 2,
        y: detailsBottom + (37 * MM),
        size,
        font: bold,
        color: muted,
      });
    }

    const padding = 3 * MM;
    const textX = rightX + padding;
    const textWidth = rightWidth - (padding * 2);
    const adm = `CODIGO ADM.: ${formatProductAdm(produto.codigoAdm)}`;
    const admSize = fitFontSize(bold, adm, textWidth, 27, 15);
    page.drawText(adm, { x: textX, y: top - (14.5 * MM), size: admSize, font: bold, color: blue });

    const lineFontSize = 14;
    const brandLabel = 'MARCA:';
    const brandY = top - (29 * MM);
    page.drawText(brandLabel, { x: textX, y: brandY, size: lineFontSize, font: bold, color: dark });
    const brandX = textX + bold.widthOfTextAtSize(`${brandLabel} `, lineFontSize);
    const brandValue = (produto.marca || 'SEM MARCA').toUpperCase();
    const brandSize = fitFontSize(regular, brandValue, (textX + textWidth) - brandX, lineFontSize, 9);
    page.drawText(brandValue, { x: brandX, y: brandY, size: brandSize, font: regular, color: dark });

    const originalLabel = 'CODIGO ORIGINAL:';
    const originalY = top - (36 * MM);
    const originalSize = lineFontSize;
    page.drawText(originalLabel, { x: textX, y: originalY, size: originalSize, font: bold, color: dark });
    const originalX = textX + bold.widthOfTextAtSize(`${originalLabel} `, originalSize);
    const original = produto.codigoOriginal || '-';
    const originalValueSize = fitFontSize(regular, original, (textX + textWidth) - originalX, originalSize, 8);
    page.drawText(original, { x: originalX, y: originalY, size: originalValueSize, font: regular, color: dark });

    const descriptionLabel = 'DESCRICAO:';
    const descriptionSize = lineFontSize;
    const descriptionY = top - (57 * MM);
    page.drawText(descriptionLabel, { x: textX, y: descriptionY, size: descriptionSize, font: bold, color: dark });
    const descriptionLines = wrapText(regular, produto.nome, textWidth, descriptionSize, 2);
    descriptionLines.forEach((line, index) => {
      page.drawText(line, {
        x: textX,
        y: descriptionY - 12.5 - (index * 12.5),
        size: descriptionSize,
        font: regular,
        color: dark,
      });
    });

    const barcodeMaxWidth = 100 * MM;
    const barcodeMaxHeight = 20 * MM;
    const barcodeScale = Math.min(barcodeMaxWidth / barcodeImage.width, barcodeMaxHeight / barcodeImage.height);
    const barcodeWidth = barcodeImage.width * barcodeScale;
    const barcodeHeight = barcodeImage.height * barcodeScale;
    page.drawImage(barcodeImage, {
      x: x + ((LABEL_WIDTH - barcodeWidth) / 2),
      y: y + (9 * MM),
      width: barcodeWidth,
      height: barcodeHeight,
    });
    const barcodeNumberSize = 14;
    const barcodeNumber = barcode.normalizedValue;
    page.drawText(barcodeNumber, {
      x: x + ((LABEL_WIDTH - regular.widthOfTextAtSize(barcodeNumber, barcodeNumberSize)) / 2),
      y: y + (3.5 * MM),
      size: barcodeNumberSize,
      font: bold,
      color: dark,
    });
  }

  for (let index = 0; index < total; index += 1) {
    if (index % 2 === 0) pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    const page = pdf.getPages()[pdf.getPageCount() - 1];
    drawLabel(page, LABEL_X, LABEL_Y[index % 2]);
  }

  const bytes = await pdf.save();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
}

async function createMultiProductLabelsPdfBlob(produtos: ProdutoEtiqueta[]) {
  if (!produtos.length) throw new Error('Selecione pelo menos um produto.');

  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.07, 0.1, 0.16);
  const blue = rgb(0.03, 0.33, 0.61);
  const muted = rgb(0.58, 0.64, 0.72);
  const border = 0.6 * MM;

  for (const produto of produtos) {
    const barcode = analyzeBarcode(produto.codigoBarras);
    if (!barcode.isValid || barcode.type === 'UNSUPPORTED') {
      throw new Error(`${produto.nome}: ${barcode.reason || 'Codigo de barras invalido.'}`);
    }

    const barcodeImage = await pdf.embedPng(await buildBarcodePng(barcode.normalizedValue, barcode.type));
    const productImageBytes = await loadProductImagePng(produto.imagemUrl);
    const productImage = productImageBytes ? await pdf.embedPng(productImageBytes) : null;
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);

    function drawLabel(y: number) {
      const x = LABEL_X;
      const detailsBottom = y + (36 * MM);
      const imageRight = x + (56 * MM);
      const rightX = imageRight;
      const rightWidth = LABEL_WIDTH - (56 * MM);
      const top = y + LABEL_HEIGHT;

      page.drawRectangle({ x, y, width: LABEL_WIDTH, height: LABEL_HEIGHT, borderColor: dark, borderWidth: border });
      page.drawLine({ start: { x, y: detailsBottom }, end: { x: x + LABEL_WIDTH, y: detailsBottom }, color: dark, thickness: border });
      page.drawLine({ start: { x: imageRight, y: detailsBottom }, end: { x: imageRight, y: top }, color: dark, thickness: border });
      page.drawLine({ start: { x: rightX, y: top - (21 * MM) }, end: { x: x + LABEL_WIDTH, y: top - (21 * MM) }, color: dark, thickness: border });
      page.drawLine({ start: { x: rightX, y: top - (49 * MM) }, end: { x: x + LABEL_WIDTH, y: top - (49 * MM) }, color: dark, thickness: border });

      if (productImage) {
        const boxX = x + (4 * MM);
        const boxY = detailsBottom + (4 * MM);
        const boxWidth = 48 * MM;
        const boxHeight = 66 * MM;
        const scale = Math.min(boxWidth / productImage.width, boxHeight / productImage.height);
        const width = productImage.width * scale;
        const height = productImage.height * scale;
        page.drawImage(productImage, { x: boxX + ((boxWidth - width) / 2), y: boxY + ((boxHeight - height) / 2), width, height });
      } else {
        const text = 'SEM FOTO';
        const size = 10;
        page.drawText(text, {
          x: x + ((56 * MM) - bold.widthOfTextAtSize(text, size)) / 2,
          y: detailsBottom + (37 * MM),
          size,
          font: bold,
          color: muted,
        });
      }

      const padding = 3 * MM;
      const textX = rightX + padding;
      const textWidth = rightWidth - (padding * 2);
      const adm = `CODIGO ADM.: ${formatProductAdm(produto.codigoAdm)}`;
      const admSize = fitFontSize(bold, adm, textWidth, 27, 15);
      page.drawText(adm, { x: textX, y: top - (14.5 * MM), size: admSize, font: bold, color: blue });

      const lineFontSize = 14;
      const brandLabel = 'MARCA:';
      const brandY = top - (29 * MM);
      page.drawText(brandLabel, { x: textX, y: brandY, size: lineFontSize, font: bold, color: dark });
      const brandX = textX + bold.widthOfTextAtSize(`${brandLabel} `, lineFontSize);
      const brandValue = (produto.marca || 'SEM MARCA').toUpperCase();
      const brandSize = fitFontSize(regular, brandValue, (textX + textWidth) - brandX, lineFontSize, 9);
      page.drawText(brandValue, { x: brandX, y: brandY, size: brandSize, font: regular, color: dark });

      const originalLabel = 'CODIGO ORIGINAL:';
      const originalY = top - (36 * MM);
      page.drawText(originalLabel, { x: textX, y: originalY, size: lineFontSize, font: bold, color: dark });
      const originalX = textX + bold.widthOfTextAtSize(`${originalLabel} `, lineFontSize);
      const original = produto.codigoOriginal || '-';
      const originalValueSize = fitFontSize(regular, original, (textX + textWidth) - originalX, lineFontSize, 8);
      page.drawText(original, { x: originalX, y: originalY, size: originalValueSize, font: regular, color: dark });

      const descriptionLabel = 'DESCRICAO:';
      const descriptionY = top - (57 * MM);
      page.drawText(descriptionLabel, { x: textX, y: descriptionY, size: lineFontSize, font: bold, color: dark });
      const descriptionLines = wrapText(regular, produto.nome, textWidth, lineFontSize, 2);
      descriptionLines.forEach((line, index) => {
        page.drawText(line, {
          x: textX,
          y: descriptionY - 12.5 - (index * 12.5),
          size: lineFontSize,
          font: regular,
          color: dark,
        });
      });

      const barcodeMaxWidth = 100 * MM;
      const barcodeMaxHeight = 20 * MM;
      const barcodeScale = Math.min(barcodeMaxWidth / barcodeImage.width, barcodeMaxHeight / barcodeImage.height);
      const barcodeWidth = barcodeImage.width * barcodeScale;
      const barcodeHeight = barcodeImage.height * barcodeScale;
      page.drawImage(barcodeImage, {
        x: x + ((LABEL_WIDTH - barcodeWidth) / 2),
        y: y + (9 * MM),
        width: barcodeWidth,
        height: barcodeHeight,
      });
      page.drawText(barcode.normalizedValue, {
        x: x + ((LABEL_WIDTH - bold.widthOfTextAtSize(barcode.normalizedValue, 14)) / 2),
        y: y + (3.5 * MM),
        size: 14,
        font: bold,
        color: dark,
      });
    }

    drawLabel(LABEL_Y[0]);
    drawLabel(LABEL_Y[1]);
  }

  const bytes = await pdf.save();
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/pdf' });
}

export async function downloadProductLabelsPdf(produto: ProdutoEtiqueta, quantidade: number) {
  const blob = await createProductLabelsPdfBlob(produto, quantidade);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `etiquetas-produto-${produto.codigoAdm}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function openProductLabelsPdfForPrint(produto: ProdutoEtiqueta, quantidade: number) {
  // Open immediately so the browser does not block the tab while the PDF is generated.
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Nao foi possivel abrir a previa de impressao.');

  try {
    popup.document.write('<!doctype html><title>Gerando etiquetas...</title><p>Gerando PDF para impressao...</p>');
    popup.document.close();
    const blob = await createProductLabelsPdfBlob(produto, quantidade);
    const url = URL.createObjectURL(blob);
    popup.location.replace(url);
    window.setTimeout(() => URL.revokeObjectURL(url), 300_000);
  } catch (error) {
    popup.close();
    throw error;
  }
}

function normalizeFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'sem-marca';
}

export async function downloadBrandProductLabelsPdf(produtos: ProdutoEtiqueta[], marca: string) {
  const blob = await createMultiProductLabelsPdfBlob(produtos);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pdf-etiquetas-${normalizeFilePart(marca)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
