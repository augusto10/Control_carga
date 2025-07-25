import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const { usuarioId, pedidoId, acao, pontos, descricao } = req.body;

    // Verificar se o usuário tem permissão
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { tipo: true }
    });

    if (!usuario || (usuario.tipo !== 'ADMIN' && usuario.tipo !== 'GERENTE' && usuario.tipo !== 'AUDITOR')) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Registrar pontuação no histórico
    const historico = await prisma.historicoPontuacao.create({
      data: {
        usuarioId,
        pedidoId,
        acao,
        pontosGanhos: pontos,
        descricao,
      }
    });

    // Atualizar pontuação total do usuário
    const pontuacaoAtual = await prisma.pontuacaoUsuario.findUnique({
      where: { usuarioId }
    });

    if (pontuacaoAtual) {
      await prisma.pontuacaoUsuario.update({
        where: { usuarioId },
        data: {
          pontuacaoTotal: pontuacaoAtual.pontuacaoTotal + pontos,
          pedidosCorretos: acao === 'PEDIDO_CORRETO' ? { increment: 1 } : pontuacaoAtual.pedidosCorretos,
          pedidosIncorretos: acao === 'PEDIDO_INCORRETO' ? { increment: 1 } : pontuacaoAtual.pedidosIncorretos,
        }
      });
    } else {
      await prisma.pontuacaoUsuario.create({
        data: {
          usuarioId,
          pontuacaoTotal: pontos,
          pedidosCorretos: acao === 'PEDIDO_CORRETO' ? 1 : 0,
          pedidosIncorretos: acao === 'PEDIDO_INCORRETO' ? 1 : 0,
        }
      });
    }

    // Atualizar ranking
    await atualizarRanking();

    res.status(200).json({ 
      success: true, 
      historico,
      message: 'Pontuação registrada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao registrar pontuação:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
}

async function atualizarRanking() {
  const ranking = await prisma.pontuacaoUsuario.findMany({
    orderBy: { pontuacaoTotal: 'desc' },
    select: { usuarioId: true }
  });

  for (let i = 0; i < ranking.length; i++) {
    await prisma.pontuacaoUsuario.update({
      where: { usuarioId: ranking[i].usuarioId },
      data: { posicaoRanking: i + 1 }
    });
  }
}
