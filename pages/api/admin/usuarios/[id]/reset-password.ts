import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../../../lib/prisma';
import { hash } from 'bcryptjs';

const SALT_ROUNDS = 10;

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
    // Redefinir senha do usuário
    if (req.method === 'POST') {
      // Verificar se o usuário existe
      const usuario = await prisma.usuario.findUnique({
        where: { id: id as string }
      });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      // Gerar uma nova senha aleatória
      const novaSenha = Math.random().toString(36).slice(-8);
      const hashedPassword = await hash(novaSenha, SALT_ROUNDS);

      // Atualizar a senha do usuário
      await prisma.usuario.update({
        where: { id: id as string },
        data: { senha: hashedPassword }
      });

      // Em um ambiente de produção, você enviaria um e-mail para o usuário com a nova senha
      // Por enquanto, retornamos a senha na resposta (apenas para desenvolvimento)
      return res.status(200).json({ 
        message: 'Senha redefinida com sucesso',
        novaSenha: novaSenha // Apenas para desenvolvimento, remover em produção
      });
    }

    // Método não suportado
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: `Método ${req.method} não permitido` });
  } catch (error: any) {
    console.error('Erro ao redefinir senha do usuário:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
