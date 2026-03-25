import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Autenticação simples (ajuste conforme seu sistema de auth)
    const token = req.cookies.auth_token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
    const usuarioId = decoded.id;

    const { fotoBase64 } = req.body;

    if (!fotoBase64 || !fotoBase64.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Formato de imagem inválido' });
    }

    // Atualiza a foto no banco de dados
    const usuario = await prisma.usuario.update({
      where: { id: usuarioId },
      data: { foto: fotoBase64 },
    });

    return res.status(200).json({ 
      message: 'Foto atualizada com sucesso',
      fotoUrl: usuario.foto 
    });
  } catch (error) {
    console.error('Erro ao fazer upload da foto:', error);
    return res.status(500).json({ message: 'Erro interno ao salvar foto' });
  }
}
