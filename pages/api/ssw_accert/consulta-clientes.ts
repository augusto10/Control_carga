import { NextApiRequest, NextApiResponse } from 'next';
import { consultaClientes } from '@/services/sswClient';

function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const idClienteRaw = req.query.idCliente as string || '';
    const idCliente = onlyDigits(idClienteRaw);

    if (!idCliente || (idCliente.length !== 11 && idCliente.length !== 14)) {
      return res.status(400).json({ error: 'idCliente inválido' });
    }

    const data = await consultaClientes(idCliente);

    if (data.erro) {
      return res.status(400).json({ error: data.mensagem || 'Erro ao consultar Cliente', data });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Erro ao consultar Cliente' });
  }
}
