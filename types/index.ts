import { NotaFiscal as PrismaNotaFiscal, ControleCarga as PrismaControleCarga } from '@prisma/client';

export interface INotaFiscal extends PrismaNotaFiscal {}

export interface IControleCarga extends PrismaControleCarga {
  notas: INotaFiscal[];
}

export type CriarControleDTO = {
  motorista: string;
  responsavel: string;
  cpfMotorista?: string; // Tornando o CPF opcional
  transportadora: 'ACERT' | 'EXPRESSO_GOIAS';
  qtdPallets: number;
  observacao?: string;
  notasIds?: string[];
};

export type AdicionarNotaDTO = Pick<INotaFiscal, 'codigo' | 'numeroNota' | 'valor'>;
