import { verify } from 'jsonwebtoken';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

/**
 * Autenticação para as telas de totem (ex.: /separacao), nesta ordem:
 *
 * 1. Cookie `totem_auth` — JWT sem expiração emitido por GET /api/totem/auth?k=
 *    (pareamento único no tablet; httpOnly, não aparece no bundle do browser)
 * 2. Header `x-totem-token` === TOTEM_TOKEN — útil para curl/testes
 * 3. Sessão JWT normal via `withAuth` — usuários logados (admin/testes)
 *
 * Quando autenticado via totem, `req.user` recebe o usuário sintético
 * `{ tipo: 'TOTEM' }` — endpoints que dependem do usuário real devem
 * continuar usando `withAuth`.
 */
const HEADER_TOKEN = 'x-totem-token';
const COOKIE_NAME = 'totem_auth';
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

const TOTEM_USER: AuthenticatedRequest['user'] = {
  id: 'totem',
  email: 'totem@local',
  tipo: 'TOTEM',
};

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => unknown | Promise<unknown>;

const cookieTotemValido = (req: NextApiRequest): boolean => {
  const valor = req.cookies[COOKIE_NAME];
  if (!valor) return false;
  try {
    const decoded = verify(valor, JWT_SECRET);
    return (
      typeof decoded === 'object' &&
      decoded !== null &&
      (decoded as { tipo?: string }).tipo === 'TOTEM'
    );
  } catch {
    return false;
  }
};

export const withTotemOrAuth = (handler: AuthenticatedHandler): NextApiHandler => {
  const authenticated = withAuth(handler);

  return async (req: NextApiRequest, res: NextApiResponse) => {
    if (cookieTotemValido(req)) {
      (req as AuthenticatedRequest).user = TOTEM_USER;
      return handler(req as AuthenticatedRequest, res);
    }

    const totemToken = process.env.TOTEM_TOKEN;
    const recebido = req.headers[HEADER_TOKEN];
    const token =
      typeof recebido === 'string' ? recebido : Array.isArray(recebido) ? recebido[0] : undefined;

    if (totemToken && token === totemToken) {
      (req as AuthenticatedRequest).user = TOTEM_USER;
      return handler(req as AuthenticatedRequest, res);
    }

    return authenticated(req, res);
  };
};
