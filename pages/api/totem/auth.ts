import { timingSafeEqual } from 'crypto';
import { sign } from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';
const COOKIE_NAME = 'totem_auth';
// ~10 anos: totem é um kiosk dedicado, não deve precisar reparear
const COOKIE_MAX_AGE = 10 * 365 * 24 * 60 * 60;

const seguro = (a: string, b: string) => {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};

/**
 * GET /api/totem/auth?k=<TOTEM_TOKEN>
 *
 * Pareamento do totem: valida o token server-side e emite um JWT sem
 * expiração num cookie httpOnly — o segredo nunca chega ao bundle do
 * browser (ao contrário de NEXT_PUBLIC_*). Acessar esta URL uma única
 * vez no tablet; depois só /separacao.
 *
 * O cookie é lido por `withTotemOrAuth` nas APIs de separação.
 */
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método não permitido' });
  }

  const esperado = process.env.TOTEM_TOKEN;
  const recebido = Array.isArray(req.query.k) ? req.query.k[0] : req.query.k;

  if (!esperado) {
    return res
      .status(500)
      .json({ success: false, message: 'TOTEM_TOKEN não configurado no servidor.' });
  }
  if (!recebido || !seguro(recebido, esperado)) {
    return res.status(401).json({ success: false, message: 'Token inválido.' });
  }

  const token = sign({ sub: 'totem', tipo: 'TOTEM' }, JWT_SECRET);

  const cookie = [
    `${COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${COOKIE_MAX_AGE}`,
    ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
  ].join('; ');

  res.setHeader('Set-Cookie', cookie);
  return res.redirect(302, '/separacao');
}
