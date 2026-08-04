import { analyzeBarcode } from '@/lib/barcode-validation';
import { ProdutoEtiqueta } from '@/types/labels';

const LABEL_WIDTH = 264;
const LABEL_HEIGHT = 176;
const PAGE_WIDTH = 800;
const COL_POSITIONS = [0, 264, 528];

function sanitizeZpl(value: string): string {
  return value.replace(/[\^~]/g, '').replace(/\s+/g, ' ').trim();
}

function splitText(value: string, maxLineLength: number, maxLines: number): string[] {
  const tokens = sanitizeZpl(value).split(' ').filter(Boolean);
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

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  if (tokens.length && lines.length === maxLines) {
    const original = sanitizeZpl(value);
    const reconstructed = lines.join(' ');
    if (reconstructed.length < original.length) {
      const last = lines[maxLines - 1];
      lines[maxLines - 1] = last.length > maxLineLength - 1
        ? `${last.slice(0, maxLineLength - 1)}…`
        : `${last}…`;
    }
  }

  return lines;
}

function centerX(labelStart: number, fieldWidth: number, contentWidth: number) {
  return labelStart + Math.max(0, Math.floor((fieldWidth - contentWidth) / 2));
}

function buildBarcodeField(value: string, barcodeType: 'EAN13' | 'EAN8' | 'CODE128', x: number) {
  const barcodeWidth = 200;
  const startX = centerX(x, LABEL_WIDTH, barcodeWidth);
  const common = `^FO${startX},86`;

  if (barcodeType === 'EAN13') {
    return `${common}^BY2,2,42^BEN,42,Y,N^FD${value}^FS`;
  }

  if (barcodeType === 'EAN8') {
    return `${common}^BY2,2,42^B8N,42,Y,N^FD${value}^FS`;
  }

  return `${common}^BY2,2,42^BCN,42,Y,N,N^FD${value}^FS`;
}

function buildSingleLabel(produto: ProdutoEtiqueta, x: number) {
  const analysis = analyzeBarcode(produto.codigoBarras);
  if (!analysis.isValid || analysis.type === 'UNSUPPORTED') {
    throw new Error(analysis.reason || 'Código de barras inválido.');
  }

  const titleLines = splitText(produto.nome, 22, 2);
  const brand = sanitizeZpl(produto.marca || 'SEM MARCA');
  const adm = sanitizeZpl(produto.codigoAdm);
  const commands: string[] = [];

  titleLines.forEach((line, index) => {
    commands.push(`^FO${centerX(x, LABEL_WIDTH, 220)},${10 + (index * 20)}^FB220,1,0,C,0^A0N,20,20^FD${line}^FS`);
  });

  commands.push(`^FO${centerX(x, LABEL_WIDTH, 210)},50^FB210,1,0,C,0^A0N,18,18^FD${brand}^FS`);
  commands.push(buildBarcodeField(analysis.normalizedValue, analysis.type, x));
  commands.push(`^FO${centerX(x, LABEL_WIDTH, 150)},156^A0N,14,14^FDADM ${adm}^FS`);

  return commands.join('\n');
}

export function generateZplLabels(produto: ProdutoEtiqueta, quantidade: number): string {
  if (!Number.isInteger(quantidade) || quantidade <= 0) {
    throw new Error('Quantidade de etiquetas inválida.');
  }

  const rows = Math.ceil(quantidade / 3);
  const lines: string[] = ['^XA', `^PW${PAGE_WIDTH}`, `^LL${LABEL_HEIGHT * rows}`];

  for (let index = 0; index < quantidade; index += 1) {
    const position = index % 3;
    const row = Math.floor(index / 3);
    const yOffset = row * LABEL_HEIGHT;
    const labelCommands = buildSingleLabel(produto, COL_POSITIONS[position])
      .split('\n')
      .map((command) => command.replace(/\^FO(\d+),(\d+)/, (_, x, y) => `^FO${x},${Number(y) + yOffset}`));

    lines.push(...labelCommands);
  }

  lines.push('^XZ');

  return lines.join('\n');
}
