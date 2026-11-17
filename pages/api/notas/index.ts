import { NextApiRequest, NextApiResponse } from 'next';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { findNotaByIdentity } from '@/lib/notas/salvar-multiplas-contract';
import {
  buildNotasDisponiveisWhere,
  notasDisponiveisQuerySchema,
} from '@/lib/notas/transferencia-contract';

const queryValueSchema = z.union([z.string(), z.array(z.string())]);
const notasQuerySchema = z.object({
  start: queryValueSchema.optional(),
  end: queryValueSchema.optional(),
  numeroNota: queryValueSchema.optional(),
  codigo: queryValueSchema.optional(),
  existe: z.enum(['1']).optional(),
}).passthrough().and(notasDisponiveisQuerySchema);

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function hasQueryFlag(value: '1' | Array<'1'> | undefined): boolean {
  return value === '1' || (Array.isArray(value) && value.includes('1'));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const parsedQuery = notasQuerySchema.safeParse(req.query);
  if (!parsedQuery.success) {
    return res.status(400).json({ error: 'invalid_query' });
  }

  try {
    const start = firstQueryValue(parsedQuery.data.start);
    const end = firstQueryValue(parsedQuery.data.end);
    const numeroNota = firstQueryValue(parsedQuery.data.numeroNota);
    const codigo = firstQueryValue(parsedQuery.data.codigo);

    if (parsedQuery.data.existe === '1') {
      if (!codigo && !numeroNota) {
        return res.status(400).json({ error: 'identity_required' });
      }

      const nota = await findNotaByIdentity(prisma, {
          codigo: codigo || '',
          numeroNota: numeroNota || '',
      });

      return res.status(200).json({ exists: Boolean(nota), nota });
    }

    console.log('[API Notas] Parâmetros recebidos:', { start, end, numeroNota, codigo });

    const where: Prisma.NotaFiscalWhereInput = {};

    if (start && end) {
      try {
        // Garante que start e end sejam strings simples
        const s = Array.isArray(start) ? start[0] : start;
        const e = Array.isArray(end) ? end[0] : end;

        const startDate = new Date(`${s}T00:00:00.000Z`);
        const endDate = new Date(`${e}T23:59:59.999Z`);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          where.dataCriacao = {
            gte: startDate,
            lte: endDate,
          };
        } else {
          console.warn('[API Notas] Datas inválidas:', { s, e });
        }
      } catch (dateError) {
        console.error('[API Notas] Erro ao processar datas:', dateError);
      }
    }

    if (numeroNota) {
      const n = Array.isArray(numeroNota) ? numeroNota[0] : numeroNota;
      where.numeroNota = {
        contains: String(n),
        mode: 'insensitive',
      };
    }

    if (codigo) {
      where.codigo = {
        contains: codigo,
        mode: 'insensitive',
      };
    }

    if (hasQueryFlag(parsedQuery.data.semTransportadora)) {
      Object.assign(where, buildNotasDisponiveisWhere({ semTransportadora: true }));
    } else if (hasQueryFlag(parsedQuery.data.disponiveis)) {
      Object.assign(where, buildNotasDisponiveisWhere({
        transportadoraDestino: parsedQuery.data.transportadoraDestino,
      }));
    } else if (parsedQuery.data.transportadoraDestino) {
      where.transportadoraDestino = parsedQuery.data.transportadoraDestino;
    }

    console.log('[API Notas] Filtro where:', JSON.stringify(where));

    // Limita cada resposta do banco para não exceder os 5 MB do Accelerate.
    // O id desempata datas iguais e mantém o cursor estável entre os lotes.
    const query = {
      where,
      include: {
        controle: {
          select: {
            id: true,
            dataCriacao: true
          }
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: [{ dataCriacao: 'desc' }, { id: 'desc' }],
      take: 1000,
    } satisfies Prisma.NotaFiscalFindManyArgs;

    let lote = await prisma.notaFiscal.findMany(query);
    const notas = [...lote];
    while (lote.length === query.take) {
      lote = await prisma.notaFiscal.findMany({
        ...query,
        cursor: { id: lote[lote.length - 1].id },
        skip: 1,
      });
      notas.push(...lote);
    }

    return res.status(200).json(notas);
  } catch (error) {
    console.error('Erro ao buscar notas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
