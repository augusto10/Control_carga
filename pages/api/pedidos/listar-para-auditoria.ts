import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Método ${req.method} não permitido` });
  }

  // Verificar autenticação via cookie JWT
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  let decoded: any;
  try {
    decoded = verify(token, JWT_SECRET) as { id: string; tipo: string; email: string };
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }

  // Buscar o usuário atual pelo ID do token
  const currentUser = await prisma.usuario.findUnique({
    where: { id: decoded.id },
    select: { id: true, tipo: true, ativo: true }
  });

  if (!currentUser || !currentUser.ativo) {
    return res.status(403).json({ message: 'Acesso negado. Usuário inativo.' });
  }

  // Verificar se o usuário tem permissão para auditar (AUDITOR ou ADMIN)
  if (currentUser.tipo !== 'AUDITOR' && currentUser.tipo !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso negado. Permissão de auditor necessária.' });
  }

  try {
    // Buscar pedidos que foram separados mas ainda não auditados
    const pedidos = await prisma.pedido.findMany({
      where: {
        conferido: {
          separadorId: { not: null }, // Foi separado
          auditoriaRealizada: false // Auditoria não realizada
        }
      },
      include: {
        controle: true,
        conferido: {
          include: {
            separador: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            },
            auditor: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        dataCriacao: 'desc'
      }
    });

    return res.status(200).json(pedidos);
  } catch (error: any) {
    console.error('Erro ao buscar pedidos para auditoria:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
