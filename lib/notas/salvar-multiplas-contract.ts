import { Prisma, Transportadora } from '@prisma/client';
import { z } from 'zod';
import { normalizeNotaIdentity } from '@/lib/notas/transportadora';

const notaPayloadSchema = z.object({
  codigo: z.string().trim().min(1),
  numeroNota: z.string().trim().min(1),
  volumes: z.union([z.string(), z.number()]).optional(),
  transportadoraDestino: z.nativeEnum(Transportadora).optional(),
}).transform((nota) => ({
  ...nota,
  transportadoraDestino: nota.transportadoraDestino ?? null,
}));

export const salvarMultiplasNotasSchema = z.object({
  notas: z.array(notaPayloadSchema).min(1),
}).superRefine(({ notas }, context) => {
  const identities = new Set<string>();

  notas.forEach((nota, index) => {
    const identity = normalizeNotaIdentity(nota);
    if (identity && identities.has(identity)) {
      context.addIssue({
        code: 'custom',
        path: ['notas', index],
        message: 'duplicate_note',
      });
    }
    if (identity) identities.add(identity);
  });
});

export const DUPLICATE_NOTE_RESPONSE = {
  status: 409,
  body: {
    error: 'duplicate_note',
    message: 'Esta nota já está salva',
  },
} as const;

export type NotaParaSalvar = z.infer<typeof notaPayloadSchema>;

type NotaIdentityFields = Pick<NotaParaSalvar, 'codigo' | 'numeroNota'>;
export type NotaIdentityReader = Pick<Prisma.TransactionClient, '$queryRaw'>;

const codigoValido = Prisma.sql`(
  COALESCE(BTRIM("codigo") ~* '^[A-Z0-9-]{1,50}$', FALSE)
  AND COALESCE(UPPER(BTRIM("codigo")) NOT LIKE 'MANUAL-%', FALSE)
)`;

function getNotaIdentityPredicate(nota: NotaIdentityFields): Prisma.Sql | null {
  const identity = normalizeNotaIdentity(nota);
  if (!identity) return null;

  if (identity.startsWith('codigo:')) {
    return Prisma.sql`
      ${codigoValido}
      AND UPPER(BTRIM("codigo")) = ${identity.slice('codigo:'.length)}
    `;
  }

  return Prisma.sql`
    NOT ${codigoValido}
    AND COALESCE(
      NULLIF(
        LTRIM(REGEXP_REPLACE(BTRIM("numeroNota"), '[^0-9]', '', 'g'), '0'),
        ''
      ),
      '0'
    ) = ${identity.slice('numero:'.length)}
  `;
}

export function getNotasIdentityLookupQuery(notas: NotaIdentityFields[]): Prisma.Sql | null {
  const predicates = notas
    .map(getNotaIdentityPredicate)
    .filter((predicate): predicate is Prisma.Sql => predicate !== null);
  if (predicates.length === 0) return null;

  return Prisma.sql`
    SELECT "id", "codigo", "numeroNota"
    FROM "NotaFiscal"
    WHERE ${Prisma.join(predicates, ' OR ')}
    LIMIT 1
  `;
}

export function getNotaIdentityLookupQuery(nota: NotaIdentityFields): Prisma.Sql | null {
  return getNotasIdentityLookupQuery([nota]);
}

export async function findNotaByIdentity(
  client: NotaIdentityReader,
  nota: NotaIdentityFields
): Promise<{ id: string; codigo: string; numeroNota: string } | null> {
  const query = getNotaIdentityLookupQuery(nota);
  if (!query) return null;

  const notas = await client.$queryRaw<Array<{ id: string; codigo: string; numeroNota: string }>>(query);
  return notas[0] ?? null;
}

export async function findNotaByIdentities(
  client: NotaIdentityReader,
  notas: NotaIdentityFields[]
): Promise<{ id: string; codigo: string; numeroNota: string } | null> {
  const query = getNotasIdentityLookupQuery(notas);
  if (!query) return null;

  const correspondencias = await client.$queryRaw<Array<{ id: string; codigo: string; numeroNota: string }>>(query);
  return correspondencias[0] ?? null;
}
