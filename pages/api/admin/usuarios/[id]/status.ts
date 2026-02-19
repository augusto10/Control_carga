import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação e permissão
  const session = await getSession({ req });
  
  // Verificar se o usuário está autenticado e tem um email
  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Buscar o usuário atual pelo email da sessão
  const currentUser = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { id: true, tipo: true }
  });

  if (!currentUser || currentUser.tipo !== 'ADMIN') {
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
