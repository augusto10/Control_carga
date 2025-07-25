import { PrismaClient, AcaoPontuacao } from '@prisma/client';
import type { Prisma } from '@prisma/client';

interface RegistrarPontuacaoParams {
  usuarioId: string;
  pontos: number;
  acao: AcaoPontuacao;
  pedidoId?: string;
  descricao?: string;
}

/**
 * Registra a pontuação para um usuário, atualiza o total e o histórico.
 * Esta função foi projetada para ser usada dentro de uma transação Prisma.
 * @param tx - O cliente de transação do Prisma.
 * @param params - Os parâmetros para registrar a pontuação.
 */
export async function registrarPontuacao(
  tx: Prisma.TransactionClient,
  params: RegistrarPontuacaoParams
) {
  const { usuarioId, pontos, acao, pedidoId, descricao } = params;

  // 1. Encontra ou cria a pontuação do usuário
  let pontuacaoUsuario = await tx.pontuacaoUsuario.findUnique({
    where: { usuarioId },
  });

  if (!pontuacaoUsuario) {
    pontuacaoUsuario = await tx.pontuacaoUsuario.create({
      data: {
        usuarioId,
        pontuacaoTotal: 0,
        pedidosCorretos: 0,
        pedidosIncorretos: 0,
      },
    });
  }

  // 2. Atualiza a pontuação total e contadores
  const updatedData: Prisma.PontuacaoUsuarioUpdateInput = {
    pontuacaoTotal: {
      increment: pontos,
    },
  };

  if (acao === 'PEDIDO_CORRETO') {
    updatedData.pedidosCorretos = {
      increment: 1,
    };
  } else if (acao === 'PEDIDO_INCORRETO') {
    updatedData.pedidosIncorretos = {
      increment: 1,
    };
  }

  await tx.pontuacaoUsuario.update({
    where: { usuarioId },
    data: updatedData,
  });

  // 3. Cria o registro no histórico
  await tx.historicoPontuacao.create({
    data: {
      usuarioId,
      pedidoId,
      acao,
      pontosGanhos: pontos,
      descricao,
    },
  });

  // 4. Recalcula o ranking (pode ser otimizado para rodar em background no futuro)
  const todosUsuarios = await tx.pontuacaoUsuario.findMany({
    orderBy: [
      { pontuacaoTotal: 'desc' },
      { pedidosCorretos: 'desc' },
      { pedidosIncorretos: 'asc' },
    ],
  });

  for (let i = 0; i < todosUsuarios.length; i++) {
    await tx.pontuacaoUsuario.update({
      where: { id: todosUsuarios[i].id },
      data: { posicaoRanking: i + 1 },
    });
  }

  return pontuacaoUsuario;
}
