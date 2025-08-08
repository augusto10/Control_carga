import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getTokenFromCookies } from '../../../utils/auth';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    const pontuacao = await prisma.pontuacaoUsuario.findUnique({
      where: { usuarioId: userId },
      select: {
        usuarioId: true,
        pontuacaoTotal: true,
        pedidosCorretos: true,
        pedidosIncorretos: true,
        posicaoRanking: true,
      },
    });

    if (!pontuacao) {
      // Se não existe, criar registro com 0 pontos
      const novaPontuacao = await prisma.pontuacaoUsuario.create({
        data: {
          usuarioId: userId,
          pontuacaoTotal: 0,
          pedidosCorretos: 0,
          pedidosIncorretos: 0,
        },
      });

      return res.status(200).json({
        usuarioId: novaPontuacao.usuarioId,
        pontuacaoTotal: novaPontuacao.pontuacaoTotal,
        pedidosCorretos: novaPontuacao.pedidosCorretos,
        pedidosIncorretos: novaPontuacao.pedidosIncorretos,
        posicaoRanking: null,
      });
    }

    // Recalcular posição no ranking
    const ranking = await prisma.pontuacaoUsuario.findMany({
      orderBy: { pontuacaoTotal: 'desc' },
      select: { usuarioId: true },
    });

    const posicao = ranking.findIndex(p => p.usuarioId === userId) + 1;

    // Atualizar posição se mudou
    if (pontuacao.posicaoRanking !== posicao) {
      await prisma.pontuacaoUsuario.update({
        where: { usuarioId: userId },
        data: { posicaoRanking: posicao },
      });
    }

    res.status(200).json({
      ...pontuacao,
      posicaoRanking: posicao,
    });
  } catch (error) {
    console.error('Erro ao obter pontuação:', error);
    res.status(500).json({ message: 'Erro ao obter pontuação' });
  }
}
