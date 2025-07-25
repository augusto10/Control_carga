import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
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

  const { pedidoId, correto = true } = req.body;

  if (!pedidoId) {
    return res.status(400).json({ message: 'ID do pedido é obrigatório' });
  }

  try {
    // Registrar pontuação para o usuário logado
    const acao = correto ? 'PEDIDO_CORRETO' : 'PEDIDO_INCORRETO';
    const pontos = correto ? 10 : -5;

    // Criar histórico de pontuação
    await prisma.historicoPontuacao.create({
      data: {
        usuarioId: decoded.id,
        pedidoId,
        acao,
        pontosGanhos: pontos,
        descricao: `${correto ? 'Separação correta' : 'Erro na separação'} do pedido ${pedidoId}`
      }
    });

    // Atualizar ou criar pontuação total
    const pontuacaoExistente = await prisma.pontuacaoUsuario.findUnique({
      where: { usuarioId: decoded.id }
    });

    if (pontuacaoExistente) {
      await prisma.pontuacaoUsuario.update({
        where: { usuarioId: decoded.id },
        data: {
          pontuacaoTotal: { increment: pontos },
          pedidosCorretos: correto ? { increment: 1 } : { increment: 0 },
          pedidosIncorretos: !correto ? { increment: 1 } : { increment: 0 }
        }
      });
    } else {
      await prisma.pontuacaoUsuario.create({
        data: {
          usuarioId: decoded.id,
          pontuacaoTotal: pontos,
          pedidosCorretos: correto ? 1 : 0,
          pedidosIncorretos: !correto ? 1 : 0
        }
      });
    }

    // Recalcular ranking
    const usuarios = await prisma.pontuacaoUsuario.findMany({
      orderBy: [
        { pontuacaoTotal: 'desc' },
        { pedidosCorretos: 'desc' }
      ]
    });

    // Atualizar posições no ranking
    for (let i = 0; i < usuarios.length; i++) {
      await prisma.pontuacaoUsuario.update({
        where: { id: usuarios[i].id },
        data: { posicaoRanking: i + 1 }
      });
    }

    return res.status(200).json({
      message: 'Pontuação registrada com sucesso',
      pontos,
      acao
    });

  } catch (error) {
    console.error('Erro ao registrar pontuação:', error);
    return res.status(500).json({ 
      message: 'Erro interno ao registrar pontuação',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
