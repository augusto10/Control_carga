import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { getTokenFromCookies, verifyToken } from '../../lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_secreto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('=== INICIANDO TESTE DE EXCLUSÃO ===');
    
    // Verificar autenticação usando função utilitária
    console.log('[Auth] Extraindo token dos cookies usando função utilitária');
    const token = getTokenFromCookies(req);
    console.log('[Auth] Token de autenticação:', !!token);
    
    if (!token) {
      console.log('[Auth] Token não encontrado nos cookies');
      return res.status(401).json({ error: 'Não autenticado - Token não encontrado' });
    }

    // Verificar o token JWT usando função utilitária
    console.log('[Auth] Verificando token com função utilitária');
    const decoded = verifyToken(token, JWT_SECRET);
    console.log('[Auth] Token decodificado:', decoded);
    
    // Verificar se o método é POST (para teste)
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Método não permitido - Use POST para teste' });
    }

    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'ID de controle não informado' });
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
    
    // Apenas admins e gerentes podem excluir controles
    if (!isAdmin) {
      return res.status(403).json({ error: 'Sem permissão para excluir este controle' });
    }

    // Verificar se o controle está finalizado
    if (controle.finalizado) {
      // Apenas admins podem excluir controles finalizados
      if (usuario?.tipo !== 'ADMIN') {
        return res.status(400).json({ error: 'Apenas administradores podem excluir controles finalizados' });
      }
    }

    // Desvincular as notas antes de excluir o controle
    console.log('Desvinculando notas do controle');
    if (controle.notas.length > 0) {
      const updated = await prisma.notaFiscal.updateMany({
        where: { controleId: id },
        data: { controleId: null }
      });
      console.log('Notas desvinculadas:', updated.count);
    }

    // Excluir o controle
    console.log('Excluindo controle');
    const deleted = await prisma.controleCarga.delete({
      where: { id }
    });
    
    console.log('Controle excluído com sucesso:', deleted.id);

    return res.status(200).json({ 
      message: 'Controle excluído com sucesso',
      controle: deleted
    });

  } catch (error) {
    console.error('Erro detalhado ao excluir controle:', error);
    return res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    });
  }
}
