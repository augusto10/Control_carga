import { NextApiRequest, NextApiResponse } from 'next';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id }
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // GET - Listar solicitações
    if (req.method === 'GET') {
      const { status, minhas } = req.query;

      const where: any = {};

      // Filtro por status
      if (status && typeof status === 'string') {
        where.status = status;
      }

      // Se for funcionário comum, só vê as próprias solicitações
      // Se for gerente/admin, vê todas (ou filtra por "minhas")
      if (!['ADMIN', 'GERENTE'].includes(usuario.tipo) || minhas === 'true') {
        where.solicitanteId = decoded.id;
      }

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
            }
          }
        },
        orderBy: { dataCriacao: 'desc' }
      });

      return res.status(200).json(solicitacoes);
    }

    // POST - Criar solicitação
    if (req.method === 'POST') {
      const { observacao, itens } = req.body;

      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        return res.status(400).json({ error: 'Itens são obrigatórios' });
      }

      // Validar itens
      for (const item of itens) {
        if (!item.materialId || !item.quantidade || item.quantidade <= 0) {
          return res.status(400).json({ error: 'Todos os itens devem ter materialId e quantidade válida' });
        }

        // Verificar se o material existe
        const material = await prisma.materialEstoque.findUnique({
          where: { id: item.materialId }
        });

        if (!material || !material.ativo) {
          return res.status(400).json({ error: `Material ${item.materialId} não encontrado ou inativo` });
        }
      }

      // Criar solicitação
      const solicitacao = await prisma.solicitacaoMaterial.create({
        data: {
          solicitanteId: decoded.id,
          observacao: observacao || null,
          itens: {
            create: itens.map((item: any) => ({
              materialId: item.materialId,
              quantidade: item.quantidade,
              observacao: item.observacao || null
            }))
          }
        },
        include: {
          solicitante: {
            select: { id: true, nome: true, email: true }
          },
          itens: {
            include: {
              material: true
            }
          }
        }
      });

      return res.status(201).json(solicitacao);
    }

    return res.status(405).json({ error: `Método ${req.method} não permitido` });

  } catch (error: any) {
    console.error('Erro na API de solicitações:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error.message });
  } finally {
    await prisma.$disconnect();
  }
}
