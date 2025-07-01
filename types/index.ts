import { NotaFiscal as PrismaNotaFiscal, ControleCarga as PrismaControleCarga } from '@prisma/client';

export interface INotaFiscal extends Omit<PrismaNotaFiscal, 'volumes'> {
  volumes: string;
}

export interface IControleCarga extends PrismaControleCarga {
  notas: INotaFiscal[];
}

export type CriarControleDTO = {
  motorista: string;
  responsavel: string;
  cpfMotorista?: string; // Tornando o CPF opcional
  transportadora: 'ACCERT' | 'EXPRESSO_GOIAS';
  qtdPallets: number;
  observacao?: string;
  notasIds?: string[];
};

export type AdicionarNotaDTO = {
  codigo: string;
  numeroNota: string;
  volumes: string;
};
