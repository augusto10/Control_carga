import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

interface RelatorioControle {
  id: string;
  motorista: string;
  transportadora: string;
  qtdPalletsLevados: number;
  qtdPalletsDevolvidos: number;
  diferencaPallets: number;
  totalNotas: number;
  dataCriacao: string;
  status: string;
  assinaturaMotorista: boolean;
  assinaturaResponsavel: boolean;
}

interface ResumoTransportadora {
  transportadora: string;
  totalControles: number;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  diferencaPallets: number;
  totalNotas: number;
  controlesAssinados: number;
  percentualAssinados: number;
}

interface ResumoMotorista {
  motorista: string;
  transportadora: string;
  totalControles: number;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  diferencaPallets: number;
  totalNotas: number;
  controlesAssinados: number;
}

interface DadosGrafico {
  transportadoras: {
    labels: string[];
    controles: number[];
    pallets: number[];
  };
  timeline: {
    labels: string[];
    controles: number[];
  };
  status: {
    labels: string[];
    valores: number[];
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // Verificar autenticação
  const token = getTokenFromCookies(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const decoded = await verifyToken(token, JWT_SECRET);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const { dataInicio, dataFim, transportadora, motorista, status } = req.query;

    // Construir filtros
    const filtros: any = {};

    if (dataInicio) {
      // Criar data de início em UTC (00:00:00.000Z)
      const dataInicioDate = new Date(dataInicio as string + 'T00:00:00.000Z');
      filtros.dataCriacao = {
        ...filtros.dataCriacao,
        gte: dataInicioDate
      };
    }

    if (dataFim) {
      // Criar data de fim em UTC (23:59:59.999Z)
      const dataFimDate = new Date(dataFim as string + 'T23:59:59.999Z');
      filtros.dataCriacao = {
        ...filtros.dataCriacao,
        lte: dataFimDate
      };
    }

    if (transportadora && transportadora !== 'TODAS') {
      filtros.transportadora = transportadora;
    }

    if (motorista) {
      filtros.motorista = {
        contains: motorista as string,
        mode: 'insensitive'
      };
    }

    if (status && status !== 'TODOS') {
      if (status === 'FINALIZADO') {
        filtros.finalizado = true;
      } else if (status === 'PENDENTE') {
        filtros.finalizado = false;
      }
    }

    console.log('Filtros aplicados:', filtros);

    // Buscar controles com notas relacionadas
    const controles = await prisma.controleCarga.findMany({
      where: filtros,
      include: {
        notas: {
          select: {
            id: true
          }
        }
      },
      orderBy: {
        dataCriacao: 'desc'
      }
    });

    // Buscar ajustes de pallets no mesmo período
    const whereAjustes: any = {};
    if (filtros.dataCriacao?.gte || filtros.dataCriacao?.lte) {
      whereAjustes.dataRecebimento = {
        ...(filtros.dataCriacao?.gte ? { gte: filtros.dataCriacao.gte } : {}),
        ...(filtros.dataCriacao?.lte ? { lte: filtros.dataCriacao.lte } : {}),
      };
    }
    if (filtros.transportadora) {
      whereAjustes.transportadora = filtros.transportadora;
    }
    if (filtros.motorista) {
      whereAjustes.motorista = filtros.motorista;
    }

    type AjusteRow = { motorista: string | null; transportadora: string | null; quantidade: number; dataRecebimento: Date };
    let ajustes: AjusteRow[] = [];
    try {
      ajustes = await (prisma as any).palletAjuste.findMany({
        where: whereAjustes,
        select: {
          motorista: true,
          transportadora: true,
          quantidade: true,
          dataRecebimento: true,
        },
      });
    } catch (e: any) {
      console.warn('Ajustes de pallets indisponíveis (tabela ausente). Prosseguindo sem somar ajustes.');
    }

    console.log(`Encontrados ${controles.length} controles`);

    // Processar dados para o relatório
    const dadosRelatorio: RelatorioControle[] = controles.map(controle => {
      // Verificar se o motorista é VLOG e corrigir a transportadora na exibição
      let transportadoraParaExibir = controle.transportadora;
      if (controle.motorista && controle.motorista.toLowerCase().includes('vlog')) {
        transportadoraParaExibir = 'VLOG';
      }
      
      return {
        id: controle.id,
        motorista: controle.motorista,
        transportadora: transportadoraParaExibir,
        qtdPalletsLevados: controle.qtdPalletsLevados || 0,
        qtdPalletsDevolvidos: controle.qtdPalletsDevolvidos || 0,
        diferencaPallets: (controle.qtdPalletsLevados || 0) - (controle.qtdPalletsDevolvidos || 0),
        totalNotas: controle.notas.length,
        dataCriacao: controle.dataCriacao.toISOString().split('T')[0],
        status: controle.finalizado ? 'FINALIZADO' : 'PENDENTE',
        assinaturaMotorista: !!controle.assinaturaMotorista,
        assinaturaResponsavel: !!controle.assinaturaResponsavel
      };
    });

    // Aplicar ajustes de pallets aos controles
    const controlesPorChave = new Map<string, RelatorioControle>();
    dadosRelatorio.forEach(controle => {
      const chave = `${controle.motorista}|${controle.transportadora}`;
      controlesPorChave.set(chave, controle);
    });

    // Somar ajustes aos pallets devolvidos
    ajustes.forEach((ajuste: AjusteRow) => {
      const motoristaKey = ajuste.motorista || 'DESCONHECIDO';
      // Verificar se o motorista do ajuste é VLOG para usar a transportadora correta
      let transpKey = ajuste.transportadora || 'TERCEIRIZADA';
      if (ajuste.motorista && ajuste.motorista.toLowerCase().includes('vlog')) {
        transpKey = 'VLOG';
      }
      const chave = `${motoristaKey}|${transpKey}`;
      
      const controle = controlesPorChave.get(chave);
      if (controle) {
        controle.qtdPalletsDevolvidos += ajuste.quantidade || 0;
        controle.diferencaPallets = controle.qtdPalletsLevados - controle.qtdPalletsDevolvidos;
      }
    });

    // Criar resumo por transportadora
    const resumoTransportadoraMap = new Map<string, ResumoTransportadora>();

    dadosRelatorio.forEach(item => {
      if (resumoTransportadoraMap.has(item.transportadora)) {
        const resumo = resumoTransportadoraMap.get(item.transportadora)!;
        resumo.totalControles += 1;
        resumo.totalPalletsLevados += item.qtdPalletsLevados;
        resumo.totalPalletsDevolvidos += item.qtdPalletsDevolvidos;
        resumo.diferencaPallets += item.diferencaPallets;
        resumo.totalNotas += item.totalNotas;
        if (item.assinaturaMotorista && item.assinaturaResponsavel) {
          resumo.controlesAssinados += 1;
        }
        resumo.percentualAssinados = Math.round((resumo.controlesAssinados / resumo.totalControles) * 100);
      } else {
        const controlesAssinados = (item.assinaturaMotorista && item.assinaturaResponsavel) ? 1 : 0;
        resumoTransportadoraMap.set(item.transportadora, {
          transportadora: item.transportadora,
          totalControles: 1,
          totalPalletsLevados: item.qtdPalletsLevados,
          totalPalletsDevolvidos: item.qtdPalletsDevolvidos,
          diferencaPallets: item.diferencaPallets,
          totalNotas: item.totalNotas,
          controlesAssinados,
          percentualAssinados: controlesAssinados > 0 ? 100 : 0
        });
      }
    });

    const resumoTransportadoras = Array.from(resumoTransportadoraMap.values())
      .sort((a, b) => a.transportadora.localeCompare(b.transportadora));

    // Criar resumo por motorista
    const resumoMotoristaMap = new Map<string, ResumoMotorista>();

    dadosRelatorio.forEach(item => {
      const chave = `${item.motorista}|${item.transportadora}`;
      if (resumoMotoristaMap.has(chave)) {
        const resumo = resumoMotoristaMap.get(chave)!;
        resumo.totalControles += 1;
        resumo.totalPalletsLevados += item.qtdPalletsLevados;
        resumo.totalPalletsDevolvidos += item.qtdPalletsDevolvidos;
        resumo.diferencaPallets += item.diferencaPallets;
        resumo.totalNotas += item.totalNotas;
        if (item.assinaturaMotorista && item.assinaturaResponsavel) {
          resumo.controlesAssinados += 1;
        }
      } else {
        const controlesAssinados = (item.assinaturaMotorista && item.assinaturaResponsavel) ? 1 : 0;
        resumoMotoristaMap.set(chave, {
          motorista: item.motorista,
          transportadora: item.transportadora,
          totalControles: 1,
          totalPalletsLevados: item.qtdPalletsLevados,
          totalPalletsDevolvidos: item.qtdPalletsDevolvidos,
          diferencaPallets: item.diferencaPallets,
          totalNotas: item.totalNotas,
          controlesAssinados
        });
      }
    });

    const resumoMotoristas = Array.from(resumoMotoristaMap.values())
      .sort((a, b) => {
        if (a.transportadora !== b.transportadora) {
          return a.transportadora.localeCompare(b.transportadora);
        }
        return a.motorista.localeCompare(b.motorista);
      });

    // Preparar dados para gráficos
    const dadosGrafico: DadosGrafico = {
      transportadoras: {
        labels: resumoTransportadoras.map(r => r.transportadora),
        controles: resumoTransportadoras.map(r => r.totalControles),
        pallets: resumoTransportadoras.map(r => r.diferencaPallets)
      },
      timeline: {
        labels: [],
        controles: []
      },
      status: {
        labels: ['Finalizados', 'Pendentes'],
        valores: [
          dadosRelatorio.filter(d => d.status === 'FINALIZADO').length,
          dadosRelatorio.filter(d => d.status === 'PENDENTE').length
        ]
      }
    };

    // Timeline por dia
    const timelineMap = new Map<string, number>();
    dadosRelatorio.forEach(item => {
      const data = item.dataCriacao;
      timelineMap.set(data, (timelineMap.get(data) || 0) + 1);
    });

    dadosGrafico.timeline.labels = Array.from(timelineMap.keys()).sort();
    dadosGrafico.timeline.controles = dadosGrafico.timeline.labels.map(data => timelineMap.get(data) || 0);

    console.log(`Retornando ${dadosRelatorio.length} controles`);
    console.log(`Resumo de ${resumoTransportadoras.length} transportadoras`);
    console.log(`Resumo de ${resumoMotoristas.length} motoristas`);

    return res.status(200).json({
      dados: dadosRelatorio,
      resumoTransportadoras,
      resumoMotoristas,
      dadosGrafico,
      totais: {
        totalControles: dadosRelatorio.length,
        controlesFinalizados: dadosRelatorio.filter(d => d.status === 'FINALIZADO').length,
        controlesPendentes: dadosRelatorio.filter(d => d.status === 'PENDENTE').length,
        totalPalletsLevados: dadosRelatorio.reduce((acc, d) => acc + d.qtdPalletsLevados, 0),
        totalPalletsDevolvidos: dadosRelatorio.reduce((acc, d) => acc + d.qtdPalletsDevolvidos, 0),
        totalNotas: dadosRelatorio.reduce((acc, d) => acc + d.totalNotas, 0)
      },
      periodo: {
        inicio: dataInicio || 'Sem limite',
        fim: dataFim || 'Sem limite'
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de controles:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
