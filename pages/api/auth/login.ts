import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

// Import the PrismaClient instance
const prisma = new PrismaClient();

// Define the Usuario type based on the Prisma model
interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha: string;
  tipo: string;
  ativo: boolean;
  dataCriacao: Date;
  ultimoAcesso: Date | null;
}

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';
const COOKIE_NAME = 'auth_token';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { email, senha } = req.body;

  try {
    console.log('Tentativa de login para o email:', email);
    
    // Verificar se o usuário existe
    const result = await prisma.$queryRaw<Usuario[]>`
      SELECT * FROM "Usuario" WHERE email = ${email} LIMIT 1
    `;
    
    const user = result[0];

    console.log('Usuário encontrado no banco:', user ? 'Sim' : 'Não');

    if (!user) {
      console.log('Usuário não encontrado para o email:', email);
      return res.status(401).json({ message: 'E-mail ou senha inválidos' });
    }

    // Verificar se a conta está ativa
    if (!user.ativo) {
      return res.status(401).json({ message: 'Esta conta está desativada' });
    }

    console.log('Senha fornecida:', senha);
    console.log('Hash da senha no banco:', user.senha);
    
    // Verificar a senha
    console.log('Iniciando comparação de senhas...');
    const senhaValida = await compare(senha, user.senha);
    console.log('Resultado da comparação:', senhaValida);
    
    if (!senhaValida) {
      console.log('Senha inválida para o usuário:', user.email);
      return res.status(401).json({ message: 'E-mail ou senha inválidos' });
    }

    // Atualizar último acesso
    await prisma.$executeRaw`
      UPDATE "Usuario" 
      SET "ultimoAcesso" = NOW() 
      WHERE id = ${user.id}::uuid
    `;

    // Criar token JWT
    const token = sign(
      { userId: user.id, email: user.email, tipo: user.tipo },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Configurar o cookie
    const cookie = serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 horas
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);

    // Retornar os dados do usuário (sem a senha)
    const { senha: _, ...usuarioSemSenha } = user;
    return res.status(200).json({
      usuario: usuarioSemSenha,
      token,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
