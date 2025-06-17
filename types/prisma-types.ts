import { PrismaClient } from '@prisma/client';

export type ConfiguracaoSistema = {
  id: string;
  chave: string;
  valor: string;
  descricao?: string | null;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  opcoes?: string | null;
  editavel: boolean;
};

export type ConfiguracaoSistemaInput = {
  chave: string;
  valor: string;
  descricao?: string | null;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  opcoes?: string | null;
  editavel: boolean;
};

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  tipo: 'ADMIN' | 'GERENTE' | 'USUARIO';
  ativo: boolean;
  dataCriacao: Date;
  ultimoAcesso: Date | null;
};

export type UsuarioInput = {
  nome: string;
  email: string;
  tipo: 'ADMIN' | 'GERENTE' | 'USUARIO';
  senha: string;
  ativo?: boolean;
};
