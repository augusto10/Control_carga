import { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
  }

  const isAdmin = ['ADMIN', 'GERENTE'].includes(req.user.tipo);
  if (!isAdmin) {
    return res.status(403).json({ error: 'Acesso negado' });
  }

  try {
    const solicitacao = await prisma.solicitacaoMaterial.findUnique({
      where: { id },
      include: {
        itens: {
          include: {
            material: true
          }
        }
      }
    });

    if (!solicitacao) {
      return res.status(404).json({ error: 'Solicitação não encontrada' });
    }

    if (solicitacao.status !== 'PENDENTE') {
      return res.status(400).json({ error: 'Solicitação já foi processada' });
    }

    const itensAprovados = Array.isArray(req.body?.itensAprovados) ? req.body.itensAprovados : [];
    const aprovadosMap = new Map(
      itensAprovados.map((item: any) => [String(item.itemId || '').trim(), Number(item.quantidadeAprovada || 0)])
    );

    const itensProcessados = solicitacao.itens.map((item) => {
      const quantidadeAprovada = aprovadosMap.has(item.id) ? aprovadosMap.get(item.id) : item.quantidade;
      return {
        item,
        quantidadeAprovada: Number(quantidadeAprovada || 0)
      };
    });

    if (itensProcessados.some((i) => i.quantidadeAprovada < 0 || i.quantidadeAprovada > i.item.quantidade)) {
      return res.status(400).json({ error: 'Quantidade aprovada inválida' });
    }

    if (itensProcessados.some((i) => i.item.material.quantidadeEstoque < i.quantidadeAprovada)) {
      return res.status(400).json({ error: 'Estoque insuficiente para aprovação' });
    }

    const operations = itensProcessados.flatMap((processado) => {
      const quantidadeAntes = processado.item.material.quantidadeEstoque;
      const quantidadeDepois = quantidadeAntes - processado.quantidadeAprovada;

      return [
        prisma.itemSolicitacaoMaterial.update({
          where: { id: processado.item.id },
          data: {
            quantidadeAprovada: processado.quantidadeAprovada
          }
        }),
        prisma.materialEstoque.update({
          where: { id: processado.item.materialId },
          data: {
            quantidadeEstoque: {
              decrement: processado.quantidadeAprovada
            }
          }
        }),
        prisma.historicoEstoque.create({
          data: {
            materialId: processado.item.materialId,
            tipo: 'SAIDA',
            quantidade: processado.quantidadeAprovada,
            quantidadeAntes,
            quantidadeDepois,
            usuarioId: req.user.id,
            observacao: `Solicitação ${solicitacao.id}`,
            solicitacaoId: solicitacao.id
          }
        })
      ];
    });

    operations.push(
      prisma.solicitacaoMaterial.update({
        where: { id: solicitacao.id },
        data: {
          status: 'APROVADA',
          dataAprovacao: new Date(),
          aprovadorId: req.user.id
        }
      })
    );

    await prisma.$transaction(operations);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

export default withAuth(handler);
