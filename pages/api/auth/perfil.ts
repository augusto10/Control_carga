import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Usuario } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { parseCookies } from 'nookies';
import { compare, hash } from 'bcryptjs';
import { ApiResponse } from '../../../types/api';

const SALT_ROUNDS = 10;
const prisma = new PrismaClient();

interface TokenPayload {
  id: string;
  email: string;
  tipo: string;
  nome: string;
  iat: number;
  exp: number;
}

interface ProfileUpdateData {
  nome: string;
  email: string;
  senhaAtual?: string;
  novaSenha?: string;
}

interface UsuarioWithSenha {
  id: string;
  nome: string;
  email: string;
  senha: string;
  tipo: string;
  ativo: boolean;
  dataCriacao: Date;
  ultimoAcesso: Date | null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<any>>
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ 
      success: false,
      error: {
        message: 'Método não permitido'
      }
    });
  }

  // Verificar autenticação
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ 
      success: false,
      error: {
        message: 'Não autenticado'
      }
    });
  }
  
  let userId: string;
  
  try {
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_segredo_secret') as TokenPayload;
    userId = decoded.id;
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(401).json({ 
      success: false,
      error: {
        message: 'Sessão inválida ou expirada'
      }
    });
  }

  const { nome, email, senhaAtual, novaSenha } = req.body as ProfileUpdateData;

  try {
    // Buscar o usuário atual pelo ID com os campos necessários
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nome: true,
        email: true,
        senha: true,
        tipo: true,
        ativo: true,
        dataCriacao: true,
        ultimoAcesso: true
      }
    }) as UsuarioWithSenha | null;

    if (!usuario) {
      return res.status(404).json({ 
        success: false,
        error: {
          message: 'Usuário não encontrado'
        }
      });
    }

    // Verificar se o usuário está ativo
    if (!usuario.ativo) {
      return res.status(403).json({
        success: false,
        error: {
          message: 'Sua conta está desativada. Entre em contato com o administrador.'
        }
      });
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
        return res.status(400).json({ 
          success: false,
          error: {
            message: 'Este e-mail já está em uso por outro usuário'
          }
        });
      }
    }

    // Se estiver alterando a senha, verificar a senha atual
    if (novaSenha) {
      if (!senhaAtual) {
        return res.status(400).json({ 
          success: false,
          error: {
            message: 'A senha atual é obrigatória'
          }
        });
      }

      const senhaValida = await compare(senhaAtual, usuario.senha);
      
      if (!senhaValida) {
        return res.status(400).json({ 
          success: false,
          error: {
            message: 'Senha atual incorreta'
          }
        });
      }

      // Validar força da nova senha
      if (novaSenha.length < 8) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'A nova senha deve ter pelo menos 8 caracteres'
          }
        });
      }
      
      // Verificar se a senha atende aos requisitos de complexidade
      const hasUpperCase = /[A-Z]/.test(novaSenha);
      const hasLowerCase = /[a-z]/.test(novaSenha);
      const hasNumbers = /\d/.test(novaSenha);
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(novaSenha);
      
      if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial'
          }
        });
      }
    }

    // Preparar os dados para atualização
    const updateData: {
      nome: string;
      email: string;
      senha?: string;
    } = {
      nome: nome || usuario.nome,
      email: email || usuario.email
    };

    // Se houver nova senha, criptografá-la
    if (novaSenha) {
      updateData.senha = await hash(novaSenha, SALT_ROUNDS);
    }

    // Iniciar uma transação para garantir a consistência dos dados
    const [usuarioAtualizado] = await prisma.$transaction([
      // Atualizar os dados do usuário
      prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          ...updateData,
          ultimoAcesso: new Date() // Atualiza o último acesso na mesma operação
        },
        select: {
          id: true,
          nome: true,
          email: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
          ultimoAcesso: true
        }
      })
    ]);

    return res.status(200).json({
      success: true,
      data: usuarioAtualizado
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return res.status(500).json({
      success: false,
      error: {
        message: 'Erro interno do servidor',
        error: errorMessage
      }
    });
  } finally {
    await prisma.$disconnect();
  }
}
