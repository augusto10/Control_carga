import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const user = await prisma.usuario.create({
        data: {
          email: 'admin@controlecarga.com',
          senha: await hash('12345678', 12),
          tipo: 'ADMIN',
          nome: 'Admin User',
          ativo: true
        }
      });
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ error: 'User creation failed' });
    }
  } else {
    res.status(405).end();
  }
}
