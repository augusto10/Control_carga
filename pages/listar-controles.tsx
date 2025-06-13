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
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface Controle {
  id: string;
  motorista: string;
  responsavel: string;
  dataCriacao: Date;
  notas: { id: string; numeroNota: string; codigo: string }[];
  finalizado: boolean;
}

const ListarControlesPage = () => {
  const { controles, fetchControles } = useStore();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchControles();
  }, [fetchControles]);

  const handleGerarPDF = async (controleId: string) => {
    try {
      const controle = controles.find(c => c.id === controleId);
      if (!controle) return;

      // Criar novo documento PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([600, 800]);
      const { width, height } = page.getSize();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Adicionar cabeçalho
      page.drawText('Controle de Carga', {
        x: 50,
        y: height - 70,
        size: 24,
        font: boldFont,
        color: rgb(0, 0, 0),
      });

      // Informações do controle
      let yPosition = height - 120;
      
      const addText = (text: string, isBold = false) => {
        page.drawText(text, {
          x: 50,
          y: yPosition,
          size: 12,
          font: isBold ? boldFont : font,
          color: rgb(0, 0, 0),
        });
        yPosition -= 20;
      };

      addText(`Motorista: ${controle.motorista}`);
      addText(`Responsável: ${controle.responsavel}`);
      addText(`Data: ${format(new Date(controle.dataCriacao), 'dd/MM/yyyy HH:mm')}`);
      
      // Lista de notas fiscais
      yPosition -= 20;
      addText('Notas Fiscais:', true);
      
      controle.notas.forEach(nota => {
        addText(`- ${nota.numeroNota} (${nota.codigo})`);
      });

      // Campos para assinatura
      yPosition -= 40;
      addText('Assinaturas:', true);
      yPosition -= 40;
      
      // Linha para assinatura do motorista
      page.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: 250, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      addText('Motorista', false);
      
      // Linha para assinatura do responsável
      yPosition -= 60;
      page.drawLine({
        start: { x: 50, y: yPosition },
        end: { x: 250, y: yPosition },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      addText('Responsável', false);

      // Salvar PDF
      const pdfBytes = await pdfDoc.save();
      
      // Criar blob e download
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `controle-carga-${controle.id}.pdf`;
      link.click();
      
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
                <TableCell>Motorista</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Notas Fiscais</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(controles as Controle[]).map((controle) => (
                <TableRow key={controle.id}>
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
                  <TableCell>
                    <Chip 
                      label={controle.finalizado ? 'Finalizado' : 'Em andamento'} 
                      color={controle.finalizado ? 'success' : 'warning'} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="outlined" 
                      onClick={() => handleGerarPDF(controle.id)}
                      sx={{ mr: 1 }}
                    >
                      Gerar PDF
                    </Button>
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
