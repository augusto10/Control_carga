import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../../lib/prisma';
import { hash } from 'bcryptjs';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação via cookie JWT
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;

  if (!token) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  let decoded: any;
  try {
    decoded = verify(token, JWT_SECRET) as { id: string; tipo: string; email: string };
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }

  // Buscar usuário e verificar se é administrador
  const user = await prisma.usuario.findUnique({
    where: { id: decoded.id },
    select: { id: true, tipo: true, ativo: true }
  });

  if (!user || user.tipo !== 'ADMIN' || !user.ativo) {
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
