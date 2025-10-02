// =====================================================
// CORREÇÃO TEMPORÁRIA PARA APIs - COMPATIBILIDADE COM PRODUÇÃO
// =====================================================
// Este script cria versões das APIs que funcionam com o schema antigo
// até que a migração seja executada no banco de produção

import { NextApiRequest, NextApiResponse } from 'next';

// Função para detectar se estamos em produção e o schema é antigo
export async function isSchemaAntigo(prisma: any): Promise<boolean> {
  try {
    // Tentar fazer uma query que só funciona com schema novo
    await prisma.motorista.findFirst({
      select: { tipo: true }
    });
    return false; // Schema novo
  } catch (error: any) {
    if (error.message?.includes('column') && error.message?.includes('tipo')) {
      return true; // Schema antigo - campo tipo não existe
    }
    throw error; // Outro erro
  }
}

// Função para detectar se ACERT existe no enum
export async function hasAcertEnum(prisma: any): Promise<boolean> {
  try {
    // Tentar criar um registro temporário com ACERT
    const test = await prisma.$queryRaw`
      SELECT 'ACERT'::Transportadora as test
    `;
    return true; // ACERT existe no enum
  } catch (error: any) {
    if (error.message?.includes('ACERT') && error.message?.includes('enum')) {
      return false; // ACERT não existe no enum
    }
    return true; // Assumir que existe se não conseguir determinar
  }
}

// Wrapper para API de motoristas compatível com schema antigo
export function wrapMotoristaApi(originalHandler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const schemaAntigo = await isSchemaAntigo(prisma);
      const hasAcert = await hasAcertEnum(prisma);
      
      if (schemaAntigo) {
        console.log('🔄 [COMPAT] Usando modo compatibilidade - schema antigo detectado');
        return await handleMotoristaCompatibilidade(req, res, prisma, hasAcert);
      } else {
        console.log('✅ [COMPAT] Usando handler original - schema novo detectado');
        return await originalHandler(req, res);
      }
    } catch (error) {
      console.error('❌ [COMPAT] Erro na detecção de schema:', error);
      // Em caso de erro, tentar o handler original
      return await originalHandler(req, res);
    } finally {
      await prisma.$disconnect();
    }
  };
}

// Handler compatível para motoristas com schema antigo
async function handleMotoristaCompatibilidade(
  req: NextApiRequest, 
  res: NextApiResponse, 
  prisma: any,
  hasAcert: boolean
) {
  if (req.method === 'GET') {
    try {
      // Buscar todos os motoristas (sem filtro por tipo)
      const motoristasDb = await prisma.motorista.findMany({
        orderBy: { nome: 'asc' },
      });

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
          tipo: 'MOTORISTA', // Assumir que todos são motoristas no schema antigo
          transportadora: {
            id: transportadoraId,
            descricao: transportadorasMap[transportadoraId] || transportadoraId,
          },
        };
      });

      return res.status(200).json(motoristas);
    } catch (error) {
      console.error('❌ [COMPAT] Erro ao listar motoristas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  
  if (req.method === 'POST') {
    // Implementar criação compatível se necessário
    return res.status(501).json({ error: 'Criação não implementada no modo compatibilidade' });
  }
  
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}

// Wrapper para API de notas compatível com enum antigo
export function wrapNotasApi(originalHandler: Function) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const hasAcert = await hasAcertEnum(prisma);
      
      if (!hasAcert) {
        console.log('🔄 [COMPAT] Usando modo compatibilidade - ACERT não existe no enum');
        return await handleNotasCompatibilidade(req, res, prisma);
      } else {
        console.log('✅ [COMPAT] Usando handler original - enum atualizado');
        return await originalHandler(req, res);
      }
    } catch (error) {
      console.error('❌ [COMPAT] Erro na detecção de enum:', error);
      // Em caso de erro, tentar o handler original
      return await originalHandler(req, res);
    } finally {
      await prisma.$disconnect();
    }
  };
}

// Handler compatível para notas com enum antigo
async function handleNotasCompatibilidade(
  req: NextApiRequest, 
  res: NextApiResponse, 
  prisma: any
) {
  if (req.method === 'GET') {
    try {
      // Buscar notas sem filtros que possam causar erro de enum
      const notas = await prisma.notaFiscal.findMany({
        include: {
          controle: {
            select: {
              id: true,
              motorista: true,
              transportadora: true,
              finalizado: true
            }
          }
        },
        orderBy: { dataCriacao: 'desc' },
        take: 100 // Limitar para evitar sobrecarga
      });

      // Mapear transportadoras problemáticas
      const notasMapeadas = notas.map((nota: any) => {
        if (nota.controle && nota.controle.transportadora === 'ACERT') {
          nota.controle.transportadora = 'ACCERT';
        }
        return nota;
      });

      return res.status(200).json(notasMapeadas);
    } catch (error) {
      console.error('❌ [COMPAT] Erro ao listar notas:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
  
  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}

export default {
  wrapMotoristaApi,
  wrapNotasApi,
  isSchemaAntigo,
  hasAcertEnum
};
