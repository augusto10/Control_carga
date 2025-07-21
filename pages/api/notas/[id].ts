import { NextApiRequest, NextApiResponse } from 'next';
import { parseCookies } from 'nookies';
import { verify } from 'jsonwebtoken';
import prisma from '../../../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Verificar autenticação
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    // Verificar o token JWT
    const decoded = verify(token, JWT_SECRET) as { id: string };
    
    // Verificar se o método é DELETE
    if (req.method !== 'DELETE') {
      return res.status(405).json({ error: 'Método não permitido' });
    }

    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ error: 'ID de nota inválido' });
    }

    // Verificar se a nota existe
    const nota = await prisma.notaFiscal.findUnique({
      where: { id },
      include: {
        controle: {
          select: {
            finalizado: true
          }
        }
      }
    });

    if (!nota) {
      return res.status(404).json({ error: 'Nota não encontrada' });
    }

    // Verificar se o controle está finalizado
    if (nota.controle?.finalizado) {
      return res.status(400).json({ error: 'Não é possível excluir uma nota de um controle finalizado' });
    }

    // Verificar se o usuário tem permissão
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { tipo: true }
    });

    if (!usuario) {
      return res.status(403).json({ error: 'Usuário não encontrado' });
    }

    const isAdmin = usuario.tipo === 'ADMIN' || usuario.tipo === 'GERENTE';
    const isUsuario = usuario.tipo === 'USUARIO';
    
    // Admins e gerentes podem excluir qualquer nota não finalizada
    // Usuários podem excluir apenas notas não vinculadas
    if (!isAdmin && (!isUsuario || nota.controleId)) {
      return res.status(403).json({ error: 'Sem permissão para excluir esta nota' });
    }

    // Excluir a nota
    await prisma.notaFiscal.delete({
      where: { id }
    });

    return res.status(200).json({ message: 'Nota excluída com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir nota:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
