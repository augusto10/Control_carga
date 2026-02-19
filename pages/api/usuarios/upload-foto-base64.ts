import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import prisma from '@/lib/prisma';
import { getTokenFromCookies } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Aumentar limite para base64
    },
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  try {
    // Verificar autenticação via cookie JWT
    const token = getTokenFromCookies(req);
    
    if (!token) {
      return res.status(401).json({ message: 'Não autorizado' });
    }

    let decoded: any;
    try {
      decoded = verify(token, JWT_SECRET) as { id: string; tipo: string; email: string };
    } catch (error) {
      console.error('Erro ao verificar token:', error);
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }

    const { fotoBase64 } = req.body;

    if (!fotoBase64) {
      return res.status(400).json({ message: 'Nenhuma imagem enviada' });
    }

    // Validar formato base64
    if (!fotoBase64.startsWith('data:image/')) {
      return res.status(400).json({ message: 'Formato de imagem inválido' });
    }

    // Validar tamanho (aproximadamente 5MB em base64 = ~6.7MB string)
    if (fotoBase64.length > 7000000) {
      return res.status(400).json({ message: 'Imagem muito grande. Máximo 5MB' });
    }

    // Atualizar usuário no banco com base64
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: decoded.id },
      data: { foto: fotoBase64 },
      select: {
        id: true,
        nome: true,
        email: true,
        foto: true,
        tipo: true
      }
    });

    return res.status(200).json({
      message: 'Foto de perfil atualizada com sucesso',
      usuario: usuarioAtualizado,
      fotoUrl: fotoBase64
    });

  } catch (error: any) {
    console.error('Erro no upload de foto:', error);

    return res.status(500).json({ 
      message: 'Erro ao fazer upload da foto',
      error: error?.message || 'Erro desconhecido'
    });
  }
}

