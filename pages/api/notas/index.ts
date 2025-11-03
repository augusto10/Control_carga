import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

// API temporária para notas que funciona com enum antigo
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      const { start, end } = req.query;
      console.log('🔄 [TEMP] Listando notas com compatibilidade');
      console.log('📅 [TEMP] Filtros recebidos:', { start, end });
      
      // Construir filtros de data
      const where: any = {};
      if (start || end) {
        where.dataCriacao = {};
        if (start) {
          where.dataCriacao.gte = new Date(`${start}T00:00:00`);
          console.log('📅 [TEMP] Data início:', where.dataCriacao.gte);
        }
        if (end) {
          where.dataCriacao.lte = new Date(`${end}T23:59:59`);
          console.log('📅 [TEMP] Data fim:', where.dataCriacao.lte);
        }
      }
      
      // Buscar notas com filtros aplicados
      const notas = await prisma.notaFiscal.findMany({
        where,
        orderBy: { dataCriacao: 'desc' },
        take: 500 // Aumentar limite para permitir mais resultados
      });

      console.log(`📊 [TEMP] Encontradas ${notas.length} notas com filtros:`, where);
      
      if (notas.length > 0) {
        console.log('📅 [TEMP] Primeira nota:', {
          id: notas[0].id,
          numeroNota: notas[0].numeroNota,
          dataCriacao: notas[0].dataCriacao
        });
        console.log('📅 [TEMP] Última nota:', {
          id: notas[notas.length - 1].id,
          numeroNota: notas[notas.length - 1].numeroNota,
          dataCriacao: notas[notas.length - 1].dataCriacao
        });
      }

      // Buscar controles separadamente para evitar erro de enum
      const notasComControles = await Promise.all(
        notas.map(async (nota) => {
          if (nota.controleId) {
            try {
              const controle = await prisma.controleCarga.findUnique({
                where: { id: nota.controleId },
                select: {
                  id: true,
                  motorista: true,
                  transportadora: true,
                  finalizado: true
                }
              });
              
              // Mapear ACERT para ACCERT se necessário
              if (controle && (controle.transportadora as string) === 'ACERT') {
                (controle as any).transportadora = 'ACCERT';
              }
              
              return {
                ...nota,
                controle
              };
            } catch (error) {
              console.warn(`⚠️ [TEMP] Erro ao buscar controle ${nota.controleId}:`, error);
              return {
                ...nota,
                controle: null
              };
            }
          }
          
          return {
            ...nota,
            controle: null
          };
        })
      );

      console.log(`✅ [TEMP] Retornando ${notasComControles.length} notas processadas`);
      return res.status(200).json(notasComControles);
      
    } catch (error: any) {
      console.error('❌ [TEMP] Erro ao listar notas:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message,
        code: error.code
      });
    }
  }

  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
