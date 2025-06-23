import { NextApiRequest, NextApiResponse } from 'next';
import { verify } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação via cookie HTTP-only
  const cookies = parseCookies({ req });
  const token = cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  
  try {
    // Verificar o token JWT
    const decoded = verify(token, JWT_SECRET) as { id: string; email: string; tipo: string };
    
    // Buscar o usuário atual pelo ID do token
    const user = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { tipo: true, ativo: true }
    });

    if (!user || user.tipo !== 'ADMIN' || !user.ativo) {
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
            tipo: true,
            dataCriacao: true
          }
        })
      ]);

      // Obter estatísticas de controle de carga por status (finalizado/pendente)
      const totalFinalizados = await prisma.controleCarga.count({ where: { finalizado: true } });
      const totalPendentes = await prisma.controleCarga.count({ where: { finalizado: false } });

      // Formatar dados para o gráfico
      const dadosGrafico = [
        { status: 'FINALIZADO', quantidade: totalFinalizados },
        { status: 'PENDENTE', quantidade: totalPendentes }
      ];

      // Retornar os dados do dashboard
      return res.status(200).json({
        totalUsuarios,
        usuariosAtivos,
        totalControles,
        controlesFinalizados,
        controlesPendentes,
        ultimosUsuarios: ultimosUsuarios.map(user => ({
          ...user,
          dataCriacao: user.dataCriacao.toISOString()
        })),
        graficoStatus: dadosGrafico
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(401).json({ message: 'Token inválido ou expirado' });
  }
}
