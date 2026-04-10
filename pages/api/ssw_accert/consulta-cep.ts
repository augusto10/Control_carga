import { NextApiRequest, NextApiResponse } from 'next';
import { consultaCep } from '@/services/sswClient';

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const idCepRaw = req.query.idCep as string || '';
    const idCep = onlyDigits(idCepRaw);

    if (!idCep || idCep.length !== 8) {
      return res.status(400).json({ error: 'idCep inválido' });
    }

    const data = await consultaCep(idCep);

    if (data.erro) {
      return res.status(400).json({ error: data.mensagem || 'Erro ao consultar CEP', data });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao consultar CEP' });
  }
}
