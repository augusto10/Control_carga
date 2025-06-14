import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Transportadora } from '@prisma/client';

const prisma = new PrismaClient();

interface CreateControleRequest {
  motorista: string;
  cpfMotorista: string;
  responsavel: string;
  transportadora?: Transportadora;
  numeroManifesto: string;
  qtdPallets: number;
  observacao?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      const {
        motorista,
        cpfMotorista,
        responsavel,
        transportadora = Transportadora.ACERT,
        numeroManifesto,
        qtdPallets,
        observacao
      } = req.body as CreateControleRequest;
      
      // Validação dos campos obrigatórios
      if (!motorista || !cpfMotorista || !responsavel || !numeroManifesto || qtdPallets === undefined) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios não fornecidos',
          requiredFields: ['motorista', 'cpfMotorista', 'responsavel', 'numeroManifesto', 'qtdPallets']
        });
      }

      const newControle = await prisma.controleCarga.create({
        data: {
          motorista,
          cpfMotorista,
          responsavel,
          transportadora,
          numeroManifesto,
          qtdPallets: Number(qtdPallets),
          observacao: observacao || null
        }
      });

      return res.status(201).json(newControle);
    } catch (error: unknown) {
      console.error('Erro ao criar controle de carga:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      return res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: errorMessage
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ 
      error: `Método ${req.method} não permitido`,
      allowed: ['POST']
    });
  }
}
