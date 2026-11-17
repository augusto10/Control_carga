import { Transportadora } from '@prisma/client';
import { z } from 'zod';

const numericInputSchema = z.union([z.number(), z.string()]);

export const controleCreateSchema = z.object({
  motorista: z.string().trim().min(1),
  responsavel: z.string().trim().min(1),
  transportadora: z.nativeEnum(Transportadora),
  numeroManifesto: z.string().nullable().optional(),
  qtdPallets: numericInputSchema.optional(),
  observacao: z.string().nullable().optional(),
  cpfMotorista: z.string().optional(),
  placaVeiculo: z.string().optional(),
  qtdPalletsLevados: numericInputSchema.optional(),
  qtdPalletsDevolvidos: numericInputSchema.optional(),
  freteInformado: z.boolean().optional(),
  valorFrete: numericInputSchema.nullable().optional(),
  notasIds: z.array(z.string().trim().min(1)).optional(),
}).passthrough().superRefine(({ notasIds }, context) => {
  if (notasIds && new Set(notasIds).size !== notasIds.length) {
    context.addIssue({
      code: 'custom',
      path: ['notasIds'],
      message: 'IDs de nota repetidos',
    });
  }
});

export const CONTROLE_NOTAS_CONFLICT_RESPONSE = {
  status: 409,
  body: {
    error: 'notes_unavailable',
    message: 'Uma ou mais notas não estão disponíveis ou pertencem a outra transportadora',
  },
} as const;

export function notasCompativeisComControle(
  requestedIds: string[],
  notas: Array<{
    id: string;
    controleId: string | null;
    transportadoraDestino: string | null;
  }>,
  transportadora: string
): boolean {
  if (requestedIds.length !== notas.length) return false;

  const notasPorId = new Map(notas.map((nota) => [nota.id, nota]));
  return requestedIds.every((id) => {
    const nota = notasPorId.get(id);
    return nota !== undefined
      && nota.controleId === null
      && (
        nota.transportadoraDestino === null
        || nota.transportadoraDestino === transportadora
      );
  });
}

export function vinculoCompleto(requestedCount: number, updatedCount: number): boolean {
  return requestedCount === updatedCount;
}
