import { Prisma, Transportadora } from '@prisma/client';
import { z } from 'zod';

const queryValueSchema = z.union([z.literal('1'), z.array(z.literal('1'))]);

export const notasDisponiveisQuerySchema = z.object({
  disponiveis: queryValueSchema.optional(),
  transportadoraDestino: z.nativeEnum(Transportadora).optional(),
  semTransportadora: queryValueSchema.optional(),
}).passthrough().superRefine((query, context) => {
  if (query.semTransportadora && query.transportadoraDestino) {
    context.addIssue({
      code: 'custom',
      path: ['semTransportadora'],
      message: 'Filtros de destino incompatíveis',
    });
  }
});

export const transferenciaNotasSchema = z.object({
  notaIds: z.array(z.string().trim().min(1)).min(1),
  transportadoraDestino: z.nativeEnum(Transportadora),
}).superRefine(({ notaIds }, context) => {
  if (new Set(notaIds).size !== notaIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['notaIds'],
      message: 'IDs de nota repetidos',
    });
  }
});

export const NOTA_TRANSFERENCIA_CONFLICT_RESPONSE = {
  status: 409,
  body: {
    error: 'notes_unavailable',
    message: 'Uma ou mais notas não estão disponíveis para transferência',
  },
} as const;

export function buildNotasDisponiveisWhere(filters: {
  semTransportadora?: boolean;
  transportadoraDestino?: Transportadora;
}): Prisma.NotaFiscalWhereInput {
  return {
    controleId: null,
    transportadoraDestino: filters.semTransportadora
      ? null
      : filters.transportadoraDestino ?? { not: null },
  };
}
