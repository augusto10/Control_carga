import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Email inválido' });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: email.toLowerCase() },
      select: { foto: true, nome: true }
    });

    // Sempre retorna 200 para não revelar se o email existe com precisão
    return res.status(200).json({
      fotoUrl: user?.foto || null,
      nome: user?.nome || null,
    });
  } catch (error: any) {
    console.error('Erro no avatar-preview:', error);
    return res.status(200).json({ fotoUrl: null, nome: null });
  }
}




