import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

const getString = (value: string | string[] | undefined) => {
  if (!value) return undefined;
  return Array.isArray(value) ? value[0] : value;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const dataInicio = getString(req.query.dataInicio);
    const dataFim = getString(req.query.dataFim);
    const transportadora = getString(req.query.transportadora);
    const motorista = getString(req.query.motorista);

    const whereControles: any = {};
    if (dataInicio && dataFim) {
      whereControles.dataCriacao = {
        gte: new Date(`${dataInicio}T00:00:00.000Z`),
        lte: new Date(`${dataFim}T23:59:59.999Z`)
      };
    }
    if (transportadora) {
      whereControles.transportadora = transportadora;
    }
    if (motorista) {
      whereControles.motorista = {
        contains: motorista,
        mode: 'insensitive'
      };
    }

    const controles = await prisma.controleCarga.findMany({
      where: whereControles,
      select: {
        motorista: true,
        transportadora: true,
        qtdPalletsLevados: true,
        qtdPalletsDevolvidos: true
      }
    });

    let ajustes: Array<{
      motorista: string | null;
      transportadora: string | null;
      quantidade: number;
    }> = [];

    try {
      const whereAjustes: any = {};
      if (dataInicio && dataFim) {
        whereAjustes.dataRecebimento = {
          gte: new Date(`${dataInicio}T00:00:00.000Z`),
          lte: new Date(`${dataFim}T23:59:59.999Z`)
        };
      }
      if (transportadora) {
        whereAjustes.transportadora = transportadora;
      }
      if (motorista) {
        whereAjustes.motorista = {
          contains: motorista,
          mode: 'insensitive'
        };
      }

      ajustes = await prisma.palletAjuste.findMany({
        where: whereAjustes,
        select: {
          motorista: true,
          transportadora: true,
          quantidade: true
        }
      });
    } catch (error) {
      ajustes = [];
    }

    const dadosMap = new Map<string, any>();
    const resumoTransportadorasMap = new Map<string, { transportadora: string; totalPalletsLevados: number; totalPalletsDevolvidos: number; totalPalletsLiquido: number; totalControles: number; motoristas: Set<string> }>();

    controles.forEach((controle) => {
      const key = `${controle.motorista}||${controle.transportadora}`;
      const atual = dadosMap.get(key) || {
        motorista: controle.motorista,
        transportadora: controle.transportadora,
        totalPalletsLevados: 0,
        totalPalletsDevolvidos: 0,
        totalPalletsLiquido: 0,
        totalControles: 0
      };

      atual.totalPalletsLevados += controle.qtdPalletsLevados || 0;
      atual.totalPalletsDevolvidos += controle.qtdPalletsDevolvidos || 0;
      atual.totalControles += 1;
      atual.totalPalletsLiquido = atual.totalPalletsDevolvidos - atual.totalPalletsLevados;
      dadosMap.set(key, atual);
    });

    ajustes.forEach((ajuste) => {
      const motoristaNome = ajuste.motorista || 'Não informado';
      const transportadoraNome = ajuste.transportadora || 'Não informada';
      const key = `${motoristaNome}||${transportadoraNome}`;
      const atual = dadosMap.get(key) || {
        motorista: motoristaNome,
        transportadora: transportadoraNome,
        totalPalletsLevados: 0,
        totalPalletsDevolvidos: 0,
        totalPalletsLiquido: 0,
        totalControles: 0
      };

      atual.totalPalletsDevolvidos += ajuste.quantidade || 0;
      atual.totalPalletsLiquido = atual.totalPalletsDevolvidos - atual.totalPalletsLevados;
      dadosMap.set(key, atual);
    });

    const dados = Array.from(dadosMap.values()).sort((a, b) => a.motorista.localeCompare(b.motorista));

    dados.forEach((item) => {
      const resumo = resumoTransportadorasMap.get(item.transportadora) || {
        transportadora: item.transportadora,
        totalPalletsLevados: 0,
        totalPalletsDevolvidos: 0,
        totalPalletsLiquido: 0,
        totalControles: 0,
        motoristas: new Set<string>()
      };

      resumo.totalPalletsLevados += item.totalPalletsLevados;
      resumo.totalPalletsDevolvidos += item.totalPalletsDevolvidos;
      resumo.totalPalletsLiquido += item.totalPalletsLiquido;
      resumo.totalControles += item.totalControles;
      resumo.motoristas.add(item.motorista);
      resumoTransportadorasMap.set(item.transportadora, resumo);
    });

    const resumoTransportadoras = Array.from(resumoTransportadorasMap.values()).map((resumo) => ({
      transportadora: resumo.transportadora,
      totalPalletsLevados: resumo.totalPalletsLevados,
      totalPalletsDevolvidos: resumo.totalPalletsDevolvidos,
      totalPalletsLiquido: resumo.totalPalletsLiquido,
      totalControles: resumo.totalControles,
      totalMotoristas: resumo.motoristas.size
    }));

    return res.status(200).json({ dados, resumoTransportadoras });
  } catch (error) {
    console.error('Erro ao buscar relatório de pallets:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
