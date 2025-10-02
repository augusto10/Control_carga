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
      console.log('🔄 [TEMP] Listando notas com compatibilidade');
      
      // Buscar notas sem joins que possam causar erro de enum
      const notas = await prisma.notaFiscal.findMany({
        orderBy: { dataCriacao: 'desc' },
        take: 100 // Limitar para evitar sobrecarga
      });

      console.log(`📊 [TEMP] Encontradas ${notas.length} notas`);

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
