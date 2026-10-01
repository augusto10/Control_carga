import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchPortalPhoto } from '@/services/sswPortalClient';

export const config = {
  api: {
    responseLimit: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo nao permitido' });
  }

  const token = Array.isArray(req.query.token) ? req.query.token[0] : req.query.token;
  const signature = Array.isArray(req.query.signature) ? req.query.signature[0] : req.query.signature;

  if (!token || !signature) {
    return res.status(400).json({ error: 'token e signature sao obrigatorios' });
  }

  try {
    const response = await fetchPortalPhoto(String(token), String(signature));
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const body = Buffer.from(await response.arrayBuffer());
    const bytes = new Uint8Array(body);
    const isSswLoadingPlaceholder =
      contentType.toLowerCase().includes('image/png') &&
      bytes.length < 2000 &&
      bytes[16] === 0 && bytes[17] === 0 && bytes[18] === 0 && bytes[19] === 125 &&
      bytes[20] === 0 && bytes[21] === 0 && bytes[22] === 0 && bytes[23] === 18;

    if (isSswLoadingPlaceholder) {
      return res.status(404).json({
        error: 'Imagem ainda nao disponibilizada pelo SSW',
      });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    return res.status(response.status).send(body);
  } catch (error: any) {
    return res.status(404).json({
      error: 'Nao foi possivel abrir o comprovante',
      details: error?.message || 'Erro desconhecido',
    });
  }
}
