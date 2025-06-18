import React, { useEffect } from 'react';
import { useStore } from '../store/store';
import { 
  Container,
  Typography,
  Paper,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip
} from '@mui/material';
import { useRouter } from 'next/router';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

interface Controle {
  id: string;
  motorista: string;
  responsavel: string;
  numeroManifesto: string;
  dataCriacao: Date;
  notas: { id: string; numeroNota: string; codigo: string; valor: number }[];
  finalizado: boolean;
}

const ListarControlesPage = () => {
  const { controles, fetchControles, finalizarControle } = useStore();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchControles();
  }, [fetchControles]);

  const gerarPdf = async (controle: Controle) => {
    // Load template PDF from public folder
    const existingBytes = await fetch('/templates/modelo-romaneio.pdf').then(res => res.arrayBuffer());
    const doc = await PDFDocument.load(existingBytes);
    const page = doc.getPage(0);
    const { width, height } = page.getSize();

    const font = await doc.embedFont(StandardFonts.Helvetica);

    // Posição logo abaixo do título (ajuste fino pode ser feito depois)
    // Posição cerca de 20 linhas (~280px) abaixo do título
    const camposY = height - 355;
    page.drawText(`Manifesto Nº: ${controle.numeroManifesto}`, { x: 50, y: camposY, size: 12, font });
    page.drawText(`Motorista: ${controle.motorista}`, { x: 50, y: camposY - 18, size: 12, font });
    page.drawText(`Responsável: ${controle.responsavel}`, { x: 50, y: camposY - 36, size: 12, font });
    page.drawText(`Data: ${format(new Date(controle.dataCriacao), 'dd/MM/yyyy HH:mm')}`, { x: 50, y: camposY - 54, size: 12, font });
    // Table header

    // Tabela de notas
    const startY = height - 120;
    page.drawText('Cód', { x: 50, y: startY, size: 10, font });
    page.drawText('Número NF', { x: 100, y: startY, size: 10, font });
    page.drawText('Valor', { x: 250, y: startY, size: 10, font });

    let y = startY - 15;
    controle.notas.forEach((nota, idx) => {
      page.drawText(String(idx + 1), { x: 50, y, size: 10, font });
      page.drawText(nota.numeroNota, { x: 100, y, size: 10, font });
      page.drawText(nota.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), { x: 250, y, size: 10, font });
      y -= 15;
    });

    // total value
    const total = controle.notas.reduce((acc, n) => acc + n.valor, 0);
    page.drawText(`Total: R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: 250, y: y - 10, size: 10, font });

    const pdfBytes = await doc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url);
  };

  const handleGerarPDF = async (controleId: string) => {
    try {
      const controle = controles.find(c => c.id === controleId);
      if (!controle) return;

      await gerarPdf(controle);

      enqueueSnackbar('PDF gerado com sucesso!', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erro ao gerar PDF', { variant: 'error' });
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Controles de Carga
        </Typography>
      </Box>
      
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Manifesto</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell>Qtd</TableCell>
                <TableCell>Valor Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(controles as Controle[]).map((controle) => (
                <TableRow key={controle.id}>
                  <TableCell>{controle.numeroManifesto}</TableCell>
                  <TableCell>{controle.motorista}</TableCell>
                  <TableCell>{controle.responsavel}</TableCell>
                  <TableCell>
                    {format(new Date(controle.dataCriacao), 'dd/MM/yyyy HH:mm')}
                  </TableCell>
                  <TableCell>
                    {controle.notas.length > 0 ? (
                      controle.notas.map(nota => (
                        <Chip 
                          key={nota.id} 
                          label={`${nota.numeroNota}`} 
                          sx={{ mr: 1, mb: 1 }}
                        />
                      ))
                    ) : (
                      <Chip label="Nenhuma nota" color="default" />
                    )}
                  </TableCell>
                  <TableCell>{controle.notas.length}</TableCell>
                  <TableCell>{controle.notas.reduce((a,n)=>a+n.valor,0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                  <TableCell>
                    <Chip 
                      label={controle.finalizado ? 'Enviado' : 'Em andamento'} 
                      color={controle.finalizado ? 'success' : 'warning'} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    {!controle.finalizado && (
                      <Button 
                        variant="outlined" 
                        onClick={() => router.push(`/vincular-notas?id=${controle.id}`)}
                        sx={{ mr: 1 }}
                      >
                        Editar
                      </Button>
                    )}
                    {!controle.finalizado && (
                      <Button 
                        variant="contained" 
                        size="small" 
                        color="success" 
                        sx={{ mr: 1 }}
                        onClick={async () => {
                          await finalizarControle(controle.id);
                          enqueueSnackbar('Controle finalizado!', { variant: 'success' });
                        }}
                      >
                        Finalizar
                      </Button>
                    )}
                    {controle.finalizado && (
                      <Button 
                        variant="outlined" 
                        size="small" 
                        onClick={() => handleGerarPDF(controle.id)}
                      >
                        Gerar PDF
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default ListarControlesPage;
