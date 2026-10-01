import { analyzeBarcode } from '@/lib/barcode-validation';
import { LabelType, ProdutoEtiqueta } from '@/types/labels';

const UNIT_LABEL_WIDTH = 264;
const UNIT_LABEL_HEIGHT = 176;
const PAGE_WIDTH = 800;
const BOX_LABEL_HEIGHT = 480; // 60 mm at 203 dpi
const COL_POSITIONS = [0, 264, 528];
const PRINT_DARKNESS = 25; // Zebra range: 0 (light) to 30 (dark)

export function sanitizeZpl(value: string): string {
  return value.replace(/[\^~]/g, '').replace(/\s+/g, ' ').trim();
}

export function splitText(value: string, maxLineLength: number, maxLines: number): string[] {
  const original = sanitizeZpl(value);
  const tokens = original.split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const token of tokens) {
    const next = current ? `${current} ${token}` : token;
    if (next.length <= maxLineLength) {
      current = next;
      continue;
    }

    if (current) lines.push(current);
    current = token;
    if (lines.length === maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (lines.length === maxLines && lines.join(' ').length < original.length) {
    const last = lines[maxLines - 1];
    lines[maxLines - 1] = last.length >= maxLineLength
      ? `${last.slice(0, maxLineLength - 3)}...`
      : `${last}...`;
  }

  return lines;
}

function centerX(labelStart: number, fieldWidth: number, contentWidth: number) {
  return labelStart + Math.max(0, Math.floor((fieldWidth - contentWidth) / 2));
}

export function buildBarcodeField(
  value: string,
  barcodeType: 'EAN13' | 'EAN8' | 'CODE128',
  x: number,
  y = 86,
  height = 42,
  fieldWidth = UNIT_LABEL_WIDTH,
) {
  const barcodeWidth = fieldWidth >= 700 ? 620 : 200;
  const startX = centerX(x, fieldWidth, barcodeWidth);
  const common = `^FO${startX},${y}`;
  const moduleWidth = fieldWidth >= 700 ? 3 : 2;

  if (barcodeType === 'EAN13') {
    return `${common}^BY${moduleWidth},2,${height}^BEN,${height},Y,N^FD${value}^FS`;
  }

  if (barcodeType === 'EAN8') {
    return `${common}^BY${moduleWidth},2,${height}^B8N,${height},Y,N^FD${value}^FS`;
  }

  return `${common}^BY${moduleWidth},2,${height}^BCN,${height},Y,N,N^FD${value}^FS`;
}

function getBarcode(produto: ProdutoEtiqueta, labelType: LabelType) {
  return labelType === 'CAIXA_FECHADA'
    ? produto.codigoBarrasCaixaFechada
    : produto.codigoBarras;
}

function buildUnitLabel(produto: ProdutoEtiqueta, x: number) {
  const analysis = analyzeBarcode(produto.codigoBarras);
  if (!analysis.isValid || analysis.type === 'UNSUPPORTED') {
    throw new Error(analysis.reason || 'Codigo de barras invalido.');
  }

  const titleLines = splitText(produto.nome, 22, 2);
  const brand = sanitizeZpl(produto.marca || 'SEM MARCA');
  const adm = sanitizeZpl(produto.codigoAdm);
  const commands: string[] = [];

  titleLines.forEach((line, index) => {
    commands.push(`^FO${centerX(x, UNIT_LABEL_WIDTH, 220)},${10 + (index * 20)}^FB220,1,0,C,0^A0N,20,20^FD${line}^FS`);
  });

  commands.push(`^FO${centerX(x, UNIT_LABEL_WIDTH, 210)},50^FB210,1,0,C,0^A0N,18,18^FD${brand}^FS`);
  commands.push(buildBarcodeField(analysis.normalizedValue, analysis.type, x));
  commands.push(`^FO${centerX(x, UNIT_LABEL_WIDTH, 150)},156^A0N,14,14^FDADM ${adm}^FS`);
  return commands;
}

function buildUnitPages(produto: ProdutoEtiqueta, quantidade: number) {
  const pages: string[] = [];

  for (let first = 0; first < quantidade; first += 3) {
    const commands = [
      `~SD${PRINT_DARKNESS}`,
      '^XA',
      `^PW${PAGE_WIDTH}`,
      `^LL${UNIT_LABEL_HEIGHT}`,
      '^LH0,0',
    ];
    const labelsOnPage = Math.min(3, quantidade - first);

    for (let position = 0; position < labelsOnPage; position += 1) {
      commands.push(...buildUnitLabel(produto, COL_POSITIONS[position]));
    }

    commands.push('^PQ1,0,1,Y', '^XZ');
    pages.push(commands.join('\n'));
  }

  return pages;
}

function buildClosedBoxPage(produto: ProdutoEtiqueta) {
  const analysis = analyzeBarcode(produto.codigoBarrasCaixaFechada);
  if (!analysis.isValid || analysis.type === 'UNSUPPORTED') {
    throw new Error(analysis.reason || 'Codigo de barras da caixa fechada invalido.');
  }

  const commands = [
    `~SD${PRINT_DARKNESS}`,
    '^XA',
    `^PW${PAGE_WIDTH}`,
    `^LL${BOX_LABEL_HEIGHT}`,
    '^LH0,0',
  ];
  const titleLines = splitText(produto.nome, 42, 2);

  titleLines.forEach((line, index) => {
    commands.push(`^FO50,${25 + (index * 38)}^FB700,1,0,C,0^A0N,34,34^FD${line}^FS`);
  });
  commands.push(`^FO75,108^FB650,1,0,C,0^A0N,27,27^FD${sanitizeZpl(produto.marca || 'SEM MARCA')}^FS`);
  commands.push(`^FO50,150^FB700,1,0,C,0^A0N,30,30^FDCAIXA FECHADA - ${produto.quantidadeCaixaFechada || '-'} UN^FS`);
  commands.push(buildBarcodeField(analysis.normalizedValue, analysis.type, 0, 205, 120, PAGE_WIDTH));
  commands.push(`^FO50,415^FB700,1,0,C,0^A0N,26,26^FDADM ${sanitizeZpl(produto.codigoAdm)}^FS`);
  commands.push('^PQ1,0,1,Y', '^XZ');
  return commands.join('\n');
}

export function generateZplLabels(
  produto: ProdutoEtiqueta,
  quantidade: number,
  labelType: LabelType = 'UNITARIA',
): string {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new Error('Quantidade de etiquetas invalida.');
  }

  const selectedBarcode = getBarcode(produto, labelType);
  if (!selectedBarcode) {
    throw new Error(labelType === 'CAIXA_FECHADA'
      ? 'Este produto nao possui codigo de barras de caixa fechada.'
      : 'Este produto nao possui codigo de barras cadastrado.');
  }

  if (labelType === 'CAIXA_FECHADA') {
    return Array.from({ length: quantidade }, () => buildClosedBoxPage(produto)).join('\n');
  }

  return buildUnitPages(produto, quantidade).join('\n');
}
