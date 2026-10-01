import { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '@/lib/prisma';

type TokenPayload = {
  id?: string;
  userId?: string;
};

export async function getAuthenticatedUser(req: NextApiRequest) {
  const cookies = parseCookies({ req });
  const cookieToken = cookies.auth_token;
  const authorizationHeader = req.headers.authorization;
  const bearerToken = authorizationHeader?.startsWith('Bearer ')
    ? authorizationHeader.slice(7)
    : null;
  const token = cookieToken || bearerToken;

  if (!token) {
    return null;
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_secreto') as TokenPayload;
  const userId = decoded.id || decoded.userId;
  if (!userId) {
    return null;
  }

  return prisma.usuario.findUnique({
    where: { id: userId },
    select: {
      id: true,
      nome: true,
      email: true,
      tipo: true,
      ativo: true,
    },
  });
}
