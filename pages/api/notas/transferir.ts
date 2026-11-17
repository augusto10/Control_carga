import { Prisma } from '@prisma/client';
import { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import prisma from '@/lib/prisma';
import {
  NOTA_TRANSFERENCIA_CONFLICT_RESPONSE,
  transferenciaNotasSchema,
} from '@/lib/notas/transferencia-contract';

class NotaIndisponivelError extends Error {}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const parsed = transferenciaNotasSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'invalid_payload',
      details: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }

  const { notaIds, transportadoraDestino } = parsed.data;

  try {
    await prisma.$transaction(async (transaction) => {
      const notas = await transaction.notaFiscal.findMany({
        where: { id: { in: notaIds } },
        select: { id: true, controleId: true },
      });

      if (notas.length !== notaIds.length || notas.some((nota) => nota.controleId !== null)) {
        throw new NotaIndisponivelError('Nota não está disponível');
      }

      const atualizadas = await transaction.notaFiscal.updateMany({
        where: {
          id: { in: notaIds },
          controleId: null,
        },
        data: { transportadoraDestino },
      });

      if (atualizadas.count !== notaIds.length) {
        throw new NotaIndisponivelError('Nota foi vinculada durante a transferência');
      }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return res.status(200).json({
      success: true,
      count: notaIds.length,
      ids: notaIds,
    });
  } catch (error) {
    if (error instanceof NotaIndisponivelError) {
      return res.status(
        NOTA_TRANSFERENCIA_CONFLICT_RESPONSE.status
      ).json(NOTA_TRANSFERENCIA_CONFLICT_RESPONSE.body);
    }

    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2034') {
      return res.status(
        NOTA_TRANSFERENCIA_CONFLICT_RESPONSE.status
      ).json(NOTA_TRANSFERENCIA_CONFLICT_RESPONSE.body);
    }

    console.error('Erro ao transferir notas:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Erro ao transferir notas' });
  }
}

export default withAuth(handler);
