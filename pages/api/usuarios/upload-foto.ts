import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import multer from 'multer';
import { promisify } from 'util';
import prisma from '../../../lib/prisma';
import { getTokenFromCookies } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

// Configurar multer para upload de arquivos
const upload = multer({
  storage: multer.diskStorage({
    destination: './public/uploads/avatars/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024 // Limite de 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

// Middleware para upload
const uploadMiddleware = promisify(upload.single('foto')) as any;

// Desabilitar body parser padrão do Next.js
export const config = {
  api: {
    bodyParser: false,
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

    // Criar diretório se não existir
    const uploadDir = './public/uploads/avatars';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Processar upload
    await uploadMiddleware(req as any, res as any);

    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ message: 'Nenhum arquivo enviado' });
    }

    // URL pública da imagem
    const fotoUrl = `/uploads/avatars/${file.filename}`;

    // Atualizar usuário no banco
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: decoded.id },
      data: { foto: fotoUrl },
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
      fotoUrl: fotoUrl
    });

  } catch (error: any) {
    console.error('Erro no upload de foto:', error);
    
    // Limpar arquivo em caso de erro
    if ((req as any).file) {
      fs.unlinkSync((req as any).file.path);
    }

    return res.status(500).json({ 
      message: 'Erro ao fazer upload da foto',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
