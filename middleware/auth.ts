import { NextApiRequest, NextApiResponse, NextApiHandler } from 'next';
import { verify } from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export interface AuthRequest extends NextApiRequest {
  user?: {
    id: string;
    email: string;
    tipo: string;
  };
}

export const withAuth = (handler: NextApiHandler, allowedRoles: string[] = ['ADMIN', 'USUARIO']) => 
  async (req: AuthRequest, res: NextApiResponse) => {
    // Verificar se o método é OPTIONS (preflight do CORS)
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    try {
      // Obter o token do cabeçalho Authorization
      const authHeader = req.headers.authorization;
      
      if (!authHeader) {
        return res.status(401).json({ message: 'Token não fornecido' });
      }

      const parts = authHeader.split(' ');
      
      if (parts.length !== 2) {
        return res.status(401).json({ message: 'Erro no token' });
      }

      const [scheme, token] = parts;
      
      if (!/^Bearer$/i.test(scheme)) {
        return res.status(401).json({ message: 'Token mal formatado' });
      }

      // Verificar o token
      const decoded = verify(token, JWT_SECRET) as { userId: string };
      
      // Verificar se o usuário existe
      const user = await prisma.usuario.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          tipo: true,
          ativo: true
        },
      });

      if (!user || !user.ativo) {
        return res.status(401).json({ message: 'Usuário não encontrado ou inativo' });
      }

      // Verificar permissões
      if (allowedRoles.length > 0 && !allowedRoles.includes(user.tipo)) {
        return res.status(403).json({ message: 'Acesso negado' });
      }

      // Adicionar informações do usuário ao request
      req.user = {
        id: user.id,
        email: user.email,
        tipo: user.tipo,
      };

      return handler(req, res);
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return res.status(401).json({ message: 'Token inválido' });
    }
  };

// Função auxiliar para verificar permissões específicas
export const requireRole = (role: string) => 
  (handler: NextApiHandler) => withAuth(handler, [role]);

export const requireAdmin = (handler: NextApiHandler) => 
  requireRole('ADMIN')(handler);

export const requireUser = (handler: NextApiHandler) => 
  requireRole('USUARIO')(handler);
