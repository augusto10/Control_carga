import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { Transportadora } from '@prisma/client';
import { getTokenFromCookies, verifyToken } from '@/lib/auth';

// Constantes de configuração
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

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

  if (req.method === 'POST') {
    return await criarMotorista(req, res);
  }

  return res.status(405).json({ error: `Método ${req.method} não permitido` });
}

async function criarMotorista(req: NextApiRequest, res: NextApiResponse) {
  // Verificar autenticação usando função utilitária
  console.log('[Auth] Extraindo token dos cookies usando função utilitária');
  const token = getTokenFromCookies(req);
  console.log('[Auth] Token de autenticação:', !!token);
  
  if (!token) {
    console.log('[Auth] Token não encontrado nos cookies');
    return res.status(401).json({ error: 'Não autenticado' });
  }

  // Verificar o token JWT usando função utilitária
  console.log('[Auth] Verificando token com função utilitária');
  const decoded = await verifyToken(token, JWT_SECRET);
  console.log('[Auth] Token decodificado:', decoded ? '***SUCCESS***' : '***FAILED***');
  
  if (!decoded || !decoded.id) {
    console.log('[Auth] Token inválido ou sem ID de usuário');
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Verificar se o usuário tem permissão
  console.log('Verificando permissões do usuário:', decoded.id);
  const usuario = await prisma.usuario.findUnique({
    where: { id: decoded.id },
    select: { tipo: true }
  });
  
  console.log('Tipo de usuário:', usuario?.tipo);

  const isAdmin = usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GERENTE';
  console.log('Usuário é admin/gerente:', isAdmin);
  
  // Apenas admins e gerentes podem criar motoristas
  if (!isAdmin) {
    console.log('Usuário sem permissão para criar motorista');
    return res.status(403).json({ error: 'Sem permissão para criar motorista' });
  }

  const { nome, telefone, cpf, cnh, transportadoraId } = req.body as {
    nome?: string;
    telefone?: string;
    cpf?: string;
    cnh?: string;
    transportadoraId?: Transportadora;
  };

  console.log('[Motorista] Dados recebidos:', { nome, telefone, cpf, cnh, transportadoraId });
  console.log('[Motorista] Tipo da transportadoraId:', typeof transportadoraId);

  if (!nome?.trim()) return res.status(400).json({ error: 'Nome é obrigatório' });
  if (!telefone?.trim()) return res.status(400).json({ error: 'Telefone é obrigatório' });
  if (!cpf?.trim()) return res.status(400).json({ error: 'CPF é obrigatório' });
  if (!cnh?.trim()) return res.status(400).json({ error: 'CNH é obrigatório' });
  if (!transportadoraId?.trim())
    return res.status(400).json({ error: 'Transportadora é obrigatória' });

  // Validar se a transportadora é válida
  const transportadorasValidas = ['ACCERT', 'EXPRESSO_GOIAS', 'TERCEIRIZADA', 'DETAFRA_TRANSPORTES', 'RETIRA_VENDEDOR', 'RETIRA_CLIENTE'];
  if (!transportadorasValidas.includes(transportadoraId)) {
    return res.status(400).json({ 
      error: `Transportadora inválida: ${transportadoraId}. Valores aceitos: ${transportadorasValidas.join(', ')}` 
    });
  }

  // SOLUÇÃO TEMPORÁRIA: Mapear RETIRA_VENDEDOR para uma transportadora existente no banco
  // Isso permite que a funcionalidade funcione sem alterar o enum do banco
  let transportadoraParaBanco = transportadoraId as Transportadora;
  if ((transportadoraId as string) === 'RETIRA_VENDEDOR') {
    transportadoraParaBanco = 'TERCEIRIZADA' as Transportadora; // Usar TERCEIRIZADA como base no banco
    console.log('[Motorista] Mapeando RETIRA_VENDEDOR -> TERCEIRIZADA para compatibilidade com banco');
  }

  try {
    console.log('[Motorista] Verificando duplicidade por CPF:', cpf);
    
    // Verificar duplicidade por CPF
    const existente = await prisma.motorista.findUnique({ where: { cpf } });
    if (existente) {
      console.log('[Motorista] CPF já existe:', existente);
      return res.status(400).json({ error: 'Já existe motorista com esse CPF' });
    }

    console.log('[Motorista] Criando motorista com dados:', { 
      nome, telefone, cpf, cnh, 
      transportadoraOriginal: transportadoraId,
      transportadoraParaBanco 
    });
    
    // Criar motorista usando a transportadora mapeada para o banco
    // Se for RETIRA_VENDEDOR, adicionar um marcador no nome para identificar depois
    let nomeParaSalvar = nome;
    if ((transportadoraId as string) === 'RETIRA_VENDEDOR') {
      nomeParaSalvar = `${nome} [RV]`; // Adicionar marcador [RV] = Retira Vendedor
    }
    
    const novo = await prisma.motorista.create({
      data: { 
        nome: nomeParaSalvar, 
        telefone, 
        cpf, 
        cnh, 
        transportadoraId: transportadoraParaBanco,
        tipo: 'MOTORISTA' // Garantir que é do tipo MOTORISTA
      },
    });
    
    // Se foi mapeado RETIRA_VENDEDOR, ajustar o retorno para mostrar a transportadora original e nome limpo
    if ((transportadoraId as string) === 'RETIRA_VENDEDOR') {
      (novo as any).transportadoraId = 'RETIRA_VENDEDOR';
      (novo as any).nome = nome; // Retornar nome sem o marcador
    }
    
    console.log('[Motorista] Motorista criado com sucesso:', novo);
    
    return res.status(201).json(novo);
  } catch (error: any) {
    console.error('[Motorista] Erro detalhado ao criar motorista:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack
    });
    return res.status(500).json({ 
      error: 'Erro interno do servidor', 
      message: error.message,
      code: error.code,
      details: error.meta 
    });
  }
}
