import { NextApiRequest, NextApiResponse } from 'next';
import { Transportadora } from '@prisma/client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const transportadoras = Object.values(Transportadora).map(t => ({
    id: t,
    nome: t.replace(/_/g, ' '),
    descricao: t.replace(/_/g, ' ')
  }));

  return res.status(200).json(transportadoras);
}
