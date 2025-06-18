const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  
  // O tamanho do corpo da requisição agora deve ser configurado em cada rota da API
  // usando `config` do Next.js: `export const config = { api: { bodyParser: { sizeLimit: '1mb' } } }`
  
  // Configuração de redirecionamento HTTP para HTTPS em produção
  async redirects() {
    if (process.env.NODE_ENV === 'production') {
      return [
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: 'www.seu-dominio.com',
            },
          ],
          permanent: true,
          destination: 'https://seu-dominio.com/:path*',
        },
      ];
    }
    return [];
  },
  
  // Configuração de cabeçalhos de segurança e CORS
  async headers() {
    const securityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
      },
    ];

    // Adiciona o cabeçalho Strict-Transport-Security apenas em produção
    if (process.env.NODE_ENV === 'production') {
      securityHeaders.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains; preload',
      });
    }

    // Configurações de CORS
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];

    // Remove duplicatas
    const uniqueOrigins = [...new Set(allowedOrigins)];
    
    // Headers de segurança para todas as rotas
    const securityHeadersConfig = {
      source: '/:path*',
      headers: securityHeaders,
    };
    
    // Headers CORS para rotas da API
    const corsHeadersConfig = {
      source: '/api/:path*',
      headers: [
        { key: 'Access-Control-Allow-Credentials', value: 'true' },
        { 
          key: 'Access-Control-Allow-Origin', 
          value: process.env.NODE_ENV === 'production' 
            ? 'https://seu-dominio.com' 
            : uniqueOrigins.join(', ')
        },
        { 
          key: 'Access-Control-Allow-Methods', 
          value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' 
        },
        { 
          key: 'Access-Control-Allow-Headers', 
          value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' 
        },
        {
          key: 'Access-Control-Expose-Headers',
          value: 'Set-Cookie, XSRF-TOKEN, Content-Disposition'
        },
        {
          key: 'Vary',
          value: 'Origin, Cookie, Accept-Encoding'
        }
      ],
    };

    return [
      securityHeadersConfig,
      corsHeadersConfig
    ];
  },
  
  // Configuração de compressão
  compress: true,
  
  // Otimização de imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Configuração de aliases para importações
  webpack: (config, { isServer }) => {
    // Adiciona o alias base
    config.resolve.alias['@'] = path.resolve(__dirname);
    
    // Adiciona aliases específicos para melhor resolução de módulos
    config.resolve.alias['@/contexts'] = path.resolve(__dirname, 'contexts');
    config.resolve.alias['@/services'] = path.resolve(__dirname, 'services');
    config.resolve.alias['@/types'] = path.resolve(__dirname, 'types');
    config.resolve.alias['@/components'] = path.resolve(__dirname, 'components');
    
    // Garante que o fs só seja usado no servidor
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    
    return config;
  },
  
  // Configuração de redirecionamento de API e CORS
  async rewrites() {
    // Em desenvolvimento, redireciona para o servidor local
    if (process.env.NODE_ENV !== 'production') {
      return [
        {
          source: '/api/:path*',
          destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/:path*`,
        },
      ];
    }
    
    // Em produção, usa o mesmo caminho
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
  
  // Configuração de ambiente
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  },
};

module.exports = nextConfig;
