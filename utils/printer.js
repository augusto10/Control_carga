const { PDFDocument, rgb } = require('pdf-lib');
const printer = require('pdf-to-printer');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * Gera um PDF com a etiqueta de transporte
 * @param {Object} etiqueta Dados da etiqueta
 * @param {string} etiqueta.codigoVolume Código único do volume
 * @param {string} etiqueta.numeroNota Número da nota fiscal
 * @param {string} etiqueta.cliente Nome do cliente
 * @param {string} etiqueta.transportadora Nome da transportadora
 * @param {string} etiqueta.numeroPedido Número do pedido
 * @param {number} etiqueta.indiceVolume Número do volume atual
 * @param {number} etiqueta.totalVolumes Total de volumes
 */
async function gerarPDFEtiqueta(etiqueta) {
  // Criar novo documento PDF
  const doc = await PDFDocument.create();
  const page = doc.addPage([288, 432]); // 4x6 polegadas em pontos (72dpi)
  
  // Configurar fonte
  const font = await doc.embedFont('Helvetica-Bold');
  
  // Funções auxiliares para desenho
  const drawText = (text, x, y, size = 12) => {
    page.drawText(text, {
      x,
      y,
      size,
      font,
      color: rgb(0, 0, 0)
    });
  };
  
  const drawCenteredText = (text, y, size = 12) => {
    const textWidth = font.widthOfTextAtSize(text, size);
    const x = (page.getWidth() - textWidth) / 2;
    drawText(text, x, y, size);
  };
  
  // Desenhar conteúdo
  drawCenteredText('ETIQUETA DE TRANSPORTE', 400, 16);
  drawCenteredText('CASCADE LOGÍSTICA', 375, 14);
  
  // Informações principais
  let y = 330;
  const labels = [
    ['Nota Fiscal:', etiqueta.numeroNota],
    ['Cliente:', etiqueta.cliente],
    ['Transportadora:', etiqueta.transportadora],
    ['Pedido:', etiqueta.numeroPedido],
    [`Volume: ${etiqueta.indiceVolume}/${etiqueta.totalVolumes}`, ''],
    ['Código:', etiqueta.codigoVolume]
  ];
  
  for (const [label, value] of labels) {
    drawText(label, 20, y, 12);
    if (value) {
      drawText(value, 20, y - 20, 14);
    }
    y -= 45;
  }
  
  // Retornar o PDF em buffer
  return await doc.save();
}

/**
 * Lista todas as impressoras instaladas
 * @returns {Promise<string[]>} Lista com os nomes das impressoras
 */
async function listarImpressoras() {
  return await printer.getPrinters();
}

/**
 * Imprime uma etiqueta na impressora especificada
 * @param {Object} etiqueta Dados da etiqueta
 * @param {string} impressora Nome da impressora
 */
async function imprimirEtiqueta(etiqueta, impressora) {
  try {
    // Gerar PDF
    const pdfBytes = await gerarPDFEtiqueta(etiqueta);
    
    // Salvar temporariamente
    const tempFile = path.join(os.tmpdir(), `etiqueta-${etiqueta.codigoVolume}.pdf`);
    await fs.writeFile(tempFile, pdfBytes);
    
    // Configurar opções de impressão
    const options = {
      printer: impressora,
      scale: 'fit',
      silent: true
    };
    
    // Imprimir
    await printer.print(tempFile, options);
    
    // Limpar arquivo temporário
    await fs.unlink(tempFile);
    
    return true;
  } catch (error) {
    console.error('Erro ao imprimir etiqueta:', error);
    throw error;
  }
}

module.exports = {
  gerarPDFEtiqueta,
  listarImpressoras,
  imprimirEtiqueta
};