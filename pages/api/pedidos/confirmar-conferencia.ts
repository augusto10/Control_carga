import { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware/withAuth';

// Função auxiliar para atualizar pontuação do usuário
async function atualizarPontuacaoUsuario(
  usuarioId: string, 
  acao: 'PEDIDO_CORRETO' | 'PEDIDO_INCORRETO' | 'BONUS_ADMIN' | 'PENALIDADE_ADMIN',
  pedidoId?: string,
  descricao?: string
) {
  const PONTOS_CONFIG = {
    PEDIDO_CORRETO: 10,
    PEDIDO_INCORRETO: -5,
    BONUS_ADMIN: 0,
    PENALIDADE_ADMIN: 0
  };

  const pontosGanhos = PONTOS_CONFIG[acao];

  // Buscar ou criar pontuação do usuário
  let pontuacaoUsuario = await prisma.pontuacaoUsuario.findUnique({
    where: { usuarioId }
  });

  if (!pontuacaoUsuario) {
    pontuacaoUsuario = await prisma.pontuacaoUsuario.create({
      data: {
        usuarioId,
        pontuacaoTotal: 0,
        pedidosCorretos: 0,
        pedidosIncorretos: 0
      }
    });
  }

  // Atualizar contadores
  const novosDados: any = {
    pontuacaoTotal: pontuacaoUsuario.pontuacaoTotal + pontosGanhos
  };

  if (acao === 'PEDIDO_CORRETO') {
    novosDados.pedidosCorretos = pontuacaoUsuario.pedidosCorretos + 1;
  } else if (acao === 'PEDIDO_INCORRETO') {
    novosDados.pedidosIncorretos = pontuacaoUsuario.pedidosIncorretos + 1;
  }

  // Atualizar pontuação do usuário
  await prisma.pontuacaoUsuario.update({
    where: { usuarioId },
    data: novosDados
  });

  // Registrar no histórico
  await prisma.historicoPontuacao.create({
    data: {
      usuarioId,
      pedidoId,
      acao,
      pontosGanhos,
      descricao: descricao || `${acao.replace('_', ' ').toLowerCase()}`
    }
  });
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { pedidoId, pedido100, inconsistencia, motivosInconsistencia, observacoes } = req.body;
  const conferenteId = req.user.id;

  if (!pedidoId) {
    return res.status(400).json({ error: 'ID do Pedido é obrigatório' });
  }

  try {
    // Verificar se o pedido existe
    const pedido = await prisma.pedido.findUnique({
      where: { id: pedidoId },
      include: { controle: true }
    });

    if (!pedido) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    // Verificar se já existe uma conferência para este pedido
    const conferenciaExistente = await prisma.pedidoConferido.findUnique({
      where: { pedidoId }
    });

    if (conferenciaExistente) {
      return res.status(400).json({ error: 'Este pedido já foi conferido' });
    }

    // Criar a conferência
    const conferencia = await prisma.pedidoConferido.create({
      data: {
        pedidoId,
        conferenteId,
        pedido100: pedido100 === 'sim',
        inconsistencia: inconsistencia === 'sim',
        motivosInconsistencia: inconsistencia === 'sim' ? motivosInconsistencia : [],
        observacoes: observacoes || null
      },
      include: {
        pedido: true,
        conferente: {
          select: {
            id: true,
            nome: true,
            email: true,
            tipo: true
          }
        },
        separador: {
          select: {
            id: true,
            nome: true,
            tipo: true
          }
        }
      }
    });

    // Atualizar pontuação do conferente (gamificação)
    try {
      const pedidoCorreto = pedido100 === 'sim' && inconsistencia !== 'sim';
      const acaoConferente = pedidoCorreto ? 'PEDIDO_CORRETO' : 'PEDIDO_INCORRETO';
      
      // Atualizar pontos do conferente
      await atualizarPontuacaoUsuario(conferenteId, acaoConferente, pedidoId, `Conferência de pedido ${pedidoCorreto ? 'correto' : 'incorreto'}`);
      
      // Se há separador e o pedido foi conferido como incorreto, penalizar o separador
      if (conferencia.separador && !pedidoCorreto) {
        await atualizarPontuacaoUsuario(conferencia.separador.id, 'PEDIDO_INCORRETO', pedidoId, 'Pedido separado incorretamente (detectado na conferência)');
      }
      // Se há separador e o pedido foi conferido como correto, bonificar o separador
      else if (conferencia.separador && pedidoCorreto) {
        await atualizarPontuacaoUsuario(conferencia.separador.id, 'PEDIDO_CORRETO', pedidoId, 'Pedido separado corretamente');
      }
    } catch (gamificationError) {
      console.error('Erro ao atualizar pontuação:', gamificationError);
      // Não falhar a operação principal por erro na gamificação
    }

    // Atualizar o pedido para vincular à conferência
    await prisma.pedido.update({
      where: { id: pedidoId },
      data: {
        conferido: {
          connect: { id: conferencia.id }
        }
      }
    });

    // Se o pedido estiver vinculado a um controle, marcar como conferido
    if (pedido.controle && pedido.controleId && typeof pedido.controleId === 'string') {
      await prisma.controleCarga.update({
        where: { id: pedido.controleId },
        data: {
          // Atualizar apenas campos que existem no modelo ControleCarga
          observacao: `Conferência realizada em ${new Date().toISOString()}`
        }
      });
    }

    res.status(200).json({
      success: true,
      data: conferencia,
      message: 'Conferência registrada com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao registrar conferência:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao registrar conferência',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export default withAuth(handler);
