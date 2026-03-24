import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const usuarios = await prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
          ultimoAcesso: true,
          foto: true,
        },
        orderBy: {
          nome: 'asc',
        },
      });

      return res.status(200).json(usuarios);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nome, email, senha, tipo, ativo } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Dados obrigatórios faltando' });
      }

      const existingUser = await prisma.usuario.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      const hashedPassword = await bcrypt.hash(senha, 10);

      const usuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          senha: hashedPassword,
          tipo: tipo || 'USUARIO',
          ativo: ativo !== undefined ? ativo : true,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
        },
      });

      return res.status(201).json(usuario);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}
