import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação básica (usuário logado)
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  try {
    verify(token, JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }

  // Apenas o método GET é permitido
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} não permitido` });
  }

  try {
    // Buscar usuários com as funções específicas
    const usuarios = await prisma.usuario.findMany({
      where: {
        tipo: {
          in: ['SEPARADOR', 'AUDITOR', 'CONFERENTE'],
        },
        ativo: true,
      },
      select: {
        id: true,
        nome: true,
        tipo: true,
      },
      orderBy: {
        nome: 'asc',
      },
    });

    return res.status(200).json(usuarios);

  } catch (error: any) {
    console.error('Erro ao buscar usuários por função:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
