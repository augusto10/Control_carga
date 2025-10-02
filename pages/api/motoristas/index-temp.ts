import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

// API temporária para motoristas que funciona com schema antigo
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
      console.log('🔄 [TEMP] Listando motoristas com compatibilidade');
      
      // Buscar todos os motoristas (sem filtro por tipo que não existe)
      const motoristasDb = await prisma.motorista.findMany({
        orderBy: { nome: 'asc' },
      });

      console.log(`📊 [TEMP] Encontrados ${motoristasDb.length} registros`);

      // Mapeamento das transportadoras
      const transportadorasMap: Record<string, string> = {
        'ACERT': 'ACCERT Transportes',
        'ACCERT': 'ACCERT Transportes', 
        'EXPRESSO_GOIAS': 'Expresso Goiás',
        'TERCEIRIZADA': 'Terceirizada',
        'DETAFRA_TRANSPORTES': 'Detafra Transportes',
        'RETIRA_VENDEDOR': 'Retira Vendedor',
        'RETIRA_CLIENTE': 'Retira Cliente'
      };

      const motoristas = motoristasDb.map((m: any) => {
        let transportadoraId = m.transportadoraId;
        let nome = m.nome;
        
        // Identificar motoristas "RETIRA_VENDEDOR" pelo marcador [RV] no nome
        if (m.nome.includes('[RV]')) {
          transportadoraId = 'RETIRA_VENDEDOR';
          nome = m.nome.replace(' [RV]', '');
        }
        
        // Mapear ACERT para ACCERT se necessário
        if (transportadoraId === 'ACERT') {
          transportadoraId = 'ACCERT';
        }
        
        return {
          ...m,
          nome,
          transportadoraId,
          tipo: 'MOTORISTA', // Assumir que todos são motoristas
          transportadora: {
            id: transportadoraId,
            descricao: transportadorasMap[transportadoraId] || transportadoraId,
          },
        };
      });

      console.log(`✅ [TEMP] Retornando ${motoristas.length} motoristas processados`);
      return res.status(200).json(motoristas);
      
    } catch (error: any) {
      console.error('❌ [TEMP] Erro ao listar motoristas:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message,
        code: error.code
      });
    }
  }

  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
