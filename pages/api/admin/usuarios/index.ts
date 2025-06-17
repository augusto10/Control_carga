import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../../lib/prisma';
import { hash } from 'bcryptjs';

const SALT_ROUNDS = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação e permissão
  const session = await getSession({ req });
  
  if (!session) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Verificar se o usuário está autenticado e tem um email
  if (!session.user?.email) {
    return res.status(401).json({ message: 'Usuário não autenticado' });
  }

  // Verificar se o usuário é administrador
  const user = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true, tipo: true }
  });

  if (!user || user.tipo !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
  }

  try {
    // Listar todos os usuários (exceto a senha)
    if (req.method === 'GET') {
      const usuarios = await prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
          ultimoAcesso: true
        },
        orderBy: { nome: 'asc' }
      });
      
      return res.status(200).json(usuarios);
    }

    // Criar novo usuário
    if (req.method === 'POST') {
      const { nome, email, tipo, senha, ativo = true } = req.body;

      // Validação dos dados
      if (!nome || !email || !tipo || !senha) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
      }

      // Verificar se o e-mail já existe
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { email }
      });

      if (usuarioExistente) {
        return res.status(400).json({ message: 'Este e-mail já está em uso' });
      }

      // Criptografar a senha
      const hashedPassword = await hash(senha, SALT_ROUNDS);

      // Criar o usuário
      const novoUsuario = await prisma.usuario.create({
        data: {
          nome,
          email,
          tipo,
          senha: hashedPassword,
          ativo: Boolean(ativo)
        },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          dataCriacao: true
        }
      });

      return res.status(201).json(novoUsuario);
    }

    // Método não suportado
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Método ${req.method} não permitido` });
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
