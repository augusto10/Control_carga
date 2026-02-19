import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const ranking = await prisma.pontuacaoUsuario.findMany({
      orderBy: [
        { pontuacaoTotal: 'desc' },
        { pedidosCorretos: 'desc' }
      ]
    });

    // Buscar informações dos usuários
    const rankingComUsuario = await Promise.all(
      ranking.map(async (pontuacao: any, index: number) => {
        const usuario: any = await prisma.usuario.findUnique({
          where: { id: pontuacao.usuarioId }
        });

        return {
          posicao: index + 1,
          usuario: {
            id: usuario?.id || '',
            nome: usuario?.nome || 'Usuário Desconhecido',
            email: usuario?.email || '',
            tipo: usuario?.tipo || 'USUARIO',
            foto: usuario?.foto || undefined,
          },
          pontuacaoTotal: pontuacao.pontuacaoTotal,
          pedidosCorretos: pontuacao.pedidosCorretos,
          pedidosIncorretos: pontuacao.pedidosIncorretos,
        };
      })
    );

    res.status(200).json(rankingComUsuario);
  } catch (error) {
    console.error('Erro ao buscar ranking:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

