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
 * @param {string} etiqueta.rota Nome da rota (opcional)
 * @param {string} etiqueta.box Número do box (opcional)
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
    ...(etiqueta.rota ? [['Rota:', etiqueta.rota]] : []),
    ...(etiqueta.box ? [['Box:', etiqueta.box]] : []),
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
 * Imprime uma etiqueta diretamente na impressora ZPL (sem download de arquivo)
 * @param {Object} etiqueta Dados da etiqueta
 * @param {string} impressora Nome da impressora
 */
async function imprimirEtiquetaZPL(etiqueta, impressora) {
  try {
    // Gerar ZPL diretamente (sem PDF)
    const zpl = gerarZPLEtiqueta(etiqueta);
    
    // Enviar ZPL diretamente para a impressora
    const { exec } = require('child_process');
    const fs = require('fs').promises;
    
    // Criar arquivo ZPL temporário
    const tempFile = path.join(os.tmpdir(), `etiqueta-${etiqueta.codigoVolume}.zpl`);
    await fs.writeFile(tempFile, zpl, 'utf8');
    
    // Comando para enviar ZPL diretamente para impressora (Windows)
    const command = `copy /b "${tempFile}" "\\\\localhost\\${impressora}"`;
    
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        // Limpar arquivo temporário
        fs.unlink(tempFile).catch(() => {});
        
        if (error) {
          console.error('Erro ao imprimir ZPL:', error);
          reject(error);
        } else {
          console.log('ZPL enviado para impressora:', impressora);
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.error('Erro ao imprimir etiqueta ZPL:', error);
    throw error;
  }
}

/**
 * Gera código ZPL da etiqueta (sem download de arquivo)
 * @param {Object} etiqueta Dados da etiqueta
 * @returns {string} Código ZPL
 */
function gerarZPLEtiqueta(etiqueta) {
  let zpl = '';
  
  // Logo da empresa desenhado diretamente com comandos ZPL
  zpl += '^FO650,20^GB30,30,2^FS\n'; // Quadrado principal
  zpl += '^FO650,20^GB30,15,2^FS\n'; // Linha horizontal superior
  zpl += '^FO650,25^GB15,30,2^FS\n'; // Linha vertical esquerda
  zpl += '^FO650,35^GB30,15,2^FS\n'; // Linha horizontal inferior
  zpl += '^FO665,35^GB15,30,2^FS\n'; // Linha vertical direita
  zpl += '^FO640,60^A0N,12,12^FDESPLENDOR^FS\n'; // Texto do nome
  
  // Início da etiqueta
  zpl += '^XA\n';
  
  // Configurações da etiqueta
  zpl += '^PW812\n'; // Largura da etiqueta
  zpl += '^LL609\n'; // Comprimento da etiqueta
  
  // Número do pedido em destaque
  const numeroPedido = etiqueta.numeroPedido || etiqueta.numeroNota;
  zpl += `^FO50,35^A0N,75,75^FD${numeroPedido}^FS\n`;
  
  // Código de barras
  zpl += `^FO50,125^BCN,80,Y,N,N^FD${etiqueta.codigoVolume}^FS\n`;
  
  // Nome do cliente
  zpl += `^FO50,225^A0N,28,28^FD${etiqueta.cliente.toUpperCase()}^FS\n`;
  
  // Volume
  zpl += `^FO50,265^A0N,35,35^FD${etiqueta.indiceVolume}/${etiqueta.totalVolumes}^FS\n`;
  
  // Transportadora
  if (etiqueta.transportadora !== 'RETIRA_CLIENTE') {
    zpl += `^FO50,305^A0N,25,25^FD${etiqueta.transportadora}^FS\n`;
  }
  
  // Rota e Box (se disponíveis)
  if (etiqueta.rota) {
    zpl += `^FO350,305^A0N,20,20^FDRota: ${etiqueta.rota}^FS\n`;
  }
  if (etiqueta.box) {
    zpl += `^FO350,325^A0N,20,20^FDBox: ${etiqueta.box}^FS\n`;
  }
  
  // Data
  const dataFormatada = new Date().toLocaleDateString('pt-BR');
  zpl += `^FO50,345^A0N,20,20^FD${dataFormatada}^FS\n`;
  
  // Número da NF e Pedido
  const yPosNF = etiqueta.rota || etiqueta.box ? 385 : 345;
  zpl += `^FO350,${yPosNF}^A0N,16,16^FDNF: ${etiqueta.numeroNota}^FS\n`;
  if (etiqueta.numeroPedido && etiqueta.numeroPedido.trim()) {
    zpl += `^FO350,${yPosNF + 20}^A0N,16,16^FDPed: ${etiqueta.numeroPedido}^FS\n`;
  }
  
  // Fim da etiqueta
  zpl += '^XZ\n';
  
  return zpl;
}

module.exports = {
  gerarPDFEtiqueta,
  listarImpressoras,
  imprimirEtiquetaZPL,
  gerarZPLEtiqueta
};