import { NextApiResponse } from 'next';
import { StatusValidacao } from '@prisma/client';
import prisma from '../../../lib/prisma';
import { withAuth, AuthRequest } from '../../../middleware/auth';
import { registrarPontuacao } from '../../../services/gamificacaoService.server';

const handler = async (req: AuthRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const usuarioLogado = req.user;
    if (!usuarioLogado) {
      return res.status(401).json({ message: 'Usuário não autenticado.' });
    }

    const { pedidoConferidoId, status } = req.body;

    if (!pedidoConferidoId || !status) {
      return res.status(400).json({ message: 'pedidoConferidoId e status são obrigatórios.' });
    }

    if (status !== 'VALIDADO_CORRETO' && status !== 'VALIDADO_INCORRETO') {
        return res.status(400).json({ message: 'Status de validação inválido.' });
    }

    const statusValidacao = status as StatusValidacao;

    const resultado = await prisma.$transaction(async (tx) => {
      const pedidoConferido = await tx.pedidoConferido.findUnique({
        where: { id: pedidoConferidoId },
      });

      if (!pedidoConferido) {
        throw new Error('Pedido conferido não encontrado.');
      }

      if (pedidoConferido.statusValidacao !== 'PENDENTE') {
        throw new Error('Este pedido já foi validado.');
      }

      const pedidoAtualizado = await tx.pedidoConferido.update({
        where: { id: pedidoConferidoId },
        data: {
          statusValidacao: statusValidacao,
          dataValidacao: new Date(),
          validadorId: usuarioLogado.id,
        },
      });

      const pontos = statusValidacao === 'VALIDADO_CORRETO' ? 10 : -5;
      const acao = statusValidacao === 'VALIDADO_CORRETO' ? 'PEDIDO_CORRETO' : 'PEDIDO_INCORRETO';
      const descricao = `Pedido validado como ${statusValidacao.replace('VALIDADO_', '').toLowerCase()} pelo gerente ${usuarioLogado.nome}.`;

      if (pedidoConferido.separadorId) {
        await registrarPontuacao(tx, {
          usuarioId: pedidoConferido.separadorId,
          pedidoId: pedidoConferido.pedidoId,
          pontos,
          acao,
          descricao,
        });
      }

      if (pedidoConferido.conferenteId) {
        await registrarPontuacao(tx, {
          usuarioId: pedidoConferido.conferenteId,
          pedidoId: pedidoConferido.pedidoId,
          pontos,
          acao,
          descricao,
        });
      }

      return pedidoAtualizado;
    });

    return res.status(200).json({ message: 'Pedido validado com sucesso!', pedido: resultado });

  } catch (error: any) {
    console.error('Erro ao validar pedido:', error);
    return res.status(500).json({ message: error.message || 'Erro interno do servidor' });
  }
};

export default withAuth(handler, ['ADMIN', 'GERENTE']);
