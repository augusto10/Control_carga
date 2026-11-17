import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, Transportadora } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';
import { canDeleteControle, canEditControle } from '@/lib/auth/permissions';
import prisma from '@/lib/prisma';
import { CONTROLE_NOTAS_CONFLICT_RESPONSE, notasCompativeisComControle, vinculoCompleto } from '@/lib/controles/nota-control-contract';

const numericInputSchema = z.union([z.number(), z.string()]);
const controleUpdateSchema = z.object({
  motorista: z.string().optional(),
  responsavel: z.string().optional(),
  transportadora: z.nativeEnum(Transportadora).optional(),
  numeroManifesto: z.string().nullable().optional(),
  qtdPallets: numericInputSchema.optional(),
  observacao: z.string().nullable().optional(),
  finalizado: z.boolean().optional(),
  cpfMotorista: z.string().optional(),
  placaVeiculo: z.string().optional(),
  qtdPalletsDevolvidos: numericInputSchema.optional(),
  qtdPalletsLevados: numericInputSchema.optional(),
  freteInformado: z.boolean().optional(),
  valorFrete: numericInputSchema.nullable().optional(),
  imagens: z.array(z.string()).optional(),
  notasIds: z.array(z.string().trim().min(1)).max(5000).refine((ids) => new Set(ids).size === ids.length, 'IDs de nota repetidos').optional(),
}).passthrough();

class ControleFinalizadoForbiddenError extends Error {}
class NotaIndisponivelError extends Error {}

const authenticatedUpdate = withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const parsed = controleUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'invalid_payload',
      details: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }

  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ message: 'ID inválido' });

  try {
    const updatedControle = await prisma.$transaction(async (transaction) => {
      const current = await transaction.controleCarga.findUnique({
        where: { id },
        select: { id: true, finalizado: true, transportadora: true },
      });

      if (!current) return null;
      if (!canEditControle(req.user, current)) {
        throw new ControleFinalizadoForbiddenError('Somente ADMIN pode editar controle finalizado');
      }

      const data: Prisma.ControleCargaUpdateManyMutationInput = {
        motorista: parsed.data.motorista,
        responsavel: parsed.data.responsavel,
        transportadora: parsed.data.transportadora,
        numeroManifesto: parsed.data.numeroManifesto,
        qtdPallets: parsed.data.qtdPallets !== undefined
          ? Number(parsed.data.qtdPallets)
          : undefined,
        observacao: parsed.data.observacao,
        finalizado: parsed.data.finalizado,
        cpfMotorista: parsed.data.cpfMotorista,
        placaVeiculo: parsed.data.placaVeiculo,
        qtdPalletsDevolvidos: parsed.data.qtdPalletsDevolvidos !== undefined
          ? Number(parsed.data.qtdPalletsDevolvidos)
          : undefined,
        qtdPalletsLevados: parsed.data.qtdPalletsLevados !== undefined
          ? Number(parsed.data.qtdPalletsLevados)
          : undefined,
        freteInformado: parsed.data.freteInformado,
        valorFrete: parsed.data.valorFrete !== undefined
          && parsed.data.valorFrete !== null
          && parsed.data.valorFrete !== ''
          ? Number(parsed.data.valorFrete)
          : undefined,
        imagens: parsed.data.imagens,
      };

      const result = await transaction.controleCarga.updateMany({
        where: {
          id,
          ...(req.user.tipo === 'ADMIN' ? {} : { finalizado: false }),
        },
        data,
      });

      if (result.count !== 1) {
        throw new ControleFinalizadoForbiddenError('Controle foi finalizado durante a edição');
      }

      if (parsed.data.notasIds !== undefined) {
        const notasIds = parsed.data.notasIds;
        const transportadora = parsed.data.transportadora ?? current.transportadora;
        const notas = await transaction.notaFiscal.findMany({
          where: { id: { in: notasIds } },
          select: { id: true, controleId: true, transportadoraDestino: true },
        });
        if (!notasCompativeisComControle(notasIds, notas.map((nota) => ({
          ...nota,
          controleId: nota.controleId === id ? null : nota.controleId,
        })), transportadora)) {
          throw new NotaIndisponivelError();
        }
        await transaction.notaFiscal.updateMany({
          where: { controleId: id, id: { notIn: notasIds } },
          data: { controleId: null },
        });
        const vinculadas = await transaction.notaFiscal.updateMany({
          where: { id: { in: notasIds }, OR: [{ controleId: null }, { controleId: id }] },
          data: { controleId: id },
        });
        if (!vinculoCompleto(notasIds.length, vinculadas.count)) throw new NotaIndisponivelError();
      }

      return transaction.controleCarga.findUniqueOrThrow({
        where: { id },
        include: { notas: true },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (!updatedControle) {
      return res.status(404).json({ message: 'Controle não encontrado' });
    }

    return res.status(200).json(updatedControle);
  } catch (error) {
    if (error instanceof ControleFinalizadoForbiddenError) {
      return res.status(403).json({ message: error.message });
    }
    if (error instanceof NotaIndisponivelError || (error as { code?: string }).code === 'P2034') {
      return res.status(CONTROLE_NOTAS_CONFLICT_RESPONSE.status).json(CONTROLE_NOTAS_CONFLICT_RESPONSE.body);
    }

    console.error('Erro ao atualizar controle:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

const authenticatedDelete = withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const id = typeof req.query.id === 'string' ? req.query.id : null;
  if (!id) return res.status(400).json({ message: 'ID inválido' });
  if (!canDeleteControle(req.user)) {
    return res.status(403).json({ message: 'Somente ADMIN pode excluir controles' });
  }

  try {
    const deleted = await prisma.$transaction(async (transaction) => {
      const current = await transaction.controleCarga.findUnique({
        where: { id },
        select: {
          id: true,
        },
      });

      if (!current) return false;
      await transaction.notaFiscal.updateMany({ where: { controleId: id }, data: { controleId: null } });
      await transaction.pedido.updateMany({ where: { controleId: id }, data: { controleId: null } });
      await transaction.fretePagamentoControle.deleteMany({ where: { controleId: id } });

      const result = await transaction.controleCarga.deleteMany({
        where: {
          id,
        },
      });

      if (result.count !== 1) {
        throw new Error('O controle foi alterado durante a exclusão');
      }
      return true;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    if (!deleted) return res.status(404).json({ message: 'Controle não encontrado' });
    return res.status(204).end();
  } catch (error) {
    if ((error as { code?: string }).code === 'P2034') {
      return res.status(409).json({ message: 'O controle foi alterado durante a exclusão. Tente novamente.' });
    }

    console.error('Erro ao deletar controle:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const controle = await prisma.controleCarga.findUnique({
        where: { id },
        include: { notas: true }
      });

      if (!controle) {
        return res.status(404).json({ message: 'Controle não encontrado' });
      }

      return res.status(200).json(controle);
    } catch (error) {
      console.error('Erro ao buscar controle:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else if (req.method === 'PUT') {
    return authenticatedUpdate(req, res);
  } else if (req.method === 'DELETE') {
    return authenticatedDelete(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
