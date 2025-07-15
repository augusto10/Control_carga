import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lista de origens permitidas
// ATENÇÃO: localhost só deve ser usado em desenvolvimento local!
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
      'https://seu-dominio.com',
      'https://www.seu-dominio.com',
      // Adiciona dinamicamente o domínio da Vercel se estiver disponível
      ...(process.env.VERCEL_URL ? [
        `https://${process.env.VERCEL_URL}`,
        `https://${process.env.VERCEL_URL.replace('https://', '')}`
      ] : []),
      // Permite qualquer subdomínio da Vercel para desenvolvimento de preview
      'https://*.vercel.app'
    ]
  : [
      // Só use localhost em desenvolvimento!
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://localhost:3002',
      'http://127.0.0.1:3002'
    ];

// Domínios permitidos para cookies
const ALLOWED_DOMAINS = process.env.NODE_ENV === 'production'
  ? [
      'seu-dominio.com',
      // Adiciona o domínio da Vercel para cookies
      ...(process.env.VERCEL_URL ? [
        new URL(`https://${process.env.VERCEL_URL}`).hostname.replace('www.', '')
      ] : []),
      'vercel.app' // Permite cookies para todos os subdomínios da Vercel
    ]
  : ['localhost', '127.0.0.1'];

// Configurações de CORS
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '', // Será definido dinamicamente
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-XSRF-TOKEN, Accept',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Expose-Headers': 'Set-Cookie, XSRF-TOKEN',
  'Vary': 'Origin, Cookie, Accept-Encoding',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
};

// Função para verificar se a origem é permitida
function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  
  // Permite qualquer origem em desenvolvimento
  if (process.env.NODE_ENV !== 'production') {
    try {
      const originUrl = new URL(origin);
      // Permite localhost e endereços IP locais
      if (originUrl.hostname === 'localhost' || 
          originUrl.hostname === '127.0.0.1' ||
          originUrl.hostname.endsWith('.localhost') ||
          originUrl.hostname.endsWith('.vercel.app')) { // Permite subdomínios da Vercel
        return true;
      }
    } catch (e) {
      console.error('Erro ao analisar URL:', e);
      return false;
    }
  }
  
  // Em produção, verifica a lista de origens permitidas
  return ALLOWED_ORIGINS.some((allowedOrigin: string) => {
    // Comparação exata
    if (origin === allowedOrigin) return true;
    
    // Verifica subdomínios
    try {
      const originUrl = new URL(origin);
      const allowedUrl = new URL(allowedOrigin);
      
      return (
        originUrl.hostname === allowedUrl.hostname ||
        originUrl.hostname.endsWith('.' + allowedUrl.hostname)
      );
    } catch (e) {
      console.error('Erro ao analisar URL:', e);
      return false;
    }
  });
}

// Função para verificar se o domínio é permitido para cookies
function isDomainAllowed(domain: string | null): boolean {
  if (!domain) return false;
  
  try {
    // Remove o protocolo e a porta do domínio, se existirem
    const cleanDomain = domain
      .replace(/^https?:\/\//, '') // Remove protocolo
      .split(':')[0]; // Remove a porta, se houver
      
    // Verifica se o domínio está na lista de permitidos
    return ALLOWED_DOMAINS.some((allowedDomain: string) => 
      cleanDomain === allowedDomain || 
      cleanDomain.endsWith('.' + allowedDomain)
    );
  } catch (e) {
    console.error('Erro ao verificar domínio permitido:', e);
    return false;
  }
}

// Função para processar os cookies da resposta
function processResponseCookies(response: Response, origin: string): void {
  const setCookieHeader = response.headers.get('set-cookie');
  
  if (setCookieHeader) {
    const cookies = setCookieHeader.split(/,(?=[^;]+=[^;]+;)/);
    const processedCookies = cookies.map(cookie => {
      // Remove atributos problemáticos que podem ser adicionados automaticamente
      let processedCookie = cookie
        .replace(/;\s*Secure/gi, '')
        .replace(/;\s*SameSite=None/gi, '')
        .replace(/;\s*SameSite=Lax/gi, '')
        .replace(/;\s*Domain=[^;]+/gi, '');
      
      // Adiciona os atributos corretos
      processedCookie += '; Path=/';
      
      // Em produção, adiciona Secure e SameSite=None
      if (process.env.NODE_ENV === 'production') {
        processedCookie += '; Secure; SameSite=None';
      } else {
        // Em desenvolvimento, usa SameSite=Lax
        processedCookie += '; SameSite=Lax';
      }
      
      // Se for um domínio permitido e não for localhost, adiciona o domínio
      if (isDomainAllowed(origin) && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        try {
          const domain = new URL(origin).hostname;
          processedCookie += `; Domain=${domain}`;
        } catch (e) {
          console.error('Erro ao analisar URL para definir domínio do cookie:', e);
        }
      }
      
      return processedCookie;
    });
    
    // Atualiza o header Set-Cookie com os cookies processados
    response.headers.set('Set-Cookie', processedCookies.join(','));
  }
}

export function middleware(request: NextRequest) {
  // Obter a origem da requisição
  const origin = request.headers.get('origin') || '';
  const requestHeaders = new Headers(request.headers);
  
  // Verificar se a origem está na lista de permitidas
  const isAllowed = isOriginAllowed(origin);
  const isDomainAllowedForCookies = isDomainAllowed(origin);
  
  // Se for uma requisição OPTIONS (preflight), responder imediatamente
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { 
      status: 204,
      headers: {}
    });
    
    // Adiciona os headers CORS
    if (isAllowed) {
      // Define os headers CORS para a resposta OPTIONS
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', CORS_HEADERS['Access-Control-Allow-Methods']);
      response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS['Access-Control-Allow-Headers']);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Max-Age', '86400'); // 24 horas
      response.headers.set('Vary', 'Origin, Cookie, Accept-Encoding');
      
      // Adiciona headers de segurança
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      
      if (process.env.NODE_ENV === 'production') {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
      }
    } else {
      return new NextResponse('Not allowed by CORS', { 
        status: 403,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    return response;
  }
  
  // Para requisições que não são OPTIONS, continuar com o processamento normal
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  
  // Adicionar os headers CORS à resposta apenas se a origem for permitida
  if (isAllowed) {
    // Define os headers CORS
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Expose-Headers', CORS_HEADERS['Access-Control-Expose-Headers']);
    response.headers.set('Vary', 'Origin, Cookie, Accept-Encoding');
    
    // Adiciona headers de segurança
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Processa os cookies da resposta
    processResponseCookies(response, origin);
  }
  
  return response;
}

// Configuração do matcher para aplicar o middleware apenas nas rotas da API
export const config = {
  matcher: [
    /*
     * Match all API routes
     */
    '/api/:path*',
  ],
};
