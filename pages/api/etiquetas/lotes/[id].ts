import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '../../../../lib/auth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getTokenFromCookies(req);

  if (!token) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID do lote é obrigatório' });
  }

  switch (req.method) {
    case 'GET': {
      try {
        // Buscar lote específico do usuário
        const lote = await prisma.etiquetaLote.findFirst({
          where: {
            id,
            criadoPor: decoded.id // Garantir que só o criador pode ver
          },
          include: {
            volumesEtiquetas: {
              orderBy: { indiceVolume: 'asc' }
            },
            criadoPorUser: {
              select: {
                id: true,
                nome: true,
                email: true
              }
            }
          }
        });

        if (!lote) {
          return res.status(404).json({ error: 'Lote não encontrado' });
        }

        res.status(200).json(lote);
      } catch (error) {
        console.error('Erro ao buscar lote de etiquetas:', error);
        res.status(500).json({ error: 'Erro ao buscar lote de etiquetas' });
      }
      break;
    }

    case 'PATCH': {
      // Para marcar impressão (opcional)
      try {
        const { marcarImpressao } = req.body;

        if (marcarImpressao) {
          // Marcar todos os volumes como impressos
          await prisma.etiquetaVolume.updateMany({
            where: {
              loteId: id,
              impressoEm: null // Só marcar se não foi impresso ainda
            },
            data: {
              impressoEm: new Date()
            }
          });
        }

        // Retornar lote atualizado
        const lote = await prisma.etiquetaLote.findFirst({
          where: {
            id,
            criadoPor: decoded.id
          },
          include: {
            volumesEtiquetas: {
              orderBy: { indiceVolume: 'asc' }
            }
          }
        });

        if (!lote) {
          return res.status(404).json({ error: 'Lote não encontrado' });
        }

        res.status(200).json(lote);
      } catch (error) {
        console.error('Erro ao atualizar lote de etiquetas:', error);
        res.status(500).json({ error: 'Erro ao atualizar lote de etiquetas' });
      }
      break;
    }

    default:
      res.setHeader('Allow', ['GET', 'PATCH']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
