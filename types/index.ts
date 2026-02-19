import { NotaFiscal as PrismaNotaFiscal, ControleCarga as PrismaControleCarga } from '@prisma/client';

export type ControleResumido = {
  id: string;
  numeroManifesto: string | null;
  motorista: string;
  responsavel: string;
  transportadora: string;
  dataCriacao: Date;
};

// Tipos baseados no Prisma mas com ajustes para o frontend
export interface NotaFiscal {
  id: string;
  dataCriacao: Date;
  codigo: string;
  numeroNota: string;
  volumes: string;
  controleId: string | null;
  controle?: ControleResumido | null;
}

export type Transportadora = {
  id: string;
  nome: string;
  cnpj: string;
  ativo: boolean;
};

export type ControleCarga = {
  id: string;
  dataCriacao: Date;
  motorista: string;
  cpfMotorista?: string; // Opcional no frontend
  responsavel: string;
  transportadora: 'ACERT' | 'EXPRESSO_GOIAS';
  numeroManifesto?: string;
  qtdPallets: number;
  observacao?: string;
  finalizado: boolean;
  notas: NotaFiscal[];
};

export type CriarControleDTO = {
  motorista: string;
  responsavel: string;
  cpfMotorista?: string;
  transportadora: 'ACERT' | 'EXPRESSO_GOIAS';
  numeroManifesto?: string;
  qtdPallets: number;
  observacao?: string;
  notasIds?: string[];
};

export type AdicionarNotaDTO = {
  codigo: string;
  numeroNota: string;
  volumes: string;
};
