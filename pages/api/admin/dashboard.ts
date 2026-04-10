import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Buscar estatísticas do dashboard
    const [controlesFinalizados, controlesPendentes, totalUsuarios, totalMotoristas, notasProcessadas] = await Promise.all([
      // Controles finalizados (assumindo status 'FINALIZADO')
      prisma.controle.count({
        where: { status: 'FINALIZADO' }
      }),
      // Controles pendentes (status diferente de 'FINALIZADO')
      prisma.controle.count({
        where: { NOT: { status: 'FINALIZADO' } }
      }),
      // Total de usuários
      prisma.usuario.count(),
      // Total de motoristas
      prisma.motorista.count(),
      // Notas processadas (contar notas fiscais)
      prisma.notaFiscal.count()
    ]);

    // Para etiquetas geradas, podemos usar um contador ou estimativa
    // Por enquanto, vamos usar um valor fixo ou buscar de alguma tabela de logs
    const etiquetasGeradas = 0; // TODO: implementar contador real

    const dashboardData = {
      controlesFinalizados,
      controlesPendentes,
      totalUsuarios,
      totalMotoristas,
      notasProcessadas,
      etiquetasGeradas
    };

    return res.status(200).json(dashboardData);
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}