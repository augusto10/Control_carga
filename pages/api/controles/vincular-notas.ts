import { Prisma } from '@prisma/client';
import { NextApiResponse } from 'next';
import { z } from 'zod';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';
import { canEditControle } from '@/lib/auth/permissions';
import prisma from '@/lib/prisma';
import {
  CONTROLE_NOTAS_CONFLICT_RESPONSE,
  notasCompativeisComControle,
  vinculoCompleto,
} from '@/lib/controles/nota-control-contract';

const vincularNotasSchema = z.object({
  controleId: z.string().trim().min(1),
  notasIds: z.array(z.string().trim().min(1)).min(1),
}).superRefine(({ notasIds }, context) => {
  if (new Set(notasIds).size !== notasIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['notasIds'],
      message: 'IDs de nota repetidos',
    });
  }
});

class NotaIndisponivelError extends Error {}
class ControleFinalizadoForbiddenError extends Error {}

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const parsed = vincularNotasSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'invalid_payload',
      details: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const controle = await transaction.controleCarga.findUnique({
        where: { id: parsed.data.controleId },
        select: { id: true, transportadora: true, finalizado: true },
      });
      if (!controle) throw new NotaIndisponivelError('Controle não encontrado');
      if (!canEditControle(req.user, controle)) {
        throw new ControleFinalizadoForbiddenError(
          'Somente ADMIN pode editar controle finalizado'
        );
      }

      const notas = await transaction.notaFiscal.findMany({
        where: { id: { in: parsed.data.notasIds } },
        select: {
          id: true,
          controleId: true,
          transportadoraDestino: true,
        },
      });

      const jaVinculadasAoControle = notas.filter(
        (nota) => nota.controleId === controle.id
      );
      const aindaDisponiveis = notas.filter((nota) => nota.controleId === null);

      if (
        notas.length !== parsed.data.notasIds.length
        || notas.some((nota) => nota.controleId !== null && nota.controleId !== controle.id)
        || !notasCompativeisComControle(
          aindaDisponiveis.map((nota) => nota.id),
          aindaDisponiveis,
          controle.transportadora
        )
      ) {
        throw new NotaIndisponivelError('Notas não estão disponíveis para este controle');
      }

      if (aindaDisponiveis.length > 0) {
        const atualizadas = await transaction.notaFiscal.updateMany({
          where: {
            id: { in: aindaDisponiveis.map((nota) => nota.id) },
            controleId: null,
            OR: [
              { transportadoraDestino: controle.transportadora },
              { transportadoraDestino: null },
            ],
          },
          data: { controleId: controle.id },
        });

        if (!vinculoCompleto(aindaDisponiveis.length, atualizadas.count)) {
          throw new NotaIndisponivelError('Notas foram vinculadas durante a operação');
        }
      }

      if (jaVinculadasAoControle.length + aindaDisponiveis.length !== parsed.data.notasIds.length) {
        throw new NotaIndisponivelError('Nem todas as notas foram vinculadas');
      }
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return res.status(200).json({ message: 'Notas vinculadas com sucesso' });
  } catch (error) {
    if (error instanceof ControleFinalizadoForbiddenError) {
      return res.status(403).json({ message: error.message });
    }

    if (error instanceof NotaIndisponivelError) {
      return res.status(
        CONTROLE_NOTAS_CONFLICT_RESPONSE.status
      ).json(CONTROLE_NOTAS_CONFLICT_RESPONSE.body);
    }

    console.error('Erro ao vincular notas:', error);
    return res.status(500).json({ message: 'Erro ao vincular notas' });
  }
};

export default withAuth(handler);
