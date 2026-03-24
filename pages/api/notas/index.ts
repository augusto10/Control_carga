import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const numeroNota = req.query.numeroNota as string | undefined;
    const codigo = req.query.codigo as string | undefined;

    console.log('[API Notas] Parâmetros recebidos:', { start, end, numeroNota, codigo });

    const where: any = {};

    if (start && end) {
      try {
        // Garante que start e end sejam strings simples
        const s = Array.isArray(start) ? start[0] : start;
        const e = Array.isArray(end) ? end[0] : end;

        const startDate = new Date(`${s}T00:00:00.000Z`);
        const endDate = new Date(`${e}T23:59:59.999Z`);
        
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          where.dataCriacao = {
            gte: startDate,
            lte: endDate,
          };
        } else {
          console.warn('[API Notas] Datas inválidas:', { s, e });
        }
      } catch (dateError) {
        console.error('[API Notas] Erro ao processar datas:', dateError);
      }
    }

    if (numeroNota) {
      const n = Array.isArray(numeroNota) ? numeroNota[0] : numeroNota;
      where.numeroNota = {
        contains: String(n),
        mode: 'insensitive',
      };
    }

    if (codigo) {
      const c = Array.isArray(codigo) ? codigo[0] : codigo;
      where.codigo = {
        contains: String(c),
        mode: 'insensitive',
      };
    }

    console.log('[API Notas] Filtro where:', JSON.stringify(where));

    const notas = await prisma.notaFiscal.findMany({
      where,
      include: {
        controle: {
          select: {
            id: true,
            dataCriacao: true
          }
        },
        usuario: {
          select: {
            id: true,
            nome: true,
            email: true
          }
        }
      },
      orderBy: {
        dataCriacao: 'desc',
      },
    });

    return res.status(200).json(notas);
  } catch (error) {
    console.error('Erro ao buscar notas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
