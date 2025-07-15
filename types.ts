import { Transportadora, NotaFiscal, Motorista } from '@prisma/client';

export interface CriarControleDTO {
  motorista: string;
  cpfMotorista: string;
  transportadora: 'ACERT' | 'EXPRESSO_GOIAS';
  responsavel: string;
  observacao?: string;
  qtdPallets: number;
  notasIds: string[];
}

export interface ControleCarga {
  id: string;
  dataCriacao: Date;
  motorista: string;
  responsavel: string;
  transportadora: 'ACERT' | 'EXPRESSO_GOIAS';
  numeroManifesto: string | null;
  qtdPallets: number;
  observacao?: string;
  finalizado: boolean;
  cpfMotorista: string;
  notas: NotaFiscal[];
}
