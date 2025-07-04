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

  // Buscar o usuário atual pelo ID do token
  const currentUser = await prisma.usuario.findUnique({
    where: { id: decoded.id },
    select: { id: true, tipo: true, ativo: true }
  });

  if (!currentUser || currentUser.tipo !== 'ADMIN' || !currentUser.ativo) {
    return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
  }

  const { id } = req.query;

  try {
    // Obter usuário por ID
    if (req.method === 'GET') {
      const usuario = await prisma.usuario.findUnique({
        where: { id: id as string },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
          ultimoAcesso: true
        }
      });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      return res.status(200).json(usuario);
    }

    // Atualizar usuário
    if (req.method === 'PUT') {
      const { nome, tipo, senha, ativo } = req.body;

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

      // Se uma nova senha foi fornecida, criptografá-la
      if (senha) {
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
    }

    // Excluir usuário
    if (req.method === 'DELETE') {
      // Verificar se o usuário está tentando desativar a si mesmo
      if (currentUser.id === id) {
        return res.status(400).json({ message: 'Você não pode desativar sua própria conta' });
      }

      // Verificar se o usuário existe
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { id: id as string }
      });

      if (!usuarioExistente) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      // Excluir o usuário
      await prisma.usuario.delete({
        where: { id: id as string }
      });

      return res.status(200).json({ message: 'Usuário excluído com sucesso' });
    }

    // Método não suportado
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ message: `Método ${req.method} não permitido` });
  } catch (error: any) {
    console.error('Erro na API de usuários:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
