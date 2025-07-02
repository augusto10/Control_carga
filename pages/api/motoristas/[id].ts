import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query as { id: string };
  if (!id) return res.status(400).json({ error: 'ID é obrigatório' });

  switch (req.method) {
    case 'GET':
      return obter(id, res);
    case 'PUT':
      return atualizar(id, req, res);
    case 'DELETE':
      return remover(id, res);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}

async function obter(id: string, res: NextApiResponse) {
  try {
    const motoristaDb = await prisma.motorista.findUnique({
      where: { id },
    });
    if (!motoristaDb) return res.status(404).json({ error: 'Motorista não encontrado' });
    const motorista = {
      ...motoristaDb,
      transportadora: {
        id: motoristaDb.transportadoraId,
        descricao: motoristaDb.transportadoraId === 'ACCERT' ? 'ACERT Transportes' : 'Expresso Goiás',
      },
    };
    if (!motorista) return res.status(404).json({ error: 'Motorista não encontrado' });
    return res.status(200).json(motorista);
  } catch (error) {
    console.error('Erro ao obter motorista:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function atualizar(id: string, req: NextApiRequest, res: NextApiResponse) {
  const { nome, telefone, cpf, cnh, transportadoraId } = req.body as {
    nome?: string;
    telefone?: string;
    cpf?: string;
    cnh?: string;
    transportadoraId?: string;
  };

  try {
    const motorista = await prisma.motorista.update({
      where: { id },
      data: { nome, telefone, cpf, cnh, transportadoraId },
    });
    return res.status(200).json(motorista);
  } catch (error) {
    console.error('Erro ao atualizar motorista:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function remover(id: string, res: NextApiResponse) {
  try {
    await prisma.motorista.delete({ where: { id } });
    return res.status(204).end();
  } catch (error) {
    console.error('Erro ao excluir motorista:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
