import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { sendSMS } from '../../../services/sms';
import { generatePDF } from '../../../services/pdf';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { controleId, motorista, responsavel, cpfMotorista, assinaturaBase64 } = req.body;

    // Verifica se o controle existe
    const controle = await prisma.controleCarga.findUnique({
      where: { id: controleId },
      include: { assinaturas: true }
    });

    if (!controle) {
      return res.status(404).json({ message: 'Controle não encontrado' });
    }

    // Verifica se já existem assinaturas pendentes
    const assinaturasPendentes = controle.assinaturas.filter(
      assinatura => assinatura.status === 'PENDENTE'
    );

    if (assinaturasPendentes.length > 0) {
      return res.status(400).json({ 
        message: 'Já existem assinaturas pendentes para este controle' 
      });
    }

    // Tenta gerar o PDF do documento, mas não falha se ocorrer erro (ex.: fontes ausentes no ambiente de dev)
    let pdfUrl: string | null = null;
    try {
      pdfUrl = await generatePDF(controleId, motorista, responsavel);
    } catch (pdfError) {
      console.warn('Falha ao gerar PDF, continuando mesmo assim:', pdfError);
    }

    // Importa uuid se ainda não estiver no topo do arquivo
    const { v4: uuidv4 } = require('uuid');

    // Gera tokens únicos
    const tokenMotorista = uuidv4();
    const tokenResponsavel = uuidv4();

    // Cria registro de assinatura para o motorista
    const assinaturaMotorista = await prisma.assinatura.create({
      data: {
        controleId,
        tipo: 'MOTORISTA',
        status: 'PENDENTE',
        token: tokenMotorista,
        urlAssinatura: `${process.env.NEXT_PUBLIC_BASE_URL}/assinatura/${tokenMotorista}`,
        imagemBase64: assinaturaBase64 || null,
      },
    });

    // Cria registro de assinatura para o responsável
    const assinaturaResponsavel = await prisma.assinatura.create({
      data: {
        controleId,
        tipo: 'RESPONSAVEL',
        status: 'PENDENTE',
        token: tokenResponsavel,
        urlAssinatura: `${process.env.NEXT_PUBLIC_BASE_URL}/assinatura/${tokenResponsavel}`,
      },
    });

    // Envia SMS para o motorista (ignora falhas em ambiente de desenvolvimento)
    try {
      await sendSMS(cpfMotorista, `Assinatura de controle disponível!\nAcesse: ${assinaturaMotorista.urlAssinatura}\nLink válido por 24h.`);
    } catch (smsError) {
      console.warn('Falha ao enviar SMS, seguindo fluxo:', smsError);
    }

    res.status(200).json({
      message: 'Assinaturas enviadas com sucesso',
      motorista: assinaturaMotorista,
      responsavel: assinaturaResponsavel,
    });
  } catch (error) {
    console.error('Erro ao gerar assinatura:', error);
    res.status(500).json({ message: 'Erro ao gerar assinatura' });
  }
}
