import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

// API temporária para pessoas que funciona sem campo 'tipo'
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
      console.log('🔄 [TEMP] Listando pessoas com compatibilidade (sem campo tipo)');
      
      // Buscar todos os registros da tabela Motorista (que contém todas as pessoas)
      const pessoasDb = await prisma.motorista.findMany({
        orderBy: { nome: 'asc' },
      });

      console.log(`📊 [TEMP] Encontrados ${pessoasDb.length} registros`);

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

      const pessoas = pessoasDb.map((p: any) => {
        let transportadoraId = p.transportadoraId;
        let nome = p.nome;
        let tipo = 'MOTORISTA'; // Padrão
        
        // Identificar tipo baseado na transportadora e outros indicadores
        if (p.nome.includes('[RV]')) {
          tipo = 'FUNCIONARIO';
          transportadoraId = 'RETIRA_VENDEDOR';
          nome = p.nome.replace(' [RV]', '');
        } else if (transportadoraId === 'RETIRA_VENDEDOR') {
          tipo = 'FUNCIONARIO';
        } else if (transportadoraId === 'RETIRA_CLIENTE') {
          tipo = 'CLIENTE';
        } else if (!p.cnh || p.cnh === null) {
          // Se não tem CNH, provavelmente é funcionário ou cliente
          if (transportadoraId === 'RETIRA_CLIENTE') {
            tipo = 'CLIENTE';
          } else {
            tipo = 'FUNCIONARIO';
            transportadoraId = 'RETIRA_VENDEDOR';
          }
        }
        
        // Mapear ACERT para ACCERT se necessário
        if (transportadoraId === 'ACERT') {
          transportadoraId = 'ACCERT';
        }
        
        return {
          ...p,
          nome,
          transportadoraId,
          tipo,
          tipoLabel: tipo === 'MOTORISTA' ? 'Motorista' : 
                    tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente',
          transportadora: {
            id: transportadoraId,
            descricao: transportadorasMap[transportadoraId] || transportadoraId,
          },
        };
      });

      // Filtrar por tipo se solicitado
      const tipoFiltro = req.query.tipo as string;
      let pessoasFiltradas = pessoas;
      
      if (tipoFiltro) {
        pessoasFiltradas = pessoas.filter(p => p.tipo === tipoFiltro.toUpperCase());
        console.log(`🔍 [TEMP] Filtrado por tipo ${tipoFiltro}: ${pessoasFiltradas.length} resultados`);
      }

      console.log(`✅ [TEMP] Retornando ${pessoasFiltradas.length} pessoas processadas`);
      return res.status(200).json(pessoasFiltradas);
      
    } catch (error: any) {
      console.error('❌ [TEMP] Erro ao listar pessoas:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message,
        code: error.code
      });
    }
  }

  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
