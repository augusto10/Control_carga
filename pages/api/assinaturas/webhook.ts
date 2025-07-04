import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    console.log('[WEBHOOK] Requisição recebida.');
    const { token, assinatura: signedFileUrl } = req.body;

    if (!token || !signedFileUrl) {
      console.error('[WEBHOOK] Erro: Token ou assinatura ausentes no corpo da requisição.', req.body);
      return res.status(400).json({ message: 'Token ou assinatura ausentes' });
    }
    console.log(`[WEBHOOK] Token recebido: ${token}`);

    // Verifica se a assinatura existe pelo token
    console.log(`[WEBHOOK] Buscando assinatura com o token...`);
    const assinatura = await prisma.assinatura.findUnique({
      where: { token }
    });

    if (!assinatura) {
      console.error(`[WEBHOOK] Erro: Assinatura com token ${token} não encontrada.`);
      return res.status(404).json({ message: 'Assinatura não encontrada' });
    }
    console.log(`[WEBHOOK] Assinatura encontrada:`, assinatura);

    if (assinatura.status === 'ASSINADO') {
      console.warn(`[WEBHOOK] Aviso: Assinatura com token ${token} já foi assinada.`);
      return res.status(400).json({ message: 'Esta assinatura já foi assinada' });
    }

    // Atualiza o status da assinatura
    console.log(`[WEBHOOK] Atualizando status da assinatura para ASSINADO...`);
    const updatedAssinatura = await prisma.assinatura.update({
      where: { token },
      data: {
        status: 'ASSINADO',
        signedFileUrl,
      },
    });
    console.log('[WEBHOOK] Assinatura atualizada com sucesso:', updatedAssinatura);

    // Verifica se todas as assinaturas do controle foram concluídas
    const controle = await prisma.controleCarga.findUnique({
      where: { id: assinatura.controleId },
      include: { assinaturas: true }
    });

    if (controle) {
      const todasAssinadas = controle.assinaturas.every(
        assinatura => assinatura.status === 'ASSINADO'
      );

      if (todasAssinadas) {
        // Aqui você pode adicionar lógica para notificar o sistema quando todas as assinaturas foram concluídas
      }
    }

    res.status(200).json({ 
      message: 'Assinatura atualizada com sucesso', 
      assinatura: updatedAssinatura 
    });
  } catch (error: any) {
    console.error('Erro detalhado no webhook de assinatura:', error);
    res.status(500).json({ message: 'Erro ao processar webhook', detail: error.message });
  }
}
