import { NextApiRequest, NextApiResponse } from 'next';
import { trackingDanfe } from '@/services/sswClient';

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const body = req.body;
    const chaveNfe = onlyDigits(typeof body?.chave_nfe === 'string' ? body.chave_nfe : '');

    if (!chaveNfe || chaveNfe.length !== 44) {
      return res.status(400).json({ error: 'chave_nfe inválida (44 dígitos)' });
    }

    const data = await trackingDanfe(chaveNfe);

    if (data.erro) {
      return res.status(400).json({ error: data.mensagem || 'Erro ao consultar tracking DANFE', data });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao consultar tracking DANFE' });
  }
}
