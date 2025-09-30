import { NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withAuth, AuthenticatedRequest } from '../../../lib/middleware/withAuth';
import { Prisma } from '@prisma/client';

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { start, end } = req.query as { start?: string; end?: string };
    const where: Prisma.ControleCargaWhereInput = {};

    if (start || end) {
      let dataCriacao: Prisma.DateTimeFilter = {};
      if (start) dataCriacao = { ...dataCriacao, gte: new Date(start + 'T00:00:00.000Z') };
      if (end) {
        dataCriacao = { ...dataCriacao, lte: new Date(end + 'T23:59:59.999Z') };
      }
      where.dataCriacao = dataCriacao;
    }

    // Busca controles e agrega em memória para evitar conflitos de tipos do groupBy
    const controlesRaw = await prisma.controleCarga.findMany({
      where,
      orderBy: { dataCriacao: 'desc' },
      select: {
        motorista: true,
        cpfMotorista: true,
        // Não selecionar campos novos ausentes no banco (qtdPalletsLevados, qtdPalletsDevolvidos, placaVeiculo)
      },
    });

    type ControleLite = {
      motorista: string;
      cpfMotorista: string | null;
      qtdPalletsLevados?: number | null;
      qtdPalletsDevolvidos?: number | null;
    };
    const controles = controlesRaw as unknown as ControleLite[];

    type Row = {
      motorista: string;
      cpfMotorista: string | null;
      qtdPalletsLevados: number;
      qtdPalletsDevolvidos: number;
      diferenca: number;
      totalControles: number;
    };

    const map = new Map<string, Row>();
    for (const c of controles) {
      const key = `${c.motorista}__${c.cpfMotorista ?? ''}`;
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          motorista: c.motorista,
          cpfMotorista: c.cpfMotorista ?? null,
          qtdPalletsLevados: (c.qtdPalletsLevados ?? 0) || 0,
          qtdPalletsDevolvidos: (c.qtdPalletsDevolvidos ?? 0) || 0,
          diferenca: ((c.qtdPalletsLevados ?? 0) || 0) - ((c.qtdPalletsDevolvidos ?? 0) || 0),
          totalControles: 1,
        });
      } else {
        const novosLev = (current.qtdPalletsLevados || 0) + ((c.qtdPalletsLevados ?? 0) || 0);
        const novosDev = (current.qtdPalletsDevolvidos || 0) + ((c.qtdPalletsDevolvidos ?? 0) || 0);
        current.qtdPalletsLevados = novosLev;
        current.qtdPalletsDevolvidos = novosDev;
        current.diferenca = novosLev - novosDev;
        current.totalControles += 1;
      }
    }

    const result = Array.from(map.values()).sort((a, b) => {
      if (b.qtdPalletsLevados !== a.qtdPalletsLevados) return b.qtdPalletsLevados - a.qtdPalletsLevados;
      return a.motorista.localeCompare(b.motorista);
    });

    return res.status(200).json({
      period: { start: start || null, end: end || null },
      totalMotoristas: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Erro ao gerar relatório de pallets por motorista:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export default withAuth(handler);
