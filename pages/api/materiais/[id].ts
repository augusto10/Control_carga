import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'ID inválido' });
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

    // GET - Buscar material por ID
    if (req.method === 'GET') {
      const material = await prisma.materialEstoque.findUnique({
        where: { id }
      });

      if (!material) {
        return res.status(404).json({ error: 'Material não encontrado' });
      }

      return res.status(200).json(material);
    }

    // PUT - Atualizar material (apenas ADMIN/GERENTE)
    if (req.method === 'PUT') {
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id }
      });

      if (!usuario || !['ADMIN', 'GERENTE'].includes(usuario.tipo)) {
        return res.status(403).json({ error: 'Sem permissão para editar materiais' });
      }

      const { nome, descricao, unidadeMedida, quantidadeEstoque, estoqueMinimo, valor, ativo } = req.body;

      const material = await prisma.materialEstoque.update({
        where: { id },
        data: {
          ...(nome !== undefined && { nome }),
          ...(descricao !== undefined && { descricao }),
          ...(unidadeMedida !== undefined && { unidadeMedida }),
          ...(quantidadeEstoque !== undefined && { quantidadeEstoque }),
          ...(estoqueMinimo !== undefined && { estoqueMinimo }),
          ...(valor !== undefined && { valor }),
          ...(ativo !== undefined && { ativo })
        }
      });

      return res.status(200).json(material);
    }

    // DELETE - Excluir material (apenas ADMIN/GERENTE)
    if (req.method === 'DELETE') {
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id }
      });

      if (!usuario || !['ADMIN', 'GERENTE'].includes(usuario.tipo)) {
        return res.status(403).json({ error: 'Sem permissão para excluir materiais' });
      }

      // Verificar se há solicitações vinculadas
      const itensVinculados = await prisma.itemSolicitacaoMaterial.count({
        where: { materialId: id }
      });

      if (itensVinculados > 0) {
        return res.status(400).json({ 
          error: 'Não é possível excluir material com solicitações vinculadas. Desative-o ao invés de excluir.' 
        });
      }

      await prisma.materialEstoque.delete({
        where: { id }
      });

      return res.status(200).json({ message: 'Material excluído com sucesso' });
    }

    return res.status(405).json({ error: `Método ${req.method} não permitido` });

  } catch (error: any) {
    console.error('Erro na API de material:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
