import { verify } from 'jsonwebtoken';
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';
const COOKIE_NAME = 'auth_token';

export interface AuthenticatedRequest extends NextApiRequest {
  user: {
    id: string;
    email: string;
    tipo: string;
  };
}

type AuthenticatedHandler = (req: AuthenticatedRequest, res: NextApiResponse) => unknown | Promise<unknown>;

export const withAuth = (handler: AuthenticatedHandler): NextApiHandler => {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const token = req.cookies[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token de autenticação não fornecido.' });
    }

    try {
      const decoded = verify(token, JWT_SECRET);
      // Adiciona o usuário decodificado à requisição
      (req as AuthenticatedRequest).user = decoded as AuthenticatedRequest['user'];
      // Chama o handler original com a requisição modificada
      return await handler(req as AuthenticatedRequest, res);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Token inválido ou expirado.' });
    }
  };
};
