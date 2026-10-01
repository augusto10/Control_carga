import { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const minhasParam = req.query.minhas;
      const statusParam = req.query.status;

      const where: any = {};
      if (typeof minhasParam === 'string' && minhasParam.toLowerCase() === 'true') {
        where.solicitanteId = req.user.id;
      }
      if (typeof statusParam === 'string' && statusParam.trim().length > 0) {
        where.status = statusParam;
      }

      const solicitacoes = await prisma.solicitacaoMaterial.findMany({
        where,
        include: {
          itens: {
            include: {
              material: true
            }
          },
          aprovador: {
            select: {
              nome: true
            }
          },
          solicitante: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          }
        },
        orderBy: {
          dataCriacao: 'desc'
        }
      });

      return res.status(200).json(solicitacoes);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const itensBody = Array.isArray(req.body?.itens) ? req.body.itens : [];
      const observacao = typeof req.body?.observacao === 'string' ? req.body.observacao.trim() : '';

      if (itensBody.length === 0) {
        return res.status(400).json({ error: 'Informe os itens da solicitação' });
      }

      const itens = itensBody.map((item: any) => ({
        materialId: String(item.materialId || '').trim(),
        quantidade: Number(item.quantidade || 0),
        observacao: item.observacao ? String(item.observacao).trim() : null
      }));

      if (itens.some((item) => !item.materialId || item.quantidade <= 0)) {
        return res.status(400).json({ error: 'Itens inválidos na solicitação' });
      }

      const materiais = await prisma.materialEstoque.findMany({
        where: {
          id: { in: itens.map((item) => item.materialId) },
          ativo: true
        }
      });

      if (materiais.length !== itens.length) {
        return res.status(400).json({ error: 'Um ou mais materiais são inválidos' });
      }

      const solicitacao = await prisma.solicitacaoMaterial.create({
        data: {
          solicitanteId: req.user.id,
          observacao: observacao || undefined,
          status: 'PENDENTE',
          itens: {
            create: itens.map((item) => ({
              materialId: item.materialId,
              quantidade: item.quantidade,
              observacao: item.observacao || undefined
            }))
          }
        },
        include: {
          itens: {
            include: {
              material: true
            }
          },
          aprovador: {
            select: {
              nome: true
            }
          },
          solicitante: {
            select: {
              id: true,
              nome: true,
              email: true
            }
          }
        }
      });

      return res.status(201).json(solicitacao);
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

export default withAuth(handler);
