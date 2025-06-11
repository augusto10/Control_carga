import { NotaFiscal as PrismaNotaFiscal, ControleCarga as PrismaControleCarga } from '@prisma/client';

export interface INotaFiscal extends PrismaNotaFiscal {}

export interface IControleCarga extends PrismaControleCarga {
  notas: INotaFiscal[];
}

export type CriarControleDTO = Pick<IControleCarga, 'motorista' | 'responsavel'>;

export type AdicionarNotaDTO = Pick<INotaFiscal, 'codigo' | 'numeroNota' | 'valor'>;
