import { NextApiRequest, NextApiResponse } from 'next';
import { consultaPrazo } from '@/services/sswClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const idCepRemetente = req.query.idCepRemetente as string;
    const idCepDestinatario = req.query.idCepDestinatario as string;
    
    if (!idCepRemetente || !idCepDestinatario) {
      return res.status(400).json({ error: 'idCepRemetente e idCepDestinatario são obrigatórios' });
    }

    const data = await consultaPrazo({
      idCepRemetente,
      idCepDestinatario,
      idClienteRemetente: req.query.idClienteRemetente as string,
      idClienteDestinatario: req.query.idClienteDestinatario as string,
      idClientePagador: req.query.idClientePagador as string,
      tpFrete: req.query.tpFrete as string,
      idCodigoMercadoria: req.query.idCodigoMercadoria as string,
    });

    if (data.erro) {
      return res.status(400).json({ error: data.mensagem || 'Erro ao consultar Prazo', data });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao consultar Prazo' });
  }
}
