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
    // Primeiro, tentar obter cookies usando nookies
    const cookies = parseCookies({ req });
    
    // Verificar diferentes possíveis nomes de cookies
    const possibleCookieNames = [
      'auth_token',
      'authToken',
      'token',
      'accessToken'
    ];
    
    for (const cookieName of possibleCookieNames) {
      if (cookies[cookieName]) {
        console.log(`[Auth] Token encontrado no cookie: ${cookieName}`);
        return cookies[cookieName];
      }
    }
    
    // Se não encontrou nos cookies parseados, tentar parsear manualmente
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      console.log('[Auth] Tentando parsear cookies manualmente');
      
      // Parsear manualmente o header de cookies
      const cookiePairs = cookieHeader.split(';');
      
      for (const pair of cookiePairs) {
        const [name, value] = pair.trim().split('=');
        
        // Verificar se é um dos cookies que estamos procurando
        if (possibleCookieNames.includes(name)) {
          console.log(`[Auth] Token encontrado no header manual: ${name}`);
          return decodeURIComponent(value);
        }
      }
    }
    
    console.log('[Auth] Nenhum token encontrado nos cookies');
    return null;
    
  } catch (error) {
    console.error('[Auth] Erro ao extrair token dos cookies:', error);
    return null;
  }
}

/**
 * Função para verificar se o token é válido
 * @param token Token JWT
 * @param secret Segredo para verificação
 * @returns Payload decodificado ou null se inválido
 */
export function verifyToken(token: string, secret: string): any | null {
  try {
    // Import dinâmico para evitar problemas no lado do cliente
    const { verify } = require('jsonwebtoken');
    
    const decoded = verify(token, secret);
    
    // Verificar se o payload tem os campos necessários
    if (decoded && decoded.id) {
      return decoded;
    }
    
    console.log('[Auth] Token decodificado não tem ID de usuário');
    return null;
    
  } catch (error) {
    console.error('[Auth] Erro ao verificar token:', error);
    return null;
  }
}
