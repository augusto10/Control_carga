import { parseCookies } from 'nookies';
import { NextApiRequest } from 'next';

/**
 * Função robusta para extrair o token de autenticação dos cookies
 * Lida com diferentes formatos de cookies e ambientes (desenvolvimento/produção)
 * @param req Request do Next.js
 * @returns Token de autenticação ou null se não encontrado
 */
export function getTokenFromCookies(req: NextApiRequest): string | null {
  try {
    console.log('[Auth] 🔍 Iniciando busca por token nos cookies');
    
    // Primeiro, tentar obter cookies usando nookies
    const cookies = parseCookies({ req });
    console.log('[Auth] 📋 Cookies parseados:', Object.keys(cookies));
    
    // Verificar diferentes possíveis nomes de cookies
    const possibleCookieNames = [
      'auth_token',
      'authToken', 
      'token',
      'accessToken'
    ];
    
    for (const cookieName of possibleCookieNames) {
      if (cookies[cookieName]) {
        console.log(`[Auth] ✅ Token encontrado no cookie: ${cookieName}`);
        const token = cookies[cookieName];
        console.log(`[Auth] 🔑 Token (primeiros 20 chars): ${token.substring(0, 20)}...`);
        return token;
      }
    }
    
    // Se não encontrou nos cookies parseados, tentar parsear manualmente
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      console.log('[Auth] 🔧 Tentando parsear cookies manualmente');
      console.log('[Auth] 📝 Cookie header:', cookieHeader.substring(0, 100) + '...');
      
      // Parsear manualmente o header de cookies
      const cookiePairs = cookieHeader.split(';');
      
      for (const pair of cookiePairs) {
        const [name, value] = pair.trim().split('=');
        
        // Verificar se é um dos cookies que estamos procurando
        if (possibleCookieNames.includes(name)) {
          console.log(`[Auth] ✅ Token encontrado no header manual: ${name}`);
          const token = decodeURIComponent(value);
          console.log(`[Auth] 🔑 Token (primeiros 20 chars): ${token.substring(0, 20)}...`);
          return token;
        }
      }
    } else {
      console.log('[Auth] ⚠️ Nenhum header de cookie encontrado');
    }
    
    console.log('[Auth] ❌ Nenhum token encontrado nos cookies');
    return null;
    
  } catch (error) {
    console.error('[Auth] 💥 Erro ao extrair token dos cookies:', error);
    return null;
  }
}

/**
 * Função para verificar se o token é válido
 * @param token Token JWT
 * @param secret Segredo para verificação
 * @returns Payload decodificado ou null se inválido
 */
export async function verifyToken(token: string, secret: string): Promise<any | null> {
  try {
    console.log('[Auth] 🔐 Iniciando verificação do token');
    console.log('[Auth] 🔑 Token (primeiros 20 chars):', token.substring(0, 20) + '...');
    console.log('[Auth] 🗝️ Secret configurado:', secret ? 'SIM' : 'NÃO');
    
    // Import dinâmico para evitar problemas no lado do cliente
    if (typeof window !== 'undefined') {
      console.log('[Auth] ⚠️ Tentativa de verificação no lado do cliente');
      return null;
    }
    
    const jwt = await import('jsonwebtoken');
    
    const decoded = jwt.verify(token, secret);
    console.log('[Auth] ✅ Token decodificado com sucesso');
    
    // Verificar se o payload tem os campos necessários
    if (decoded && typeof decoded === 'object' && 'id' in decoded) {
      console.log('[Auth] ✅ Token contém ID do usuário:', (decoded as any).id);
      console.log('[Auth] 📋 Payload do token:', {
        id: (decoded as any).id,
        email: (decoded as any).email,
        tipo: (decoded as any).tipo,
        exp: (decoded as any).exp ? new Date((decoded as any).exp * 1000).toISOString() : 'N/A'
      });
      return decoded as any;
    }
    
    console.log('[Auth] ❌ Token decodificado não tem ID de usuário');
    console.log('[Auth] 📋 Payload recebido:', decoded);
    return null;
    
  } catch (error: any) {
    console.error('[Auth] 💥 Erro ao verificar token:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      console.log('[Auth] ⏰ Token expirado em:', new Date(error.expiredAt).toISOString());
    } else if (error.name === 'JsonWebTokenError') {
      console.log('[Auth] 🚫 Token malformado ou inválido');
    } else if (error.name === 'NotBeforeError') {
      console.log('[Auth] ⏳ Token ainda não é válido');
    }
    
    return null;
  }
}
