import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma, Transportadora } from '@prisma/client';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import {
  CONTROLE_NOTAS_CONFLICT_RESPONSE,
  controleCreateSchema,
  notasCompativeisComControle,
  vinculoCompleto,
} from '@/lib/controles/nota-control-contract';

class NotaIndisponivelError extends Error {}

const controlesQuerySchema = z.object({
  start: z.iso.date().optional(),
  end: z.iso.date().optional(),
  transportadora: z.union([z.nativeEnum(Transportadora), z.literal('all'), z.literal('')]).optional(),
  notaFiscal: z.string().optional(),
  motorista: z.string().optional(),
  responsavel: z.string().optional(),
  limit: z.preprocess((value) => value === undefined ? 50 : typeof value === 'string' ? Number(value) : NaN, z.number().int().min(1).max(200)),
}).refine(({ start, end }) => !start || !end || start <= end, { message: 'Período inválido', path: ['end'] });

const authenticatedCreate = withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  const parsed = controleCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'invalid_payload',
      details: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }

  const input = parsed.data;
  const notasIds = input.notasIds ?? [];

  try {
    const controle = await prisma.$transaction(async (transaction) => {
      if (notasIds.length > 0) {
        const notas = await transaction.notaFiscal.findMany({
          where: { id: { in: notasIds } },
          select: {
            id: true,
            controleId: true,
            transportadoraDestino: true,
          },
        });

        if (!notasCompativeisComControle(notasIds, notas, input.transportadora)) {
          throw new NotaIndisponivelError('Notas não estão disponíveis para este controle');
        }
      }

      let numeroManifesto = input.numeroManifesto;
      if (!numeroManifesto) {
        const count = await transaction.controleCarga.count();
        numeroManifesto = (count + 1).toString();
      }

      const created = await transaction.controleCarga.create({
        data: {
          motorista: input.motorista,
          responsavel: input.responsavel,
          transportadora: input.transportadora,
          numeroManifesto,
          qtdPallets: Number(input.qtdPallets) || 0,
          observacao: input.observacao,
          cpfMotorista: input.cpfMotorista || 'PENDENTE',
          placaVeiculo: input.placaVeiculo,
          qtdPalletsLevados: Number(input.qtdPalletsLevados) || 0,
          qtdPalletsDevolvidos: Number(input.qtdPalletsDevolvidos) || 0,
          freteInformado: Boolean(input.freteInformado),
          valorFrete: input.valorFrete !== undefined && input.valorFrete !== null && input.valorFrete !== ''
            ? Number(input.valorFrete)
            : null,
        },
      });

      if (notasIds.length > 0) {
        const atualizadas = await transaction.notaFiscal.updateMany({
          where: {
            id: { in: notasIds },
            controleId: null,
            OR: [
              { transportadoraDestino: input.transportadora },
              { transportadoraDestino: null },
            ],
          },
          data: { controleId: created.id },
        });

        if (!vinculoCompleto(notasIds.length, atualizadas.count)) {
          throw new NotaIndisponivelError('Nem todas as notas puderam ser vinculadas');
        }
      }

      return transaction.controleCarga.findUniqueOrThrow({
        where: { id: created.id },
        include: { notas: true },
      });
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return res.status(201).json(controle);
  } catch (error) {
    if (error instanceof NotaIndisponivelError) {
      return res.status(
        CONTROLE_NOTAS_CONFLICT_RESPONSE.status
      ).json(CONTROLE_NOTAS_CONFLICT_RESPONSE.body);
    }

    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2034') {
      return res.status(
        CONTROLE_NOTAS_CONFLICT_RESPONSE.status
      ).json(CONTROLE_NOTAS_CONFLICT_RESPONSE.body);
    }

    console.error('Erro ao criar controle:', error);
    return res.status(500).json({ message: 'Erro ao criar controle' });
  }
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const parsed = controlesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_query', message: 'Filtros inválidos. Informe datas válidas e um limite entre 1 e 200.', details: parsed.error.issues });
    }
    try {
      const { start, end, transportadora, notaFiscal, motorista, responsavel, limit } = parsed.data;

      const where: Prisma.ControleCargaWhereInput = {};

      if (start || end) {
        where.dataCriacao = {
          ...(start ? { gte: new Date(`${start}T00:00:00.000Z`) } : {}),
          ...(end ? { lte: new Date(`${end}T23:59:59.999Z`) } : {}),
        };
      }

      if (transportadora && transportadora !== 'all') {
        where.transportadora = transportadora as Transportadora;
      }

      if (notaFiscal) {
        where.notas = {
          some: {
            numeroNota: {
              contains: String(notaFiscal),
              mode: 'insensitive',
            },
          },
        };
      }

      if (motorista) {
        where.motorista = {
          contains: String(motorista),
          mode: 'insensitive',
        };
      }

      if (responsavel) {
        where.responsavel = {
          contains: String(responsavel),
          mode: 'insensitive',
        };
      }

      const controles = await prisma.controleCarga.findMany({
        where,
        include: {
          notas: true,
        },
        orderBy: {
          dataCriacao: 'desc',
        },
        take: limit,
      });

      return res.status(200).json(controles);
    } catch (error) {
      console.error('Erro ao buscar controles:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else if (req.method === 'POST') {
    return authenticatedCreate(req, res);
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
