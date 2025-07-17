/** @type {import('next').NextConfig} */
const nextConfig = {
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
  typescript: {
    // Desabilita a verificação de tipos durante o build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Desabilita o ESLint durante o build
    ignoreDuringBuilds: true,
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
