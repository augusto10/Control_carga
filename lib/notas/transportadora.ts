import { Transportadora } from '@prisma/client';

type NotaIdentityInput = {
  codigo?: string | null;
  numeroNota?: string | null;
};

export function normalizeNotaIdentity({ codigo, numeroNota }: NotaIdentityInput): string | null {
  const codigoNormalizado = codigo?.trim().toUpperCase();
  if (
    codigoNormalizado
    && !codigoNormalizado.startsWith('MANUAL-')
    && /^[A-Z0-9-]{1,50}$/.test(codigoNormalizado)
  ) {
    return `codigo:${codigoNormalizado}`;
  }

  const numeroNormalizado = numeroNota?.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  return numeroNormalizado ? `numero:${numeroNormalizado}` : null;
}

export function isTransportadora(value: unknown): value is Transportadora {
  return typeof value === 'string'
    && Object.prototype.hasOwnProperty.call(Transportadora, value);
}
