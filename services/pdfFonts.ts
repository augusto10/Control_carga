// Fonte padrão para pdfmake no Node.js
// Você pode customizar depois se quiser outras fontes
// Configuração de fontes para o PdfPrinter (pdfmake no Node.js)
// Como não temos os arquivos .ttf no projeto, utilizamos as fontes padrão embutidas do PDFKit.
// Essas fontes estão sempre disponíveis (Helvetica, Times, Courier) e eliminam erros de file not found.

const fonts = {
  Helvetica: {
    normal: 'Helvetica',
    bold: 'Helvetica-Bold',
    italics: 'Helvetica-Oblique',
    bolditalics: 'Helvetica-BoldOblique',
  },
};

export default fonts;
