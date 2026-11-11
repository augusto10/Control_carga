import { NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { camposAdm } from '@/lib/usuario-adm';
import { withAuth, AuthenticatedRequest } from '@/lib/middleware/withAuth';

async function handler(req: AuthenticatedRequest, res: NextApiResponse) {
  if (!['ADMIN', 'GERENTE'].includes(req.user.tipo)) {
    return res.status(403).json({ message: 'Acesso restrito à administração.' });
  }
  if (req.method === 'GET') {
    try {
      const usuarios = await prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          email: true,
          codigoAdm: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
          ultimoAcesso: true,
          foto: true,
          biometria: true,
          senhaAdm: true,
        },
        orderBy: {
          nome: 'asc',
        },
      });

      return res.status(200).json(
        usuarios.map(({ biometria, senhaAdm, ...usuario }) => ({
          ...usuario,
          temBiometria: Boolean(biometria),
          temSenhaAdm: Boolean(senhaAdm),
        }))
      );
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { nome, email, senha, tipo, ativo } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ message: 'Dados obrigatórios faltando' });
      }

      const existingUser = await prisma.usuario.findUnique({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({ message: 'Email já cadastrado' });
      }

      let adm: ReturnType<typeof camposAdm>;
      try { adm = camposAdm(req.body); } catch (error) {
        return res.status(400).json({ message: (error as Error).message });
      }

      const hashedPassword = await bcrypt.hash(senha, 10);

      const usuario = await prisma.usuario.create({
        data: {
          ...adm,
          nome,
          email,
          senha: hashedPassword,
          tipo: tipo || 'USUARIO',
          ativo: ativo !== undefined ? ativo : true,
        },
        select: {
          id: true,
          nome: true,
          email: true,
          codigoAdm: true,
          tipo: true,
          ativo: true,
          dataCriacao: true,
        },
      });

      return res.status(201).json(usuario);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
}

export default withAuth(handler);
