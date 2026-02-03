import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '@/lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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

  if (req.method === 'GET') {
    try {
      const { numeroPedido } = req.query;

      if (!numeroPedido || typeof numeroPedido !== 'string') {
        return res.status(400).json({ error: 'Número do pedido é obrigatório' });
      }

      // Buscar pedido pelo número
      const pedido = await prisma.pedido.findFirst({
        where: { 
          numeroPedido: numeroPedido.trim() 
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
              conferente: {
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
        }
      });

      if (!pedido) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).json(pedido);
    } catch (error) {
      console.error('Erro ao buscar pedido:', error);
      res.status(500).json({ error: 'Erro ao buscar pedido' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
