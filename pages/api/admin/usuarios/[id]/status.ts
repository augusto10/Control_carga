import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import prisma from '../../../../../lib/prisma';

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
    // Atualizar status do usuário
    if (req.method === 'PATCH') {
      const { ativo } = req.body;

      // Verificar se o usuário está tentando alterar seu próprio status
      if (currentUser.id === id) {
        return res.status(400).json({ message: 'Você não pode alterar seu próprio status' });
      }

      // Verificar se o usuário existe
      const usuarioExistente = await prisma.usuario.findUnique({
        where: { id: id as string }
      });

      if (!usuarioExistente) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      // Atualizar o status do usuário
      const usuarioAtualizado = await prisma.usuario.update({
        where: { id: id as string },
        data: { ativo: Boolean(ativo) },
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

    // Método não suportado
    res.setHeader('Allow', ['PATCH']);
    return res.status(405).json({ message: `Método ${req.method} não permitido` });
  } catch (error: any) {
    console.error('Erro ao atualizar status do usuário:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
