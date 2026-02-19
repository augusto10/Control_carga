import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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

    // GET - Listar materiais
    if (req.method === 'GET') {
      const { ativo, busca } = req.query;

      const where: any = {};

      if (ativo !== undefined) {
        where.ativo = ativo === 'true';
      }

      if (busca && typeof busca === 'string') {
        where.OR = [
          { nome: { contains: busca, mode: 'insensitive' } },
          { descricao: { contains: busca, mode: 'insensitive' } }
        ];
      }

      const materiais = await prisma.materialEstoque.findMany({
        where,
        orderBy: { nome: 'asc' }
      });

      return res.status(200).json(materiais);
    }

    // POST - Criar material (apenas ADMIN/GERENTE)
    if (req.method === 'POST') {
      const usuario = await prisma.usuario.findUnique({
        where: { id: decoded.id }
      });

      if (!usuario || !['ADMIN', 'GERENTE'].includes(usuario.tipo)) {
        return res.status(403).json({ error: 'Sem permissão para criar materiais' });
      }

      const { nome, descricao, unidadeMedida, quantidadeEstoque, estoqueMinimo, valor } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'Nome é obrigatório' });
      }

      const material = await prisma.materialEstoque.create({
        data: {
          nome,
          descricao: descricao || null,
          unidadeMedida: unidadeMedida || 'UN',
          quantidadeEstoque: quantidadeEstoque || 0,
          estoqueMinimo: estoqueMinimo || 0,
          valor: valor || null
        }
      });

      return res.status(201).json(material);
    }

    return res.status(405).json({ error: `Método ${req.method} não permitido` });

  } catch (error: any) {
    console.error('Erro na API de materiais:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
