import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ message: 'ID inválido' });
  }

  if (req.method === 'GET') {
    try {
      const material = await prisma.materialEstoque.findUnique({
        where: { id }
      });

      if (!material) {
        return res.status(404).json({ message: 'Material não encontrado' });
      }

      return res.status(200).json(material);
    } catch (error) {
      console.error('Erro ao buscar material:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { nome, descricao, unidadeMedida, quantidadeEstoque, estoqueMinimo, valor, ativo } = req.body;

      const material = await prisma.materialEstoque.update({
        where: { id },
        data: {
          nome: nome !== undefined ? String(nome).trim() : undefined,
          descricao: descricao !== undefined ? String(descricao).trim() : undefined,
          unidadeMedida: unidadeMedida !== undefined ? String(unidadeMedida).trim() : undefined,
          quantidadeEstoque: quantidadeEstoque !== undefined ? Number(quantidadeEstoque || 0) : undefined,
          estoqueMinimo: estoqueMinimo !== undefined ? Number(estoqueMinimo || 0) : undefined,
          valor: valor !== undefined && valor !== null && String(valor).length > 0 ? Number(valor) : undefined,
          ativo: typeof ativo === 'boolean' ? ativo : undefined
        }
      });

      return res.status(200).json(material);
    } catch (error) {
      console.error('Erro ao atualizar material:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const itensCount = await prisma.itemSolicitacaoMaterial.count({
        where: { materialId: id }
      });

      if (itensCount > 0) {
        return res.status(400).json({ message: 'Não é possível excluir material com solicitações' });
      }

      await prisma.materialEstoque.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Material excluído com sucesso' });
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
