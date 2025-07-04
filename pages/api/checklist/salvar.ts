import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getSession } from 'next-auth/react';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const session = await getSession({ req });
  if (!session || !session.user?.id) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  const { 
    empilhadeiraNumero,
    turno,
    operadorNome,
    horimetroInicial,
    horimetroFinal,
    itens,
    observacoesGerais
  } = req.body;

  // Validação básica
  if (!empilhadeiraNumero || !turno || !operadorNome || !horimetroInicial || !itens) {
    return res.status(400).json({ error: 'Todos os campos obrigatórios devem ser preenchidos.' });
  }

  try {
    const checklist = await prisma.forkliftChecklist.create({
      data: {
        empilhadeiraNumero,
        turno,
        operadorNome,
        horimetroInicial: parseFloat(horimetroInicial),
        horimetroFinal: horimetroFinal ? parseFloat(horimetroFinal) : null,
        itens,
        observacoesGerais,
        usuarioId: session.user.id,
      },
    });

    res.status(201).json(checklist);
  } catch (error) {
    console.error('Erro ao salvar checklist:', error);
    res.status(500).json({ error: 'Erro interno ao salvar o checklist.' });
  }
}
