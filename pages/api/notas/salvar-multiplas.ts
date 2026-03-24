import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

type NotaPayload = {
  codigo?: string;
  numeroNota?: string;
  volumes?: string | number;
  usuarioId?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const notas = Array.isArray(req.body?.notas) ? (req.body.notas as NotaPayload[]) : [];

    if (notas.length === 0) {
      return res.status(400).json({ message: 'Nenhuma nota enviada' });
    }

    const normalizadas = notas.map((nota) => ({
      codigo: String(nota.codigo || '').trim(),
      numeroNota: String(nota.numeroNota || '').trim(),
      volumes: String(nota.volumes || '1').trim(),
      usuarioId: nota.usuarioId
    }));

    if (normalizadas.some((nota) => !nota.codigo || !nota.numeroNota)) {
      return res.status(400).json({ message: 'Código e número da nota são obrigatórios' });
    }

    const chaves = new Set<string>();
    for (const nota of normalizadas) {
      const key = `${nota.codigo}||${nota.numeroNota}`;
      if (chaves.has(key)) {
        return res.status(400).json({ message: 'Nota já escaneada anteriormente' });
      }
      chaves.add(key);
    }

    const existentes = await prisma.notaFiscal.findMany({
      where: {
        OR: normalizadas.map((nota) => ({
          codigo: nota.codigo,
          numeroNota: nota.numeroNota
        }))
      },
      select: {
        id: true
      }
    });

    if (existentes.length > 0) {
      return res.status(400).json({ message: 'Nota já escaneada anteriormente' });
    }

    const criadas = await prisma.$transaction(
      normalizadas.map((nota) =>
        prisma.notaFiscal.create({
          data: {
            codigo: nota.codigo,
            numeroNota: nota.numeroNota,
            volumes: nota.volumes || '1',
            usuarioId: nota.usuarioId || undefined
          }
        })
      )
    );

    return res.status(201).json({ success: true, data: criadas });
  } catch (error) {
    console.error('Erro ao salvar notas:', error);
    return res.status(500).json({ message: 'Erro interno do servidor' });
  }
}
