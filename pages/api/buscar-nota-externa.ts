import { NextApiRequest, NextApiResponse } from 'next';
import { apiExternaService } from '@/services/api-externa';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { numero, serie, chave } = req.query;

    const username = process.env.API_EXTERNA_USERNAME;
    const password = process.env.API_EXTERNA_PASSWORD;

    if (!username || !password) {
      return res.status(500).json({ message: 'API credentials not configured' });
    }

    let nota = null;

    if (chave) {
      nota = await apiExternaService.buscarNotaFiscalPorChave(String(chave), username, password);
    } else if (numero) {
      nota = await apiExternaService.buscarNotaFiscalPorNumeroSerie(String(numero), String(serie || '1'), username, password);
    }

    if (!nota) {
      return res.status(200).json(null); // Retornar 200 null para não gerar erros no log do client
    }

    return res.status(200).json(nota);
  } catch (error) {
    console.error('Erro ao buscar nota externa:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
