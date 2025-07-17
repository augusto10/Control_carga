import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { conferidas } = req.query;
      const where: any = {};

      if (conferidas === 'true') {
        where.conferido = {
          conferenciaRealizada: true
        };
      } else {
        // Por padrão, lista apenas os não conferidos
        where.conferido = {
          conferenciaRealizada: false
        };
      }

      const pedidos = await prisma.pedido.findMany({
        where,
        include: {
          controle: true,
          conferido: {
            include: {
              separador: true,
              conferente: true,
              auditor: true,
            },
          },
        },
        orderBy: {
          dataCriacao: 'desc',
        },
      });

      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      res.status(200).json(pedidos);
    } catch (error) {
      console.error('Erro ao listar pedidos:', error);
      res.status(500).json({ error: 'Erro ao listar pedidos' });
    }
  } else if (req.method === 'POST') {
    try {
      const { numeroPedido, separadorId, auditorId } = req.body;

      if (!numeroPedido || !separadorId || !auditorId) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios: Nº do Pedido, Separador e Auditor.' });
      }

      const resultado = await prisma.$transaction(async (tx) => {
        const novoControle = await tx.controleCarga.create({
          data: {
            numeroManifesto: `M-PED-${Date.now()}`,
            motorista: 'A Definir',
            responsavel: 'A Definir',
          },
        });

        const novoPedido = await tx.pedido.create({
          data: {
            numeroPedido,
            controleId: novoControle.id,
          },
        });

        // Criar PedidoConferido com separadorId e auditorId
        await tx.pedidoConferido.create({
          data: {
            pedidoId: novoPedido.id,
            separadorId: separadorId,
            auditorId: auditorId,
          },
        });

        return novoPedido;
      });

      res.status(201).json(resultado);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      res.status(500).json({ error: 'Erro ao salvar pedido' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
