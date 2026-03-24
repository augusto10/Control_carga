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
    const status = getString(req.query.status);

    const where: any = {};

    if (dataInicio && dataFim) {
      where.dataCriacao = {
        gte: new Date(`${dataInicio}T00:00:00.000Z`),
        lte: new Date(`${dataFim}T23:59:59.999Z`)
      };
    }

    if (transportadora) {
      where.transportadora = transportadora;
    }

    if (motorista) {
      where.motorista = {
        contains: motorista,
        mode: 'insensitive'
      };
    }

    if (status === 'FINALIZADO') {
      where.finalizado = true;
    } else if (status === 'PENDENTE') {
      where.finalizado = false;
    }

    const controles = await prisma.controleCarga.findMany({
      where,
      include: { notas: true },
      orderBy: { dataCriacao: 'desc' }
    });

    const resumoTransportadorasMap = new Map<string, any>();
    const resumoMotoristasMap = new Map<string, any>();
    const timelineMap = new Map<string, number>();
    const statusContadores = { FINALIZADO: 0, PENDENTE: 0 };

    let totalPalletsLevados = 0;
    let totalPalletsDevolvidos = 0;
    let totalNotas = 0;

    const controlesDetalhados = controles.map((controle) => {
      const notasCount = controle.notas?.length || 0;
      const palletsLevados = controle.qtdPalletsLevados || 0;
      const palletsDevolvidos = controle.qtdPalletsDevolvidos || 0;
      const diferencaPallets = palletsDevolvidos - palletsLevados;
      const statusValue = controle.finalizado ? 'FINALIZADO' : 'PENDENTE';
      const assinados = Boolean(controle.assinaturaMotorista) && Boolean(controle.assinaturaResponsavel);

      totalPalletsLevados += palletsLevados;
      totalPalletsDevolvidos += palletsDevolvidos;
      totalNotas += notasCount;
      statusContadores[statusValue] += 1;

      const dataLabel = controle.dataCriacao.toISOString().slice(0, 10);
      timelineMap.set(dataLabel, (timelineMap.get(dataLabel) || 0) + 1);

      const resumoKey = controle.transportadora;
      const resumoAtual = resumoTransportadorasMap.get(resumoKey) || {
        transportadora: controle.transportadora,
        totalControles: 0,
        totalPalletsLevados: 0,
        totalPalletsDevolvidos: 0,
        diferencaPallets: 0,
        totalNotas: 0,
        controlesAssinados: 0
      };

      resumoAtual.totalControles += 1;
      resumoAtual.totalPalletsLevados += palletsLevados;
      resumoAtual.totalPalletsDevolvidos += palletsDevolvidos;
      resumoAtual.diferencaPallets += diferencaPallets;
      resumoAtual.totalNotas += notasCount;
      resumoAtual.controlesAssinados += assinados ? 1 : 0;
      resumoTransportadorasMap.set(resumoKey, resumoAtual);

      const motoristaKey = `${controle.motorista}||${controle.transportadora}`;
      const resumoMotoristaAtual = resumoMotoristasMap.get(motoristaKey) || {
        motorista: controle.motorista,
        transportadora: controle.transportadora,
        totalControles: 0,
        totalPalletsLevados: 0,
        totalPalletsDevolvidos: 0,
        diferencaPallets: 0,
        totalNotas: 0,
        controlesAssinados: 0
      };
      resumoMotoristaAtual.totalControles += 1;
      resumoMotoristaAtual.totalPalletsLevados += palletsLevados;
      resumoMotoristaAtual.totalPalletsDevolvidos += palletsDevolvidos;
      resumoMotoristaAtual.diferencaPallets += diferencaPallets;
      resumoMotoristaAtual.totalNotas += notasCount;
      resumoMotoristaAtual.controlesAssinados += assinados ? 1 : 0;
      resumoMotoristasMap.set(motoristaKey, resumoMotoristaAtual);

      return {
        id: controle.id,
        motorista: controle.motorista,
        transportadora: controle.transportadora,
        qtdPalletsLevados: palletsLevados,
        qtdPalletsDevolvidos: palletsDevolvidos,
        diferencaPallets,
        totalNotas: notasCount,
        dataCriacao: controle.dataCriacao.toISOString(),
        status: statusValue,
        assinaturaMotorista: Boolean(controle.assinaturaMotorista),
        assinaturaResponsavel: Boolean(controle.assinaturaResponsavel)
      };
    });

    const resumoTransportadoras = Array.from(resumoTransportadorasMap.values()).map((resumo) => ({
      ...resumo,
      percentualAssinados: resumo.totalControles
        ? Math.round((resumo.controlesAssinados / resumo.totalControles) * 100)
        : 0
    }));

    const resumoMotoristas = Array.from(resumoMotoristasMap.values());
    const timelineLabels = Array.from(timelineMap.keys()).sort();
    const timelineValues = timelineLabels.map((label) => timelineMap.get(label) || 0);

    const dadosGrafico = {
      transportadoras: {
        labels: resumoTransportadoras.map((r) => r.transportadora),
        controles: resumoTransportadoras.map((r) => r.totalControles),
        pallets: resumoTransportadoras.map((r) => r.totalPalletsLevados)
      },
      timeline: {
        labels: timelineLabels,
        controles: timelineValues
      },
      status: {
        labels: ['Finalizado', 'Pendente'],
        valores: [statusContadores.FINALIZADO, statusContadores.PENDENTE]
      }
    };

    return res.status(200).json({
      controles: controlesDetalhados,
      resumoTransportadoras,
      resumoMotoristas,
      dadosGrafico,
      totais: {
        totalControles: controles.length,
        controlesFinalizados: statusContadores.FINALIZADO,
        controlesPendentes: statusContadores.PENDENTE,
        totalPalletsLevados,
        totalPalletsDevolvidos,
        totalNotas
      }
    });
  } catch (error) {
    console.error('Erro ao buscar relatório de controles:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
