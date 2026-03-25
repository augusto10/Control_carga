import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { Transportadora } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { start, end, transportadora, notaFiscal, motorista, responsavel, limit } = req.query;

      const where: any = {};

      if (start && end) {
        where.dataCriacao = {
          gte: new Date(`${start}T00:00:00.000Z`),
          lte: new Date(`${end}T23:59:59.999Z`),
        };
      }

      if (transportadora && transportadora !== 'all') {
        where.transportadora = transportadora as Transportadora;
      }

      if (notaFiscal) {
        where.notas = {
          some: {
            numeroNota: {
              contains: String(notaFiscal),
              mode: 'insensitive',
            },
          },
        };
      }

      if (motorista) {
        where.motorista = {
          contains: String(motorista),
          mode: 'insensitive',
        };
      }

      if (responsavel) {
        where.responsavel = {
          contains: String(responsavel),
          mode: 'insensitive',
        };
      }

      const controles = await prisma.controleCarga.findMany({
        where,
        include: {
          notas: true,
        },
        orderBy: {
          dataCriacao: 'desc',
        },
        take: limit ? Number(limit) : undefined,
      });

      return res.status(200).json(controles);
    } catch (error) {
      console.error('Erro ao buscar controles:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        motorista,
        responsavel,
        transportadora,
        numeroManifesto,
        qtdPallets,
        observacao,
        cpfMotorista,
        placaVeiculo,
        qtdPalletsLevados,
        qtdPalletsDevolvidos,
        notasIds
      } = req.body;

      // Geração de número sequencial se não fornecido
      let numeroFinal = numeroManifesto;
      if (!numeroFinal) {
        const count = await prisma.controleCarga.count();
        numeroFinal = (count + 1).toString();
      }

      const controle = await prisma.controleCarga.create({
        data: {
          motorista,
          responsavel,
          transportadora: transportadora as Transportadora,
          numeroManifesto: numeroFinal,
          qtdPallets: Number(qtdPallets) || 0,
          observacao,
          cpfMotorista,
          placaVeiculo,
          qtdPalletsLevados: Number(qtdPalletsLevados) || 0,
          qtdPalletsDevolvidos: Number(qtdPalletsDevolvidos) || 0,
          notas: notasIds && Array.isArray(notasIds) && notasIds.length > 0 ? {
            connect: notasIds.map((id: string) => ({ id }))
          } : undefined
        },
        include: {
          notas: true
        }
      });

      return res.status(201).json(controle);
    } catch (error) {
      console.error('Erro ao criar controle:', error);
      return res.status(500).json({ message: 'Erro ao criar controle' });
    }
  } else {
    return res.status(405).json({ message: 'Method not allowed' });
  }
}
