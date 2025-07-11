import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const { start, end, conferidas } = req.query;
      let where = {} as any;
      if (start || end) {
        where.dataCriacao = {};
        if (start) {
          where.dataCriacao.gte = new Date(`${start}T00:00:00`);
        }
        if (end) {
          where.dataCriacao.lte = new Date(`${end}T23:59:59`);
        }
      }
      if (conferidas === 'true') {
        where.controle = {
          conferenciaRealizada: true
        };
      }
      const notas = await prisma.notaFiscal.findMany({ 
        where,
        include: {
          controle: {
            select: {
              id: true,
              numeroManifesto: true,
              motorista: true,
              responsavel: true,
              transportadora: true,
              dataCriacao: true
            }
          }
        },
        orderBy: {
          dataCriacao: 'desc'
        }
      });
      
      // Adiciona cabeçalhos para evitar cache
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      res.status(200).json(notas);
    } catch (error) {
      console.error('Erro ao listar notas:', error);
      res.status(500).json({ error: 'Erro ao listar notas' });
    }
  } else if (req.method === 'POST') {
    try {
      const { codigo, numeroNota, volumes } = req.body;

      if (!codigo || !numeroNota || !volumes) {
        return res.status(400).json({ error: 'Código, número da nota e volumes são obrigatórios' });
      }

      // Cria um novo ControleCarga (manifesto) primeiro
      const novoControle = await prisma.controleCarga.create({
        data: {
          numeroManifesto: `M-${Date.now()}`,
          motorista: 'A Definir', // Valor padrão
          responsavel: 'A Definir', // Valor padrão
          // O campo 'transportadora' usará o default 'ACCERT' do schema
        },
      });

      // Cria a NotaFiscal e a associa ao novo ControleCarga
      const nota = await prisma.notaFiscal.create({
        data: {
          codigo,
          numeroNota,
          volumes: volumes.toString(),
          controleId: novoControle.id, // Associa a nota ao controle
        },
      });

      res.status(201).json(nota);
    } catch (error) {
      console.error('Erro ao criar nota:', error);
      res.status(500).json({ error: 'Erro ao salvar nota fiscal' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
