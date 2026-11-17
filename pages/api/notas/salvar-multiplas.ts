import { Prisma } from '@prisma/client';
import { NextApiResponse } from 'next';
import {
  AuthenticatedRequest,
  withAuth,
} from '@/lib/middleware/withAuth';
import prisma from '@/lib/prisma';
import {
  DUPLICATE_NOTE_RESPONSE,
  findNotaByIdentities,
  salvarMultiplasNotasSchema,
} from '@/lib/notas/salvar-multiplas-contract';
import type { NotaIdentityReader } from '@/lib/notas/salvar-multiplas-contract';

class DuplicateNoteConflictError extends Error {}

async function findExistingNota(
  client: NotaIdentityReader,
  notas: Array<{ codigo: string; numeroNota: string }>
) {
  return findNotaByIdentities(client, notas);
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const parsed = salvarMultiplasNotasSchema.safeParse(req.body);
  if (!parsed.success) {
    if (parsed.error.issues.some((issue) => issue.message === 'duplicate_note')) {
      return res.status(
        DUPLICATE_NOTE_RESPONSE.status
      ).json(DUPLICATE_NOTE_RESPONSE.body);
    }

    return res.status(400).json({
      error: 'invalid_payload',
      details: parsed.error.issues.map((issue) => ({
        path: issue.path,
        message: issue.message,
      })),
    });
  }

  try {
    const criadas = await prisma.$transaction(async (transaction) => {
      const existente = await findExistingNota(transaction, parsed.data.notas);

      if (existente) {
        throw new DuplicateNoteConflictError('Nota já cadastrada');
      }

      const result = [];
      for (const nota of parsed.data.notas) {
        result.push(await transaction.notaFiscal.create({
          data: {
            codigo: nota.codigo,
            numeroNota: nota.numeroNota,
            volumes: String(nota.volumes ?? '1'),
            usuarioId: req.user.id,
            transportadoraDestino: nota.transportadoraDestino,
          },
        }));
      }
      return result;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });

    return res.status(201).json({ success: true, data: criadas });
  } catch (error) {
    if (error instanceof DuplicateNoteConflictError) {
      return res.status(
        DUPLICATE_NOTE_RESPONSE.status
      ).json(DUPLICATE_NOTE_RESPONSE.body);
    }

    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002' || prismaError.code === 'P2034') {
      const existente = await findExistingNota(prisma, parsed.data.notas);
      if (existente) {
        return res.status(
          DUPLICATE_NOTE_RESPONSE.status
        ).json(DUPLICATE_NOTE_RESPONSE.body);
      }
    }

    console.error('Erro ao salvar notas:', error);
    return res.status(500).json({ error: 'internal_error', message: 'Erro ao salvar notas' });
  }
}

export default withAuth(handler);
