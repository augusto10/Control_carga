import { NextApiRequest, NextApiResponse } from 'next';

// Definindo o tipo Transportadora baseado no enum do Prisma
type Transportadora = {
  id: string;
  nome: string;
  descricao: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verifica se o método é GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    // Retorna as opções do enum Transportadora
    const transportadoras: Transportadora[] = [
      {
        id: 'ACERT',
        nome: 'ACERT',
        descricao: 'ACERT Transportes',
      },
      {
        id: 'EXPRESSO_GOIAS',
        nome: 'EXPRESSO_GOIAS',
        descricao: 'Expresso Goiás',
      },
    ];

    return res.status(200).json(transportadoras);
  } catch (error) {
    console.error('Erro ao buscar transportadoras:', error);
    return res.status(500).json({ error: 'Erro ao buscar transportadoras' });
  }
}
