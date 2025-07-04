import { PrismaClient } from '@prisma/client';
import PdfPrinter from 'pdfmake';
import fonts from './pdfFonts';

const prisma = new PrismaClient();
const printer = new PdfPrinter(fonts);

export async function generatePDF(controleId: string, motorista: string, responsavel: string) {
  const controle = await prisma.controleCarga.findUnique({
    where: { id: controleId },
    include: {
      notas: true,
      assinaturas: true,
    },
  });

  if (!controle) {
    throw new Error('Controle não encontrado');
  }

  // Busca a assinatura manual do motorista (se existir)
  const assinaturaMotorista = controle.assinaturas?.find(
    (a: any) => a.tipo === 'MOTORISTA' && a.imagemBase64
  );
  // Busca a assinatura manual do responsável (se existir)
  const assinaturaResponsavel = controle.assinaturas?.find(
    (a: any) => a.tipo === 'RESPONSAVEL' && a.imagemBase64
  );

  const docDefinition = {
    content: [
      {
        text: 'CONTROLE DE CARGA',
        style: 'header',
      },
      {
        text: 'Dados do Controle',
        style: 'subheader',
      },
      {
        style: 'tableExample',
        table: {
          headerRows: 1,
          widths: ['*', '*', '*'],
          body: [
            ['Campo', 'Valor', ''],
            ['Número do Manifesto', controle.numeroManifesto || '-', ''],
            ['Quantidade de Pallets', controle.qtdPallets.toString(), ''],
            ['Observação', controle.observacao || '-', ''],
          ],
        },
      },
      {
        text: 'Dados do Motorista',
        style: 'subheader',
      },
      {
        style: 'tableExample',
        table: {
          headerRows: 1,
          widths: ['*', '*', '*'],
          body: [
            ['Campo', 'Valor', ''],
            ['Nome', motorista, ''],
            ['CPF', controle.cpfMotorista, ''],
          ],
        },
      },
      assinaturaMotorista && assinaturaMotorista.imagemBase64 ? {
        image: assinaturaMotorista.imagemBase64,
        width: 180,
        alignment: 'left',
        margin: [0, 10, 0, 10],
      } : {
        text: 'Assinatura não disponível',
        style: 'smallText',
        margin: [0, 10, 0, 10],
      },
      {
        text: 'Dados do Responsável',
        style: 'subheader',
      },
      {
        style: 'tableExample',
        table: {
          headerRows: 1,
          widths: ['*', '*', '*'],
          body: [
            ['Campo', 'Valor', ''],
            ['Nome', responsavel, ''],
          ],
        },
      },
      assinaturaResponsavel && assinaturaResponsavel.imagemBase64 ? {
        image: assinaturaResponsavel.imagemBase64,
        width: 180,
        alignment: 'left',
        margin: [0, 10, 0, 10],
      } : {
        text: 'Assinatura não disponível',
        style: 'smallText',
        margin: [0, 10, 0, 10],
      },
      {
        text: 'Notas Fiscais',
        style: 'subheader',
      },
      controle.notas.length > 0 ? {
        style: 'tableExample',
        table: {
          headerRows: 1,
          widths: ['*', '*', '*'],
          body: [
            ['Código', 'Número', 'Volumes'],
            ...controle.notas.map(nota => [
              nota.codigo,
              nota.numeroNota,
              nota.volumes,
            ]),
          ],
        },
      } : {
        text: 'Nenhuma nota fiscal associada',
        style: 'smallText',
      },
      {
        text: 'Assinaturas',
        style: 'subheader',
      },
      {
        style: 'tableExample',
        table: {
          headerRows: 1,
          widths: ['*', '*'],
          body: [
            ['Motorista', 'Responsável'],
            ['', ''],
          ],
        },
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        margin: [0, 0, 0, 20],
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
      tableExample: {
        margin: [0, 5, 0, 15],
      },
      smallText: {
        fontSize: 10,
        italics: true,
      },
    },
  };

  // Gera o PDF usando pdfmake para Node.js
  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks: Buffer[] = [];
  pdfDoc.on('data', (chunk) => chunks.push(chunk));
  const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
    pdfDoc.on('error', reject);
    pdfDoc.end();
  });

  // Salva o PDF no S3 ou localmente
  const fileName = `controle-${controleId}.pdf`;
  // TODO: Implementar upload para S3 ou salvar localmente

  return fileName;
}
