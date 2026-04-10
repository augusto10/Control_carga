import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Buscar atividades recentes
    // Podemos buscar dos controles mais recentes, notas fiscais, etc.
    const recentControles = await prisma.controle.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      include: {
        usuario: { select: { nome: true } }
      }
    });

    const recentNotas = await prisma.notaFiscal.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        controle: {
          include: {
            usuario: { select: { nome: true } }
          }
        }
      }
    });

    // Combinar e ordenar por data
    const activities = [
      ...recentControles.map(c => ({
        id: `controle-${c.id}`,
        user: c.usuario?.nome || 'Sistema',
        action: `Atualizou controle ${c.numero || c.id}`,
        time: new Date(c.updatedAt).toLocaleString('pt-BR'),
        type: c.status === 'FINALIZADO' ? 'success' : 'info'
      })),
      ...recentNotas.map(n => ({
        id: `nota-${n.id}`,
        user: n.controle?.usuario?.nome || 'Sistema',
        action: `Adicionou nota fiscal ${n.numero}`,
        time: new Date(n.createdAt).toLocaleString('pt-BR'),
        type: 'info'
      }))
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    return res.status(200).json(activities);
  } catch (error) {
    console.error('Erro ao buscar atividades recentes:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}