import { compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import prisma from '../../../lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

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
    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });

    console.log('Usuário encontrado no banco:', usuario ? 'Sim' : 'Não');

    if (!usuario) {
      console.log('Usuário não encontrado para o email:', email);
      return res.status(401).json({ message: 'E-mail ou senha inválidos' });
    }

    // Verificar se a conta está ativa
    if (!usuario.ativo) {
      return res.status(401).json({ message: 'Esta conta está desativada' });
    }

    console.log('Senha fornecida:', senha);
    console.log('Hash da senha no banco:', usuario.senha);
    
    // Verificar a senha
    console.log('Iniciando comparação de senhas...');
    const senhaValida = await compare(senha, usuario.senha);
    console.log('Resultado da comparação:', senhaValida);
    
    if (!senhaValida) {
      console.log('Senha inválida para o usuário:', usuario.email);
      return res.status(401).json({ message: 'E-mail ou senha inválidos' });
    }

    // Atualizar último acesso
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: { ultimoAcesso: new Date() },
    });

    // Criar token JWT
    const token = sign(
      { 
        userId: usuario.id,
        email: usuario.email,
        tipo: usuario.tipo 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Configurar o cookie HTTP-only
    const cookie = serialize(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);

    // Retornar dados do usuário (sem a senha)
    const { senha: _, ...usuarioSemSenha } = usuario;
    
    return res.status(200).json({
      user: usuarioSemSenha,
      token,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
