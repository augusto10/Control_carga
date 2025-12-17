import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCookies } from '../../../utils/auth';
import * as jwt from 'jsonwebtoken';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ message: 'Token não fornecido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
    const userId = decoded.userId;

    // Verificar se é administrador
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { tipo: true }
    });

    if (!usuario || (usuario.tipo !== 'ADMIN' && usuario.tipo !== 'GERENTE')) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const { usuarioId, pontos, descricao, acao = 'BONUS_ADMIN' } = req.body;

    if (!usuarioId || typeof pontos !== 'number') {
      return res.status(400).json({ message: 'Dados inválidos' });
    }

    // Atualizar pontuação do usuário
    const pontuacaoAtual = await prisma.pontuacaoUsuario.findUnique({
      where: { usuarioId }
    });

    if (!pontuacaoAtual) {
      await prisma.pontuacaoUsuario.create({
        data: {
          usuarioId,
          pontuacaoTotal: Math.max(0, pontos),
          pedidosCorretos: 0,
          pedidosIncorretos: 0
        }
      });
    } else {
      await prisma.pontuacaoUsuario.update({
        where: { usuarioId },
        data: {
          pontuacaoTotal: Math.max(0, pontuacaoAtual.pontuacaoTotal + pontos)
        }
      });
    }

    // Registrar no histórico
    await prisma.historicoPontuacao.create({
      data: {
        usuarioId,
        pontosGanhos: pontos,
        descricao: descricao || `Pontos ${pontos > 0 ? 'adicionados' : 'removidos'} por administrador`,
        acao,
        dataAcao: new Date()
      }
    });

    res.status(200).json({ message: 'Pontuação atualizada com sucesso' });
  } catch (error) {
    console.error('Erro ao adicionar pontos:', error);
    res.status(500).json({ message: 'Erro ao atualizar pontuação' });
  }
}
