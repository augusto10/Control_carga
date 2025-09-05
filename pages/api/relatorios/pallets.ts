import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

interface RelatorioPallets {
  motorista: string;
  transportadora: string;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  totalPalletsLiquido: number;
  totalControles: number;
}

interface ResumoTransportadora {
  transportadora: string;
  totalPalletsLevados: number;
  totalPalletsDevolvidos: number;
  totalPalletsLiquido: number;
  totalControles: number;
  totalMotoristas: number;
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
    const { dataInicio, dataFim, transportadora, motorista } = req.query;

    // Construir filtros
    const filtros: any = {};

    if (dataInicio) {
      filtros.dataCriacao = {
        ...filtros.dataCriacao,
        gte: new Date(dataInicio as string)
      };
    }

    if (dataFim) {
      const dataFimDate = new Date(dataFim as string);
      dataFimDate.setHours(23, 59, 59, 999); // Incluir o dia inteiro
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

    console.log('Filtros aplicados:', filtros);

    // Buscar todos os controles com os filtros
    const controles = await prisma.controleCarga.findMany({
      where: filtros,
      select: {
        motorista: true,
        transportadora: true,
        qtdPalletsLevados: true,
        qtdPalletsDevolvidos: true,
        dataCriacao: true
      }
    });

    console.log(`Encontrados ${controles.length} controles`);

    // Agrupar dados por motorista e transportadora
    const agrupamento = new Map<string, RelatorioPallets>();

    controles.forEach(controle => {
      const chave = `${controle.motorista}|${controle.transportadora}`;
      
      if (agrupamento.has(chave)) {
        const item = agrupamento.get(chave)!;
        item.totalPalletsLevados += controle.qtdPalletsLevados || 0;
        item.totalPalletsDevolvidos += controle.qtdPalletsDevolvidos || 0;
        item.totalPalletsLiquido = item.totalPalletsLevados - item.totalPalletsDevolvidos;
        item.totalControles += 1;
      } else {
        const palletsLevados = controle.qtdPalletsLevados || 0;
        const palletsDevolvidos = controle.qtdPalletsDevolvidos || 0;
        
        agrupamento.set(chave, {
          motorista: controle.motorista,
          transportadora: controle.transportadora,
          totalPalletsLevados: palletsLevados,
          totalPalletsDevolvidos: palletsDevolvidos,
          totalPalletsLiquido: palletsLevados - palletsDevolvidos,
          totalControles: 1
        });
      }
    });

    // Converter Map para array e ordenar
    const dados = Array.from(agrupamento.values()).sort((a, b) => {
      if (a.transportadora !== b.transportadora) {
        return a.transportadora.localeCompare(b.transportadora);
      }
      return a.motorista.localeCompare(b.motorista);
    });

    // Criar resumo por transportadora
    const resumoMap = new Map<string, ResumoTransportadora>();

    dados.forEach(item => {
      if (resumoMap.has(item.transportadora)) {
        const resumo = resumoMap.get(item.transportadora)!;
        resumo.totalPalletsLevados += item.totalPalletsLevados;
        resumo.totalPalletsDevolvidos += item.totalPalletsDevolvidos;
        resumo.totalPalletsLiquido += item.totalPalletsLiquido;
        resumo.totalControles += item.totalControles;
        resumo.totalMotoristas += 1;
      } else {
        resumoMap.set(item.transportadora, {
          transportadora: item.transportadora,
          totalPalletsLevados: item.totalPalletsLevados,
          totalPalletsDevolvidos: item.totalPalletsDevolvidos,
          totalPalletsLiquido: item.totalPalletsLiquido,
          totalControles: item.totalControles,
          totalMotoristas: 1
        });
      }
    });

    const resumoTransportadoras = Array.from(resumoMap.values()).sort((a, b) => 
      a.transportadora.localeCompare(b.transportadora)
    );

    console.log(`Retornando ${dados.length} registros agrupados`);
    console.log(`Resumo de ${resumoTransportadoras.length} transportadoras`);

    return res.status(200).json({
      dados,
      resumoTransportadoras,
      totalRegistros: dados.length,
      periodo: {
        inicio: dataInicio || 'Sem limite',
        fim: dataFim || 'Sem limite'
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de pallets:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
