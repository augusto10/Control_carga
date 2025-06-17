import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import prisma from '../../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação e permissão
  const session = await getSession({ req });
  
  // Verificar se o usuário está autenticado e tem um email
  if (!session?.user?.email) {
    return res.status(401).json({ message: 'Não autorizado' });
  }

  // Buscar o usuário atual pelo email da sessão
  const user = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { tipo: true }
  });

  if (!user || user.tipo !== 'ADMIN') {
    return res.status(403).json({ message: 'Acesso negado. Permissão de administrador necessária.' });
  }

  try {
    // Obter estatísticas em paralelo
    const [
      totalUsuarios,
      usuariosAtivos,
      totalControles,
      controlesFinalizados,
      controlesPendentes,
      ultimosUsuarios
    ] = await Promise.all([
      // Total de usuários
      prisma.usuario.count(),
      
      // Usuários ativos
      prisma.usuario.count({ where: { ativo: true } }),
      
      // Total de controles
      prisma.controleCarga.count(),
      
      // Controles finalizados
      prisma.controleCarga.count({ where: { finalizado: true } }),
      
      // Controles pendentes
      prisma.controleCarga.count({ where: { finalizado: false } }),
      
      // Últimos 5 usuários cadastrados
      prisma.usuario.findMany({
        take: 5,
        orderBy: { dataCriacao: 'desc' },
        select: {
          id: true,
          nome: true,
          email: true,
          ultimoAcesso: true
        }
      })
    ]);

    // Retornar os dados
    return res.status(200).json({
      totalUsuarios,
      usuariosAtivos,
      totalControles,
      controlesFinalizados,
      controlesPendentes,
      ultimosUsuarios
    });
  } catch (error: any) {
    console.error('Erro ao obter estatísticas do dashboard:', error);
    return res.status(500).json({ 
      message: 'Erro interno do servidor',
      error: error?.message || 'Erro desconhecido'
    });
  }
}
