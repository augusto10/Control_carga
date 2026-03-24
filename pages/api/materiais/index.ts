import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const ativoParam = req.query.ativo;
      const ativo =
        typeof ativoParam === 'string'
          ? ativoParam.toLowerCase() === 'true'
          : undefined;

      const where: any = {};
      if (typeof ativo === 'boolean') {
        where.ativo = ativo;
      }

      const materiais = await prisma.materialEstoque.findMany({
        where,
        orderBy: { nome: 'asc' }
      });

      return res.status(200).json(materiais);
    } catch (error) {
      console.error('Erro ao buscar materiais:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nome, descricao, unidadeMedida, quantidadeEstoque, estoqueMinimo, valor, ativo } = req.body;

      if (!nome || !unidadeMedida) {
        return res.status(400).json({ message: 'Nome e unidade de medida são obrigatórios' });
      }

      const material = await prisma.materialEstoque.create({
        data: {
          nome: String(nome).trim(),
          descricao: descricao ? String(descricao).trim() : undefined,
          unidadeMedida: String(unidadeMedida).trim(),
          quantidadeEstoque: Number(quantidadeEstoque || 0),
          estoqueMinimo: Number(estoqueMinimo || 0),
          valor: valor !== undefined && valor !== null && String(valor).length > 0 ? Number(valor) : undefined,
          ativo: typeof ativo === 'boolean' ? ativo : true
        }
      });

      return res.status(201).json(material);
    } catch (error) {
      console.error('Erro ao criar material:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
