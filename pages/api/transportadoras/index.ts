import { NextApiRequest, NextApiResponse } from 'next';
import { Transportadora } from '@prisma/client';

const transportadoraLabels: Partial<Record<Transportadora, string>> = {
  ACERT: 'ACERT Transportes',
  ACCERT: 'ACCERT Transportes',
  EXPRESSO_GOIAS: 'Expresso Goias',
  TERCEIRIZADA: 'Terceirizada',
  DETAFRA_TRANSPORTES: 'Detafra Transportes',
  RETIRA_VENDEDOR: 'Retira Vendedor',
  RETIRA_CLIENTE: 'Retira Cliente',
  VLOG: 'VLOG Transportes',
  ZANUELO_TRANSPORTE_LOGISTICA: 'Zanuelo Transporte e Logistica'
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const transportadoras = Object.values(Transportadora).map(t => ({
    id: t,
    nome: transportadoraLabels[t] || t.replace(/_/g, ' '),
    descricao: transportadoraLabels[t] || t.replace(/_/g, ' ')
  }));

  return res.status(200).json(transportadoras);
}
