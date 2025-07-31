import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Testar conexão com o banco de dados
    const count = await prisma.controleCarga.count();
    
    return res.status(200).json({
      success: true,
      message: 'Conexão com o banco de dados bem-sucedida',
      count
    });
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao conectar com o banco de dados',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
}
