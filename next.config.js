/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração para o Prisma Accelerate
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
    serverActions: true,
  },
  
  // Otimizações de build
  webpack: (config, { isServer, dev }) => {
    // Configuração para o Prisma no lado do servidor
    if (isServer) {
      config.externals = [...(config.externals || []), 
        { '@prisma/client': '@prisma/client' }
      ];
      
      // Adiciona regras para arquivos .prisma
      config.module.rules.push({
        test: /\.prisma$/,
        loader: 'null-loader',
      });
    }
    
    // Configuração para módulos do Node.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
      child_process: false
    };
    
    return config;
  },
  
  // Configurações de build
  reactStrictMode: true,
  swcMinify: true,
  
  // Configurações de TypeScript
  typescript: {
    ignoreBuildErrors: false, // Habilita a verificação de tipos
  },
  
  // Configurações do ESLint
  eslint: {
    ignoreDuringBuilds: false, // Habilita o ESLint durante o build
  },
  images: {
    domains: ['localhost'],
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
        ],
      },
    ];
  },
  compress: true,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
};

module.exports = nextConfig;
