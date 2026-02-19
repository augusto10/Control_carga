import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';
import { randomUUID } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Autenticação
  const token = getTokenFromCookies(req);
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  const decoded = await verifyToken(token, JWT_SECRET);
  if (!decoded || !decoded.id) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    if (req.method === 'POST') {
      const { motorista, transportadora, quantidade, observacao, dataRecebimento } = req.body || {};
      if (!quantidade || typeof quantidade !== 'number' || quantidade <= 0) {
        return res.status(400).json({ error: 'Quantidade inválida. Deve ser um número positivo.' });
      }

      // transportadora é opcional, mas se vier deve ser um dos enums conhecidos; Prisma validará
      let ajuste;
      try {
        ajuste = await (prisma as any).palletAjuste.create({
          data: {
            id: randomUUID(),
            motorista: motorista || null,
            transportadora: transportadora || null,
            quantidade,
            observacao: observacao || null,
            dataRecebimento: dataRecebimento ? new Date(dataRecebimento) : undefined,
            usuarioId: decoded.id,
          },
        });
      } catch (error: any) {
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          return res.status(503).json({ 
            error: 'Funcionalidade de ajustes de pallets temporariamente indisponível', 
            details: 'A tabela PalletAjuste não foi criada no banco de dados. Entre em contato com o administrador do sistema para criar a tabela.' 
          });
        }
        throw error;
      }

      return res.status(201).json({ ok: true, ajuste });
    }

    if (req.method === 'GET') {
      const { dataInicio, dataFim, transportadora, motorista } = req.query;

      const where: any = {};

      if (dataInicio) {
        where.dataRecebimento = {
          ...where.dataRecebimento,
          gte: new Date(String(dataInicio) + 'T00:00:00.000Z'),
        };
      }

      if (dataFim) {
        where.dataRecebimento = {
          ...where.dataRecebimento,
          lte: new Date(String(dataFim) + 'T23:59:59.999Z'),
        };
      }

      if (transportadora && transportadora !== 'TODAS') {
        where.transportadora = String(transportadora);
      }

      if (motorista) {
        // ajuste simples: como é um campo string simples, usar contains insensível
        where.motorista = { contains: String(motorista), mode: 'insensitive' };
      }

      type AjusteRow = {
        id?: string;
        motorista: string | null;
        transportadora: string | null;
        quantidade: number;
        observacao?: string | null;
        dataRecebimento: Date;
      };
      
      let ajustes: AjusteRow[] = [];
      try {
        ajustes = await (prisma as any).palletAjuste.findMany({
          where,
          orderBy: { dataRecebimento: 'desc' },
        });
      } catch (error: any) {
        if (error.code === 'P2021' || error.message?.includes('does not exist')) {
          return res.status(503).json({ 
            error: 'Funcionalidade de ajustes de pallets temporariamente indisponível', 
            details: 'A tabela PalletAjuste não foi criada no banco de dados. Entre em contato com o administrador do sistema para criar a tabela.',
            ajustes: [] 
          });
        }
        throw error;
      }

      return res.status(200).json({ ajustes });
    }

    return res.status(405).json({ error: 'Método não permitido' });
  } catch (error: any) {
    console.error('Erro em /api/pallets/ajustes:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', details: error?.message });
  }
}
