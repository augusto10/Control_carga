import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Autenticação
    const token = getTokenFromCookies(req);
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = await verifyToken(token, process.env.JWT_SECRET || 'secret');
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Token inválido' });
    }

    // Verificar permissão (apenas ADMIN/GERENTE)
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id }
    });

    if (!usuario || !['ADMIN', 'GERENTE'].includes(usuario.tipo)) {
      return res.status(403).json({ error: 'Sem permissão para visualizar relatórios' });
    }

    const { dataInicio, dataFim, materialId, solicitanteId, aprovadorId } = req.query;

    // Filtros de data
    const where: any = {
      status: 'APROVADA'
    };

    if (dataInicio && dataFim) {
      where.dataAprovacao = {
        gte: new Date(dataInicio as string + 'T00:00:00.000Z'),
        lte: new Date(dataFim as string + 'T23:59:59.999Z')
      };
    }

    if (solicitanteId && typeof solicitanteId === 'string') {
      where.solicitanteId = solicitanteId;
    }

    // Buscar solicitações aprovadas
    const solicitacoes = await prisma.solicitacaoMaterial.findMany({
      where,
      include: {
        solicitante: {
          select: { id: true, nome: true, email: true }
        },
        aprovador: {
          select: { id: true, nome: true, email: true }
        },
        itens: {
          include: {
            material: true
          },
          ...(materialId && typeof materialId === 'string' && {
            where: { materialId }
          })
        }
      },
      orderBy: { dataAprovacao: 'desc' }
    });

    // Calcular totais por material (inclui valores)
    const totaisPorMaterial: Record<string, {
      materialId: string;
      materialNome: string;
      unidadeMedida: string;
      quantidadeTotal: number;
      quantidadeSolicitacoes: number;
      valorTotal: number;
      estoqueAtual: number;
    }> = {};

    solicitacoes.forEach(solicitacao => {
      solicitacao.itens.forEach(item => {
        const key = item.materialId;
        
        if (!totaisPorMaterial[key]) {
          totaisPorMaterial[key] = {
            materialId: item.materialId,
            materialNome: item.material.nome,
            unidadeMedida: item.material.unidadeMedida,
            quantidadeTotal: 0,
            quantidadeSolicitacoes: 0,
            valorTotal: 0,
            estoqueAtual: item.material.quantidadeEstoque
          };
        }

        totaisPorMaterial[key].quantidadeTotal += item.quantidadeAprovada || item.quantidade;
        totaisPorMaterial[key].quantidadeSolicitacoes += 1;
        const valorUnitario = item.material.valor || 0;
        totaisPorMaterial[key].valorTotal += valorUnitario * (item.quantidadeAprovada || item.quantidade);
      });
    });

    // Calcular totais por solicitante
    const totaisPorSolicitante: Record<string, {
      solicitanteId: string;
      solicitanteNome: string;
      quantidadeSolicitacoes: number;
      materiaisDistintos: Set<string>;
    }> = {};

    solicitacoes.forEach(solicitacao => {
      const key = solicitacao.solicitanteId;
      
      if (!totaisPorSolicitante[key]) {
        totaisPorSolicitante[key] = {
          solicitanteId: solicitacao.solicitanteId,
          solicitanteNome: solicitacao.solicitante.nome,
          quantidadeSolicitacoes: 0,
          materiaisDistintos: new Set()
        };
      }

      totaisPorSolicitante[key].quantidadeSolicitacoes += 1;
      solicitacao.itens.forEach(item => {
        totaisPorSolicitante[key].materiaisDistintos.add(item.materialId);
      });
    });

    // Converter Sets para arrays
    const totaisPorSolicitanteArray = Object.values(totaisPorSolicitante).map(item => ({
      ...item,
      quantidadeMateriaisDistintos: item.materiaisDistintos.size,
      materiaisDistintos: undefined
    }));

    // Detalhamento por material: consumo médio, sugestão de reposição e valores de estoque
    const inicio = dataInicio ? new Date(dataInicio as string + 'T00:00:00.000Z') : new Date();
    const fim = dataFim ? new Date(dataFim as string + 'T23:59:59.999Z') : new Date();
    const mesesAnalisados = Math.max(1, (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth()) + 1);

    const materiaisAtuais = await prisma.materialEstoque.findMany({
      where: materialId && typeof materialId === 'string' ? { id: materialId } : {},
      orderBy: { nome: 'asc' }
    });

    const detalhamentoPorMaterial = materiaisAtuais.map((material) => {
      const consumoTotal = totaisPorMaterial[material.id]?.quantidadeTotal || 0;
      const consumoMedio = consumoTotal / mesesAnalisados;
      const estoqueAtual = material.quantidadeEstoque;
      const sugestaoReposicao = estoqueAtual < (consumoMedio * 2)
        ? Math.max(0, Math.ceil((consumoMedio * 3) - estoqueAtual))
        : 0;
      const valorUnitario = material.valor || 0;
      const valorTotalEstoque = valorUnitario * estoqueAtual;

      return {
        materialNome: material.nome,
        estoqueAtual,
        estoqueMinimo: material.estoqueMinimo,
        consumoMedio: Math.ceil(consumoMedio),
        sugestaoReposicao,
        valorUnitario,
        valorTotalEstoque
      };
    });

    const valorTotalGasto = Object.values(totaisPorMaterial).reduce((sum, m) => sum + m.valorTotal, 0);

    return res.status(200).json({
      solicitacoes,
      totaisPorMaterial: Object.values(totaisPorMaterial),
      totaisPorSolicitante: totaisPorSolicitanteArray.map(s => ({
        solicitanteId: s.solicitanteId,
        solicitanteNome: s.solicitanteNome,
        quantidadeSolicitacoes: s.quantidadeSolicitacoes,
        quantidadeMateriaisDistintos: s.quantidadeMateriaisDistintos,
        // valorTotal poderia ser calculado por solicitante, omitido por simplicidade agora
      })),
      resumo: {
        totalSolicitacoes: solicitacoes.length,
        totalMateriais: Object.keys(totaisPorMaterial).length,
        totalSolicitantes: Object.keys(totaisPorSolicitante).length,
        valorTotalGasto
      },
      detalhamentoPorMaterial
    });

  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
