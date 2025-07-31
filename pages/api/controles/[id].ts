import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { getTokenFromCookies, verifyToken } from '../../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://controle-logistica.vercel.app',
  /^https:\/\/controle-logistica-.*\.vercel\.app$/,
  /^https:\/\/.*\.vercel\.app$/
];

// Middleware CORS simplificado
const allowCors = (fn: any) => async (req: NextApiRequest, res: NextApiResponse) => {
  const origin = req.headers.origin || '';
  
  // Sempre permitir origens conhecidas
  const isAllowed = ALLOWED_ORIGINS.some(allowed => 
    typeof allowed === 'string' ? allowed === origin : allowed.test(origin)
  );
  
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, DELETE, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // Handle preflight
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

export default allowCors(async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('=== INICIANDO EXCLUSÃO DE CONTROLE ===');
    console.log('Método:', req.method);
    console.log('Query params:', req.query);
    console.log('User agent:', req.headers['user-agent']);
    
    // Verificar se o método é DELETE
    if (req.method !== 'DELETE') {
      console.log('Método não permitido:', req.method);
      return res.status(405).json({ error: 'Método não permitido' });
    }

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

    const { id } = req.query;
    console.log('ID do controle a ser excluído:', id);

    if (!id || Array.isArray(id)) {
      console.log('ID de controle inválido:', id);
      return res.status(400).json({ error: 'ID de controle inválido' });
    }

    // Verificar se o controle existe
    console.log('Verificando existência do controle:', id);
    const controle = await prisma.controleCarga.findUnique({
      where: { id },
      include: {
        notas: true
      }
    });

    if (!controle) {
      console.log('Controle não encontrado:', id);
      return res.status(404).json({ error: 'Controle não encontrado' });
    }
    
    console.log('Controle encontrado:', {
      id: controle.id,
      finalizado: controle.finalizado,
      notasCount: controle.notas.length
    });

    // Verificar se o usuário tem permissão
    console.log('Verificando permissões do usuário:', decoded.id);
    const usuario = await prisma.usuario.findUnique({
      where: { id: decoded.id },
      select: { tipo: true }
    });
    
    console.log('Tipo de usuário:', usuario?.tipo);

    const isAdmin = usuario?.tipo === 'ADMIN' || usuario?.tipo === 'GERENTE';
    console.log('Usuário é admin/gerente:', isAdmin);
    
    // Apenas admins e gerentes podem excluir controles
    if (!isAdmin) {
      console.log('Usuário sem permissão para excluir controle');
      return res.status(403).json({ error: 'Sem permissão para excluir este controle' });
    }

    // Verificar se o controle está finalizado
    if (controle.finalizado) {
      // Apenas admins podem excluir controles finalizados
      if (usuario?.tipo !== 'ADMIN') {
        console.log('Apenas administradores podem excluir controles finalizados');
        return res.status(400).json({ error: 'Apenas administradores podem excluir controles finalizados' });
      }
    }

    // Desvincular as notas antes de excluir o controle
    console.log('Iniciando transação para exclusão do controle');
    if (controle.notas.length > 0) {
      console.log('Desvinculando', controle.notas.length, 'notas do controle');
      const updated = await prisma.notaFiscal.updateMany({
        where: { controleId: id },
        data: { controleId: null }
      });
      console.log('Notas desvinculadas:', updated.count);
    }

    // Excluir o controle
    console.log('Excluindo controle:', id);
    const deleted = await prisma.controleCarga.delete({
      where: { id }
    });
    
    console.log('Controle excluído com sucesso:', deleted.id);

    return res.status(200).json({ message: 'Controle excluído com sucesso' });

  } catch (error) {
    console.error('Erro detalhado ao excluir controle:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      // Em produção, não retornamos o stack trace por segurança
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    });
  }
});
