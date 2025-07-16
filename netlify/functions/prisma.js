// netlify/functions/prisma.js
const { PrismaClient } = require('@prisma/client');

// Cria uma única instância do PrismaClient para ser reutilizada
let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Em desenvolvimento, use uma instância global para evitar múltiplas conexões
  if (!global.prisma) {
    global.prisma = new PrismaClient();
  }
  prisma = global.prisma;
}

module.exports = prisma;
