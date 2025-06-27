/** @type {import('next').NextConfig} */
const nextConfig = {
  // Garante que o Prisma seja incluído no bundle de produção
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
  // Otimizações de build
  webpack: (config, { isServer }) => {
    // Adiciona o Prisma ao bundle do lado do servidor
    if (isServer) {
      config.externals.push('@prisma/client');
    }
    return config;
  },
  reactStrictMode: true,
  swcMinify: true,
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
