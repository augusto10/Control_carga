import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Clone dos headers da requisição
  const requestHeaders = new Headers(request.headers);
  
  // Adiciona os cabeçalhos CORS
  requestHeaders.set('Access-Control-Allow-Origin', '*');
  requestHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  requestHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Se for uma requisição OPTIONS, retorna imediatamente com os cabeçalhos CORS
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  
  // Para outras requisições, continua com a requisição original
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// Configura o middleware para rodar apenas em rotas de API
export const config = {
  matcher: '/api/:path*',
};
