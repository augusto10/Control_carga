import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import PdfPrinter from 'pdfmake';
import fonts from '../../../../services/pdfFonts';

const prisma = new PrismaClient();
const printer = new PdfPrinter(fonts);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ message: 'ID do controle é obrigatório' });
    }

    const controle = await prisma.controleCarga.findUnique({
      where: { id: id },
      include: {
        notas: true,
        assinaturas: true,
      },
    });

    if (!controle) {
      return res.status(404).json({ message: 'Controle não encontrado' });
    }
    
    console.log(`Gerando PDF para controle ${id}. CPF do motorista no banco: ${controle.cpfMotorista}`);




    const docDefinition: any = {
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
              ['Nome', controle.motorista, ''],
              ['CPF', controle.cpfMotorista, ''],
            ],
          },
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
              ['Nome', controle.responsavel, ''],
            ],
          },
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
            widths: ['*', '*', '*'],
            body: [
              ['Tipo', 'Nome', 'Assinatura'],
              ...controle.assinaturas.map(assinatura => {
                const assinaturaContent = assinatura.status === 'ASSINADO' && assinatura.signedFileUrl
                  ? {
                      image: assinatura.signedFileUrl,
                      width: 100,
                      height: 50,
                    }
                  : 'Assinatura Pendente';

                return [
                  assinatura.tipo === 'MOTORISTA' ? 'Motorista' : 'Responsável',
                  assinatura.tipo === 'MOTORISTA' ? controle.motorista : controle.responsavel,
                  assinaturaContent,
                ];
              }),
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
      defaultStyle: {
        font: 'Helvetica'
      }
    };

    // Gera o PDF
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks: Buffer[] = [];
    pdfDoc.on('data', (chunk) => chunks.push(chunk));
    const pdfBuffer: Buffer = await new Promise((resolve, reject) => {
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });

    // Define os headers para download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="controle-${controle.id}-assinado.pdf"`
    );

    // Envia o PDF
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ message: 'Erro ao gerar PDF' });
  }
}
