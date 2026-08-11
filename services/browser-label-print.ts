import JsBarcode from 'jsbarcode';
import { analyzeBarcode } from '@/lib/barcode-validation';
import { formatarNomeTransportadora } from '@/lib/etiquetas-transporte';
import { LabelType, ProdutoEtiqueta } from '@/types/labels';

const OFFICIAL_TRANSPORT_LOGO_SRC = '/templates/logo%20oficial.png';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildBarcodeSvg(value: string, format: 'EAN13' | 'EAN8' | 'CODE128') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  JsBarcode(svg, value, {
    format,
    displayValue: true,
    fontOptions: 'bold',
    fontSize: 14,
    height: 44,
    margin: 0,
    width: format === 'CODE128' ? 1.6 : 1.8,
    background: '#ffffff',
    lineColor: '#000000',
    textMargin: 6,
  });

  return svg.outerHTML;
}

export function printLabelsInBrowser(
  produto: ProdutoEtiqueta,
  quantidade: number,
  printerName: string,
  labelType: LabelType = 'UNITARIA',
) {
  if (typeof window === 'undefined') return;

  const isClosedBox = labelType === 'CAIXA_FECHADA';
  const selectedBarcode = isClosedBox ? produto.codigoBarrasCaixaFechada : produto.codigoBarras;
  const barcode = analyzeBarcode(selectedBarcode);
  if (!barcode.isValid || barcode.type === 'UNSUPPORTED') {
    throw new Error(barcode.reason || 'Codigo de barras invalido.');
  }

  // Keep the popup scriptable while its document is being assembled. Some
  // browsers leave a noopener/noreferrer about:blank window when document.write
  // is used immediately after window.open.
  const popup = window.open('', '_blank', 'width=1200,height=900');
  if (!popup) {
    throw new Error('Nao foi possivel abrir a janela de impressao do navegador.');
  }

  const barcodeSvg = buildBarcodeSvg(barcode.normalizedValue, barcode.type);
  const total = Math.max(1, quantidade);
  const labelsHtml = Array.from({ length: total }).map(() => `
    <article class="label">
      <div class="title">${escapeHtml(produto.nome)}</div>
      <div class="brand">${escapeHtml(produto.marca || 'Sem marca')}</div>
      ${isClosedBox ? `<div class="box-info">CAIXA FECHADA - ${produto.quantidadeCaixaFechada || '-'} UN</div>` : ''}
      <div class="barcode">${barcodeSvg}</div>
      <div class="adm">ADM ${escapeHtml(produto.codigoAdm)}</div>
    </article>
  `).join('');

  popup.document.open();
  popup.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Previa de etiquetas</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
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
            grid-template-columns: ${isClosedBox ? 'repeat(2, 100mm)' : 'repeat(3, 66mm)'};
            gap: 4mm;
            justify-content: center;
            padding: 10mm;
            border-radius: 18px;
            background: #ffffff;
            box-shadow: 0 24px 60px rgba(15, 23, 42, 0.12);
          }

          .label {
            width: ${isClosedBox ? '100mm' : '66mm'};
            height: ${isClosedBox ? '60mm' : '44mm'};
            border: 1px solid #94a3b8;
            padding: 3mm;
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
              <p class="toolbar-title">Previa da impressao em outra impressora</p>
              <p class="toolbar-text">Confira o layout abaixo. Quando estiver certo, clique em imprimir e escolha a impressora ${escapeHtml(printerName)}.</p>
            </div>
            <div class="toolbar-actions">
              <button class="btn btn-primary" onclick="window.print()">Imprimir agora</button>
              <button class="btn btn-secondary" onclick="window.close()">Fechar</button>
            </div>
          </section>
          <section class="sheet">${labelsHtml}</section>
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

  // Let the browser paint the preview before the user interacts with it.
  window.setTimeout(() => popup.focus(), 100);
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
    const barcodeSvg = buildBarcodeSvg(volume.codigoVolume, 'CODE128');
    const data = new Date().toLocaleDateString('pt-BR');

    return `
      <article class="label">
        <div class="header">
          <div class="tag">PEDIDO</div>
          <img class="top-logo" src="${OFFICIAL_TRANSPORT_LOGO_SRC}" alt="" />
          <div class="meta">${data}</div>
        </div>
        <div class="pedido">${escapeHtml(lote.numeroPedido)}</div>
        <div class="barcode">${barcodeSvg}</div>
        <div class="row">
          <span class="transportadora">${escapeHtml(formatarNomeTransportadora(lote.transportadora || ''))}</span>
          <span class="volume">${volume.indiceVolume}/${volume.totalVolumes}</span>
        </div>
        <div class="footer">
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

          .top-logo {
            height: 5.4mm;
            width: auto;
            object-fit: contain;
            opacity: 0.75;
            justify-self: center;
          }

          .tag {
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 1px;
            color: #000000;
          }

          .pedido {
            font-size: 32px;
            font-weight: 900;
            text-align: center;
            line-height: 1.1;
          }

          .barcode {
            display: flex;
            justify-content: center;
          }

          .barcode svg {
            width: 100%;
            max-width: 82mm;
            height: auto;
          }

          .cliente {
            font-size: 11px;
            font-weight: 700;
            line-height: 1.2;
            text-transform: uppercase;
            max-width: 68mm;
          }

          .cnpj {
            font-size: 10px;
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
            font-size: 24px;
            font-weight: 900;
          }

          .meta {
            font-size: 10px;
            color: #000000;
          }

          .transportadora {
            font-size: 16px;
            font-weight: 900;
            max-width: 58mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .footer {
            display: flex;
            flex-direction: column;
            gap: 2px;
            position: relative;
            min-height: 18mm;
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
