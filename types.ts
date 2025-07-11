import { Transportadora, NotaFiscal, Motorista } from '@prisma/client';

export interface CriarControleDTO {
  motorista: string;
  cpfMotorista: string;
  transportadora: 'ACCERT' | 'EXPRESSO_GOIAS';
  responsavel: string;
  observacao: string | null;
  qtdPallets: number;
  notasIds: string[];
}

export interface ControleCarga {
  id: string;
  dataCriacao: Date;
  motorista: string;
  responsavel: string;
  transportadora: 'ACCERT' | 'EXPRESSO_GOIAS';
  numeroManifesto: string | null;
  qtdPallets: number;
  observacao: string | null;
  finalizado: boolean;
  cpfMotorista: string;
  notas: NotaFiscal[];
}
