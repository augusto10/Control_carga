import { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

const getString = (value: string | string[] | undefined) => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

const parseDateRange = (dataInicio?: string, dataFim?: string) => {
  if (!dataInicio || !dataFim) return undefined;
  return {
    gte: new Date(`${dataInicio}T00:00:00.000Z`),
    lte: new Date(`${dataFim}T23:59:59.999Z`),
  };
};

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method === 'GET') {
    try {
      const dataInicio = getString(req.query.dataInicio);
      const dataFim = getString(req.query.dataFim);
      const motorista = getString(req.query.motorista);
      const status = getString(req.query.status);
      const where: any = {
        freteInformado: true,
      };
      const pagamentoWhere: any = {};

      const dataRange = parseDateRange(dataInicio, dataFim);
      if (dataRange) {
        where.dataCriacao = dataRange;
        pagamentoWhere.dataPagamento = dataRange;
      }

      if (motorista) {
        where.motorista = {
          contains: motorista,
          mode: 'insensitive',
        };
        pagamentoWhere.controles = {
          some: {
            controle: {
              motorista: {
                contains: motorista,
                mode: 'insensitive',
              },
            },
          },
        };
      }

      if (status === 'PAGO') {
        where.fretePago = true;
      } else if (status === 'PENDENTE') {
        where.fretePago = false;
      }

      const controles = await prisma.controleCarga.findMany({
        where,
        orderBy: { dataCriacao: 'desc' },
        select: {
          id: true,
          motorista: true,
          transportadora: true,
          dataCriacao: true,
          freteInformado: true,
          valorFrete: true,
          fretePago: true,
          fretePagoEm: true,
          fretePagamentoId: true,
        },
      });

      const totalPlanejado = controles.reduce((acc, controle) => acc + Number(controle.valorFrete || 0), 0);
      const totalPago = controles
        .filter((controle) => controle.fretePago)
        .reduce((acc, controle) => acc + Number(controle.valorFrete || 0), 0);
      const totalPendente = controles
        .filter((controle) => !controle.fretePago)
        .reduce((acc, controle) => acc + Number(controle.valorFrete || 0), 0);

      const pagamentos = await prisma.fretePagamento.findMany({
        where: pagamentoWhere,
        orderBy: { dataPagamento: 'desc' },
        include: {
          controles: {
            include: {
              controle: {
                select: {
                  id: true,
                  motorista: true,
                  transportadora: true,
                  dataCriacao: true,
                  valorFrete: true,
                  fretePagoEm: true,
                },
              },
            },
          },
          criadoPorUser: {
            select: {
              id: true,
              nome: true,
              email: true,
            },
          },
        },
      });

      return res.status(200).json({
        controles,
        carteira: {
          totalPlanejado,
          totalPago,
          totalPendente,
          totalControles: controles.length,
          totalPagos: controles.filter((controle) => controle.fretePago).length,
          totalPendentes: controles.filter((controle) => !controle.fretePago).length,
        },
        pagamentos,
      });
    } catch (error) {
      console.error('Erro ao listar pagamentos de frete:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { controleIds, comprovanteBase64, observacao, dataPagamento } = req.body || {};

      if (!Array.isArray(controleIds) || controleIds.length === 0) {
        return res.status(400).json({ message: 'Selecione ao menos um controle.' });
      }

      const idsUnicos = Array.from(new Set(controleIds.filter((id: unknown) => typeof id === 'string')));
      if (idsUnicos.length === 0) {
        return res.status(400).json({ message: 'Selecione ao menos um controle válido.' });
      }

      const controles = await prisma.controleCarga.findMany({
        where: { id: { in: idsUnicos } },
        select: {
          id: true,
          motorista: true,
          transportadora: true,
          valorFrete: true,
          freteInformado: true,
          fretePago: true,
        },
      });

      if (controles.length !== idsUnicos.length) {
        return res.status(400).json({ message: 'Algum controle selecionado não foi encontrado.' });
      }

      const incompativeis = controles.filter((controle) => !controle.freteInformado || controle.fretePago);
      if (incompativeis.length > 0) {
        return res.status(400).json({
          message: 'Somente controles com frete informado e ainda não pago podem ser incluídos.',
          controlesInvalidos: incompativeis.map((controle) => controle.id),
        });
      }

      const valorTotal = controles.reduce((acc, controle) => acc + Number(controle.valorFrete || 0), 0);

      const comprovante =
        typeof comprovanteBase64 === 'string' && comprovanteBase64.startsWith('data:')
          ? comprovanteBase64
          : null;

      const pagamento = await prisma.$transaction(async (tx) => {
        const created = await tx.fretePagamento.create({
          data: {
            valorTotal,
            comprovante,
            observacao: typeof observacao === 'string' ? observacao : undefined,
            dataPagamento: dataPagamento ? new Date(dataPagamento) : new Date(),
            criadoPor: req.user.id,
          },
        });

        for (const controle of controles) {
          await tx.fretePagamentoControle.create({
            data: {
              fretePagamentoId: created.id,
              controleId: controle.id,
              valorFrete: Number(controle.valorFrete || 0),
            },
          });

          await tx.controleCarga.update({
            where: { id: controle.id },
            data: {
              fretePago: true,
              fretePagoEm: dataPagamento ? new Date(dataPagamento) : new Date(),
              fretePagamentoId: created.id,
            },
          });
        }

        return created;
      });

      return res.status(201).json({
        message: 'Pagamento de frete registrado com sucesso.',
        pagamento,
      });
    } catch (error) {
      console.error('Erro ao registrar pagamento de frete:', error);
      return res.status(500).json({ message: 'Erro ao registrar pagamento de frete' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

export default withAuth(handler);
