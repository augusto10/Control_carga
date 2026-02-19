import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '@/lib/prisma';
import { hash } from 'bcryptjs';
import { getTokenFromCookies } from '../../../../lib/auth';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

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

    // Buscar o usuário atual pelo ID do token
    const currentUser = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { id: true, tipo: true, ativo: true }
    });

    if (!currentUser || currentUser.tipo !== 'ADMIN' || !currentUser.ativo) {
      return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
    }

    const { id, nome, tipo, senha, ativo, foto } = req.body;

    if (!id) {
      return res.status(400).json({ message: 'ID do usuário é obrigatório' });
    }

    // Verificar se o usuário existe
    const usuarioExistente = await prisma.usuario.findUnique({
      where: { id: id as string }
    });

    if (!usuarioExistente) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Preparar os dados para atualização
    const updateData: any = {
      nome,
      tipo,
      ativo: Boolean(ativo)
    };

    // Se foto foi fornecida, atualizar
    if (foto !== undefined) {
      updateData.foto = foto;
    }

    // Se uma nova senha foi fornecida, criptografá-la
    if (senha && senha.trim() !== '') {
      updateData.senha = await hash(senha, SALT_ROUNDS);
    }

    // Atualizar o usuário
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: id as string },
      data: updateData,
      select: {
        id: true,
        nome: true,
        email: true,
        tipo: true,
        ativo: true,
        dataCriacao: true
      }
    });

    return res.status(200).json(usuarioAtualizado);

  } catch (error: any) {
    console.error('Erro na API de edição de usuários:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
