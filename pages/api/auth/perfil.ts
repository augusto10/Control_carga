import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import { prisma } from '../../../prisma/config';
import { PrismaClientWithConfiguracaoSistema } from '../../../prisma/config';
import { ApiError, ApiResponse } from '../../../types/api';
import { compare, hash } from 'bcryptjs';

const SALT_ROUNDS = 10;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const session = await getSession({ req });
  
  // Verificar se o usuário está autenticado e tem um email
  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  const { nome, email, senhaAtual, novaSenha } = req.body;

  try {
    // Buscar o usuário atual pelo email da sessão
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Verificar se o e-mail já está em uso por outro usuário
    if (email && email !== usuario.email) {
      const emailEmUso = await prisma.usuario.findFirst({
        where: {
          email,
          NOT: { id: usuario.id }
        }
      });

      if (emailEmUso) {
        return res.status(400).json({ message: 'Este e-mail já está em uso por outro usuário' });
      }
    }

    // Se estiver alterando a senha, verificar a senha atual
    if (novaSenha) {
      if (!senhaAtual) {
        return res.status(400).json({ message: 'A senha atual é obrigatória' });
      }

      const senhaValida = await compare(senhaAtual, usuario.senha);
      
      if (!senhaValida) {
        return res.status(400).json({ message: 'Senha atual incorreta' });
      }

      // Validar força da nova senha
      if (novaSenha.length < 6) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'A nova senha deve ter pelo menos 6 caracteres'
          }
        });
      }
    }

    // Preparar os dados para atualização
    const updateData: any = {
      nome: nome || usuario.nome,
      email: email || usuario.email
    };

    // Se houver nova senha, criptografá-la
    if (novaSenha) {
      updateData.senha = await hash(novaSenha, SALT_ROUNDS);
    }

    // Atualizar o usuário no banco de dados
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: updateData,
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

    // Atualizar a data do último acesso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcesso: new Date() }
    });

    return res.status(200).json({
      success: true,
      data: usuarioAtualizado
    });
  } catch (error: any) {
    console.error('Erro ao atualizar perfil:', error);
    const apiError: ApiError = {
      message: 'Erro interno do servidor',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    };
    return res.status(500).json({
      success: false,
      error: apiError
    });
  }
}
