import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import { AuthenticatedRequest, withAuth } from '@/lib/middleware/withAuth';

/**
 * Autenticação dupla: token de TOTEM ou sessão JWT.
 *
 * Pensada para as telas de totem (ex.: /separacao), que são públicas e não
 * têm cookie de sessão: a página envia `x-totem-token` conferido contra
 * `process.env.TOTEM_TOKEN`. Se o header não bater, cai no `withAuth`
 * normal — assim chamadas de usuários logados (admin/testes) continuam
 * funcionando.
 *
 * Quando autenticado via totem, `req.user` recebe um usuário sintético
 * `{ tipo: 'TOTEM' }` — endpoints que dependem do usuário real devem
 * continuar usando `withAuth`.
 */
const HEADER_TOKEN = 'x-totem-token';

const TOTEM_USER: AuthenticatedRequest['user'] = {
  id: 'totem',
  email: 'totem@local',
  tipo: 'TOTEM',
};

type AuthenticatedHandler = (
  req: AuthenticatedRequest,
  res: NextApiResponse
) => unknown | Promise<unknown>;

export const withTotemOrAuth = (handler: AuthenticatedHandler): NextApiHandler => {
  const authenticated = withAuth(handler);

  return async (req: NextApiRequest, res: NextApiResponse) => {
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
