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
      return res.status(400).json({ error: 'ID de controle inválido' });
    }

    // Verificar se o controle existe
    const controle = await prisma.controleCarga.findUnique({
      where: { id },
      include: {
        notas: true
      }
    });

    if (!controle) {
      return res.status(404).json({ error: 'Controle não encontrado' });
    }

    // Verificar se o usuário tem permissão
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { tipo: true }
    });

    const isAdmin = usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GERENTE';
    
    // Apenas admins e gerentes podem excluir controles
    if (!isAdmin) {
      return res.status(403).json({ error: 'Sem permissão para excluir este controle' });
    }

    // Verificar se o controle está finalizado
    if (controle.finalizado) {
      // Apenas admins podem excluir controles finalizados
      if (usuario?.tipo !== 'ADMIN') {
        return res.status(400).json({ error: 'Apenas administradores podem excluir controles finalizados' });
      }
    }

    // Desvincular as notas antes de excluir o controle
    if (controle.notas.length > 0) {
      await prisma.notaFiscal.updateMany({
        where: { controleId: id },
        data: { controleId: null }
      });
    }

    // Excluir o controle
    await prisma.controleCarga.delete({
      where: { id }
    });

    return res.status(200).json({ message: 'Controle excluído com sucesso' });

  } catch (error) {
    console.error('Erro ao excluir controle:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
