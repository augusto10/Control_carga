import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { listarImpressoras, imprimirEtiqueta } from '@/utils/printer';

// GET /api/impressoras
// Lista todas as impressoras disponíveis
export async function GET() {
  try {
    const impressoras = await listarImpressoras();
    return NextResponse.json(impressoras);
  } catch (error) {
    console.error('Erro ao listar impressoras:', error);
    return NextResponse.json(
      { error: 'Erro ao listar impressoras' },
      { status: 500 }
    );
  }
}

// POST /api/impressoras/imprimir
// Imprime uma etiqueta
export async function POST(request) {
  // Força o Content-Type para evitar download
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Content-Disposition': 'inline'
  });

  try {
    const body = await request.json();
    const { volumeId, impressora } = body;
    
    if (!volumeId || !impressora) {
      return NextResponse.json(
        { error: 'Volume ID e nome da impressora são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Buscar dados do volume
    const volume = await prisma.etiquetaVolume.findUnique({
      where: { id: volumeId },
      include: {
        lote: true
      }
    });
    
    if (!volume) {
      return NextResponse.json(
        { error: 'Volume não encontrado' },
        { status: 404 }
      );
    }
    
    // Preparar dados para impressão
    const etiqueta = {
      codigoVolume: volume.codigoVolume,
      numeroNota: volume.lote.numeroNota,
      cliente: volume.lote.cliente,
      transportadora: volume.lote.transportadora,
      numeroPedido: volume.lote.numeroPedido,
      indiceVolume: volume.indiceVolume,
      totalVolumes: volume.totalVolumes
    };
    
    // Imprimir etiqueta
    await imprimirEtiqueta(etiqueta, impressora);
    
    // Atualizar data de impressão
    await prisma.etiquetaVolume.update({
      where: { id: volumeId },
      data: { 
        impressoEm: new Date()
      }
    });
    
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Etiqueta enviada para impressão'
      }), 
      { headers }
    );
    
  } catch (error) {
    console.error('Erro ao imprimir etiqueta:', error);
    return NextResponse.json(
      { error: 'Erro ao imprimir etiqueta' },
      { status: 500 }
    );
  }
}