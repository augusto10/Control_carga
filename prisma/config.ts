import { PrismaClient } from '@prisma/client';

// Configuração do Prisma Client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error', 'warn'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Tipagem para configurações do sistema
export type ConfiguracaoSistema = {
  id: string;
  chave: string;
  valor: string;
  descricao?: string | null;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  opcoes?: string | null;
  editavel: boolean;
  dataCriacao: Date;
  dataAtualizacao: Date;
};

export type ConfiguracaoSistemaInput = {
  chave: string;
  valor: string;
  descricao?: string | null;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  opcoes?: string | null;
  editavel: boolean;
};

// Tipagem para erros de API
export type ApiError = {
  code: string;
  message: string;
  details?: Record<string, any>;
};

// Tipagem para respostas de API
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// Mapeamento dos modelos do Prisma
export type PrismaClientWithConfiguracaoSistema = PrismaClient & {
  configuracaoSistema: {
    findUnique: (args: { where: { id: string } | { chave: string } }) => Promise<ConfiguracaoSistema | null>;
    findMany: (args?: any) => Promise<ConfiguracaoSistema[]>;
    create: (data: { data: ConfiguracaoSistemaInput }) => Promise<ConfiguracaoSistema>;
    createMany: (args: { data: ConfiguracaoSistemaInput[] }) => Promise<{ count: number }>;
    update: (args: { 
      where: { id: string } | { chave: string }, 
      data: { valor: string } 
    }) => Promise<ConfiguracaoSistema>;
    delete: (args: { where: { id: string } }) => Promise<ConfiguracaoSistema>;
    count: (args?: any) => Promise<number>;
  };
};
