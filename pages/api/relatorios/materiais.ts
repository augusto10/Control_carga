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

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ message: 'Informe o período' });
    }

    const inicio = new Date(`${dataInicio}T00:00:00.000Z`);
    const fim = new Date(`${dataFim}T23:59:59.999Z`);

    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
      return res.status(400).json({ message: 'Período inválido' });
    }

    const solicitacoes = await prisma.solicitacaoMaterial.findMany({
      where: {
        dataCriacao: {
          gte: inicio,
          lte: fim
        }
      },
      include: {
        solicitante: {
          select: {
            id: true,
            nome: true
          }
        },
        itens: {
          include: {
            material: {
              select: {
                id: true,
                nome: true,
                unidadeMedida: true
              }
            }
          }
        }
      }
    });

    const totaisPorMaterialMap = new Map<string, { materialId: string; materialNome: string; unidadeMedida: string; quantidadeTotal: number; solicitacoes: Set<string> }>();
    const totaisPorSolicitanteMap = new Map<string, { solicitanteId: string; solicitanteNome: string; quantidadeSolicitacoes: number; materiais: Set<string> }>();

    solicitacoes.forEach((solicitacao) => {
      const solicitanteId = solicitacao.solicitanteId;
      const solicitanteNome = solicitacao.solicitante?.nome || 'Não informado';
      const solicitanteAtual = totaisPorSolicitanteMap.get(solicitanteId) || {
        solicitanteId,
        solicitanteNome,
        quantidadeSolicitacoes: 0,
        materiais: new Set<string>()
      };

      solicitanteAtual.quantidadeSolicitacoes += 1;

      solicitacao.itens.forEach((item) => {
        const materialId = item.materialId;
        const materialNome = item.material?.nome || 'Material não informado';
        const unidadeMedida = item.material?.unidadeMedida || 'UN';
        const quantidade = item.quantidadeAprovada ?? item.quantidade ?? 0;

        const materialAtual = totaisPorMaterialMap.get(materialId) || {
          materialId,
          materialNome,
          unidadeMedida,
          quantidadeTotal: 0,
          solicitacoes: new Set<string>()
        };

        materialAtual.quantidadeTotal += quantidade;
        materialAtual.solicitacoes.add(solicitacao.id);
        totaisPorMaterialMap.set(materialId, materialAtual);

        solicitanteAtual.materiais.add(materialId);
      });

      totaisPorSolicitanteMap.set(solicitanteId, solicitanteAtual);
    });

    const totaisPorMaterial = Array.from(totaisPorMaterialMap.values()).map((item) => ({
      materialId: item.materialId,
      materialNome: item.materialNome,
      unidadeMedida: item.unidadeMedida,
      quantidadeTotal: item.quantidadeTotal,
      quantidadeSolicitacoes: item.solicitacoes.size
    }));

    const totaisPorSolicitante = Array.from(totaisPorSolicitanteMap.values()).map((item) => ({
      solicitanteId: item.solicitanteId,
      solicitanteNome: item.solicitanteNome,
      quantidadeSolicitacoes: item.quantidadeSolicitacoes,
      quantidadeMateriaisDistintos: item.materiais.size
    }));

    const resumo = {
      totalSolicitacoes: solicitacoes.length,
      totalMateriais: totaisPorMaterialMap.size,
      totalSolicitantes: totaisPorSolicitanteMap.size
    };

    return res.status(200).json({ totaisPorMaterial, totaisPorSolicitante, resumo });
  } catch (error) {
    console.error('Erro ao gerar relatório de materiais:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
