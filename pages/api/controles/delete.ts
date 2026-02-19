import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { getTokenFromCookies, verifyToken } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'https://controle-carga-web.vercel.app',
  /^https:\/\/.*\.vercel\.app$/
];

// Middleware CORS otimizado
const allowCors = (fn: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin || '';
  
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    return await fn(req, res);
  } catch (error) {
    console.error('Erro no handler:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { id } = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'ID do controle é obrigatório' });
    }

    // Extrair e verificar token JWT usando função utilitária
    console.log('[Delete] Extraindo token dos cookies');
    const token = getTokenFromCookies(req);
    if (!token) {
      console.log('[Delete] Token não encontrado');
      return res.status(401).json({ error: 'Token não encontrado' });
    }

    console.log('[Delete] Verificando token');
    const decoded = await verifyToken(token, JWT_SECRET);
    if (!decoded) {
      console.log('[Delete] Token inválido ou expirado');
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    
    console.log('[Delete] Token verificado, usuário:', decoded.id);
    
    // Buscar usuário para verificar permissões
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { tipo: true }
    });
    
    if (!usuario) {
      console.log('[Delete] Usuário não encontrado');
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }
    
    // Verificar permissões básicas
    if (!['ADMIN', 'GERENTE'].includes(usuario.tipo)) {
      console.log('[Delete] Usuário sem permissão:', usuario.tipo);
      return res.status(403).json({ error: 'Permissão negada' });
    }

    // Verificar se o controle existe
    const controle = await prisma.controleCarga.findUnique({
      where: { id },
      include: { notas: true }
    });

    if (!controle) {
      return res.status(404).json({ error: 'Controle não encontrado' });
    }

    // Se o controle estiver finalizado, apenas ADMIN pode excluir
    if (controle.finalizado && usuario.tipo !== 'ADMIN') {
      console.log('[Delete] Apenas administradores podem excluir controles finalizados');
      return res.status(403).json({ error: 'Apenas ADMIN pode excluir controle finalizado' });
    }

    // Desvincular notas antes de excluir
    if (controle.notas && controle.notas.length > 0) {
      await prisma.$transaction(async (tx) => {
        // Atualizar notas para desvincular do controle
        await tx.notaFiscal.updateMany({
          where: { controleId: id },
          data: { controleId: null }
        });
        
        // Excluir o controle
        await tx.controleCarga.delete({
          where: { id }
        });
      });
    } else {
      // Se não tem notas, excluir diretamente
      await prisma.controleCarga.delete({
        where: { id }
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Controle excluído com sucesso' 
    });

  } catch (error) {
    console.error('Erro ao excluir controle:', error);
    
    return res.status(500).json({ 
      error: 'Erro ao excluir controle',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}

export default allowCors(handler);

