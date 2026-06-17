import { Transportadora, NotaFiscal, Motorista } from '@prisma/client';

export interface CriarControleDTO {
  motorista: string;
  cpfMotorista: string;
  transportadora: 'ACCERT' | 'EXPRESSO_GOIAS' | 'TERCEIRIZADA' | 'DETAFRA_TRANSPORTES' | 'RETIRA_VENDEDOR' | 'RETIRA_CLIENTE' | 'VLOG' | 'ZANUELO_TRANSPORTE_LOGISTICA';
  responsavel: string;
  observacao: string | null;
  qtdPallets: number;
  freteInformado?: boolean;
  valorFrete?: number | null;
  notasIds: string[];
}

export interface ControleCarga {
  id: string;
  dataCriacao: Date;
  motorista: string;
  responsavel: string;
  transportadora: 'ACCERT' | 'EXPRESSO_GOIAS' | 'TERCEIRIZADA' | 'DETAFRA_TRANSPORTES' | 'RETIRA_VENDEDOR' | 'RETIRA_CLIENTE' | 'VLOG' | 'ZANUELO_TRANSPORTE_LOGISTICA';
  numeroManifesto: string | null;
  qtdPallets: number;
  observacao: string | null;
  finalizado: boolean;
  cpfMotorista: string;
  freteInformado?: boolean;
  valorFrete?: number | null;
  imagens?: string[];
  notas: NotaFiscal[];
  assinaturaMotorista?: string | null;
  assinaturaResponsavel?: string | null;
  dataAssinaturaMotorista?: Date | null;
  dataAssinaturaResponsavel?: Date | null;
}
