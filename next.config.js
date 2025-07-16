/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Garante que o Prisma seja incluído no bundle de produção
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Otimizações de build
  webpack: (config, { isServer }) => {
    // Garante que o Prisma seja incluído no bundle do lado do servidor
    if (isServer) {
      config.externals = config.externals || [];
      
      // Adiciona o Prisma ao bundle
      if (Array.isArray(config.externals)) {
        config.externals.push('@prisma/client');
      } else if (typeof config.externals === 'object' && config.externals !== null) {
        config.externals['@prisma/client'] = '@prisma/client';
      }
      
      // Garante que o Prisma seja incluído no bundle
      config.module.rules.push({
        test: /\.prisma$/,
        loader: 'null-loader',
      });
    }
    
    // Adiciona fallbacks para módulos do Node.js
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      dns: 'empty',
      net: 'empty',
      tls: 'empty',
      fs: 'empty',
    };
    
    return config;
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost', 'gestaologistica.netlify.app', 'api.controle-carga.com'],
    unoptimized: true, // Desativa a otimização de imagens para o Netlify
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
        ],
      },
    ];
  },
  compress: true,
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  // Desativa o X-Powered-By header
  poweredByHeader: false,
  // Configuração para exportação estática
  output: 'export',
  // Desativa a verificação de tipos durante o build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Desativa a verificação de ESLint durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Configuração para o Netlify Functions
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/.netlify/functions/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
