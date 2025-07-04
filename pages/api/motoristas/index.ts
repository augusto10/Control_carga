import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return listar(req, res);
    case 'POST':
      return criar(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Método ${req.method} não permitido` });
  }
}

async function listar(req: NextApiRequest, res: NextApiResponse) {
  try {
    const motoristasDb = await prisma.motorista.findMany({
      orderBy: { nome: 'asc' },
    });

    // Adiciona um objeto de descrição da transportadora para compatibilidade com o front-end
    const motoristas = motoristasDb.map((m: typeof motoristasDb[number]) => ({
      ...m,
      transportadora: {
        id: m.transportadoraId,
        descricao: m.transportadoraId === 'ACCERT' ? 'ACERT Transportes' : 'Expresso Goiás',
      },
    }));

    return res.status(200).json(motoristas);
  } catch (error) {
    console.error('Erro ao listar motoristas:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

async function criar(req: NextApiRequest, res: NextApiResponse) {
  const { nome, telefone, cpf, cnh, transportadoraId } = req.body as {
    nome?: string;
    telefone?: string;
    cpf?: string;
    cnh?: string;
    transportadoraId?: string;
  };

  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  // Telefone não é obrigatório para salvar, mas garantimos string
  const telefoneVal = telefone?.trim() || '';
  if (!cpf?.trim()) return res.status(400).json({ error: 'CPF é obrigatório' });
  if (!cnh?.trim()) return res.status(400).json({ error: 'CNH é obrigatório' });
  if (!transportadoraId?.trim())
    return res.status(400).json({ error: 'Transportadora é obrigatória' });

  try {
    // Verificar duplicidade por CPF
    const existente = await prisma.motorista.findUnique({ where: { cpf } });
    if (existente) {
      return res.status(400).json({ error: 'Já existe motorista com esse CPF' });
    }

    const novo = await prisma.motorista.create({
      data: { nome, telefone: telefoneVal, cpf, cnh, transportadoraId },
    });
    return res.status(201).json(novo);
  } catch (error: any) {
    console.error('Erro ao criar motorista:', error);
    return res.status(500).json({ error: 'Erro interno do servidor', message: error.message });
  }
}
