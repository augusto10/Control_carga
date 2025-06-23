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
  Chip,
  CircularProgress
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

const ListarControlesContent: React.FC = () => {
  const { controles, fetchControles, finalizarControle } = useStore();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = React.useState(false);

  useEffect(() => {
    const carregarControles = async () => {
      try {
        setLoading(true);
        await fetchControles();
      } catch (error) {
        console.error('Erro ao carregar controles:', error);
        enqueueSnackbar('Erro ao carregar controles', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    
    carregarControles();
  }, [fetchControles, enqueueSnackbar]);

  const gerarPdf = async (controle: Controle) => {
    try {
      // Load template PDF from public folder
      const existingBytes = await fetch('/templates/modelo-romaneio.pdf').then(res => res.arrayBuffer());
      const doc = await PDFDocument.load(existingBytes);
      const page = doc.getPage(0);
      const { width, height } = page.getSize();

      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontSize = 12;
      
      // Adicionar dados ao PDF
      page.drawText(`Nº Controle: ${controle.id}`, {
        x: 50,
        y: height - 100,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(`Motorista: ${controle.motorista}`, {
        x: 50,
        y: height - 130,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      page.drawText(`Responsável: ${controle.responsavel}`, {
        x: 50,
        y: height - 160,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      
      // Salvar o PDF
      const pdfBytes = await doc.save();
      
      // Criar blob e baixar
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `romaneio-${controle.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      enqueueSnackbar('Erro ao gerar PDF', { variant: 'error' });
    }
  };

  const handleFinalizarControle = async (id: string) => {
    try {
      await finalizarControle(id);
      enqueueSnackbar('Controle finalizado com sucesso!', { variant: 'success' });
    } catch (error) {
      console.error('Erro ao finalizar controle:', error);
      enqueueSnackbar('Erro ao finalizar controle', { variant: 'error' });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Controles de Carga
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => router.push('/criar-controle')}
        >
          Novo Controle
        </Button>
      </Box>
      
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="tabela de controles">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {controles.map((controle) => (
                <TableRow key={controle.id} hover>
                  <TableCell>{controle.id}</TableCell>
                  <TableCell>
                    {format(new Date(controle.dataCriacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{controle.motorista}</TableCell>
                  <TableCell>{controle.responsavel}</TableCell>
                  <TableCell>{controle.notas?.length || 0} nota(s)</TableCell>
                  <TableCell>
                    <Chip 
                      label={controle.finalizado ? 'Finalizado' : 'Em andamento'} 
                      color={controle.finalizado ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => router.push(`/controle/${controle.id}`)}
                      >
                        Ver
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => gerarPdf(controle as unknown as Controle)}
                      >
                        PDF
                      </Button>
                      {!controle.finalizado && (
                        <Button 
                          variant="contained" 
                          color="primary" 
                          size="small"
                          onClick={() => handleFinalizarControle(controle.id)}
                        >
                          Finalizar
                        </Button>
                      )}
                    </Box>
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

export default ListarControlesContent;
