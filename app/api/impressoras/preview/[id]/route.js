import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gerarPDFEtiqueta } from '@/utils/printer';

// GET /api/impressoras/preview/[id]
// Retorna preview da etiqueta em PDF
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    // Buscar dados do volume
    const volume = await prisma.etiquetaVolume.findUnique({
      where: { id },
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
    
    // Preparar dados para o PDF
    const etiqueta = {
      codigoVolume: volume.codigoVolume,
      numeroNota: volume.lote.numeroNota,
      cliente: volume.lote.cliente,
      transportadora: volume.lote.transportadora,
      numeroPedido: volume.lote.numeroPedido,
      indiceVolume: volume.indiceVolume,
      totalVolumes: volume.totalVolumes
    };
    
    // Gerar PDF
    const pdfBytes = await gerarPDFEtiqueta(etiqueta);
    
    // Retornar o PDF direto
    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename=etiqueta.pdf'
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar preview da etiqueta:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar preview da etiqueta' },
      { status: 500 }
    );
  }
}