import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';

// API temporária para buscar pessoas para controles (sem campo tipo)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      console.log('🔄 [TEMP] Buscando pessoas para controles (compatibilidade)');
      
      // Buscar todos os registros da tabela Motorista
      const pessoasDb = await prisma.motorista.findMany({
        orderBy: { nome: 'asc' },
      });

      console.log(`📊 [TEMP] Encontrados ${pessoasDb.length} registros no banco`);

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
        
        // Determinar ícone por tipo
        const tipoIcon = tipo === 'MOTORISTA' ? '🚛' : 
                        tipo === 'FUNCIONARIO' ? '👨‍💼' : '🏢';
        
        const tipoLabel = tipo === 'MOTORISTA' ? 'Motorista' : 
                         tipo === 'FUNCIONARIO' ? 'Funcionário' : 'Cliente';
        
        return {
          id: p.id,
          nome,
          cpf: p.cpf,
          telefone: p.telefone || '',
          email: p.email || '',
          cnh: p.cnh,
          transportadoraId,
          tipo,
          tipoLabel,
          // Para o dropdown
          label: `${tipoIcon} ${nome} (${tipoLabel})`,
          value: p.id,
          transportadoraDescricao: transportadorasMap[transportadoraId] || transportadoraId,
        };
      });

      console.log(`✅ [TEMP] Processadas ${pessoas.length} pessoas para dropdown`);
      
      // Estatísticas por tipo
      const motoristas = pessoas.filter(p => p.tipo === 'MOTORISTA');
      const funcionarios = pessoas.filter(p => p.tipo === 'FUNCIONARIO');
      const clientes = pessoas.filter(p => p.tipo === 'CLIENTE');
      
      console.log(`📊 [TEMP] Tipos: ${motoristas.length} motoristas, ${funcionarios.length} funcionários, ${clientes.length} clientes`);
      
      return res.status(200).json(pessoas);
      
    } catch (error: any) {
      console.error('❌ [TEMP] Erro ao buscar pessoas para controles:', error);
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error.message,
        code: error.code
      });
    }
  }

  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}
