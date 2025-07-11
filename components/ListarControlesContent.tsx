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
  IconButton,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from 'notistack';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import DeleteIcon from '@mui/icons-material/Delete';
import { api } from '../services/api';



interface Controle {
  id: string;
  motorista: string;
  responsavel: string;
  numeroManifesto?: string | null;
  dataCriacao: Date;
  cpfMotorista?: string;
  transportadora: 'ACERT' | 'EXPRESSO_GOIAS';
  qtdPallets: number;
  observacao?: string;
  notas: { 
    id: string; 
    numeroNota: string; 
    codigo: string; 
    volumes: string;
    dataCriacao?: Date;
  }[];
  finalizado: boolean;
}

const ListarControlesContent: React.FC = () => {
  const { user } = useAuth();
  const { controles, fetchControles, finalizarControle, atualizarControle } = useStore();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = React.useState(false);
  const [editing, setEditing] = React.useState<Controle | null>(null);
  const [editData, setEditData] = React.useState<Partial<Controle>>({});
  const [pdfUrl, setPdfUrl] = React.useState<string | null>(null);
  const [pdfOpen, setPdfOpen] = React.useState(false);
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

  const gerarPdf = async (controle: Controle, numeroControle: number) => {
    try {
      const existingBytes = await fetch('/templates/modelo-romaneio.pdf').then(res => res.arrayBuffer());
      const doc = await PDFDocument.load(existingBytes);
      const page = doc.getPage(0);
      const { width, height } = page.getSize();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontSize = 10; // Reduzindo o tamanho da fonte para 10
      const lineHeight = 18; // Ajustando o espaçamento para a fonte menor
      let yPos = height - 50;

      // Cabeçalho
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      const horaAtual = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      
      // Ajustando posição inicial mais para baixo
      yPos -= lineHeight * 6; // Aumentado de 3 para 6 linhas (3 linhas a mais)
      
      // Linha 1
      page.drawText(`Transportadora: ${controle.transportadora}`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Usuário: ${controle.responsavel || '-'}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 2
      yPos -= lineHeight * 1.5;
      page.drawText(`Placa Veículo: -`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Nome Motorista: ${controle.motorista || '-'}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 3
      yPos -= lineHeight * 1.5;
      page.drawText(`CPF Motorista: ${controle.cpfMotorista || '-'}`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Horário: ${horaAtual}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Linha 4
      yPos -= lineHeight * 1.5;
      page.drawText(`Quantidade de Pallets: ${controle.qtdPallets || '0'}`, { x: 50, y: yPos, size: fontSize, font });
      page.drawText(`Data: ${dataAtual}`, { x: 250, y: yPos, size: fontSize, font });
      
      // Tabela de Notas
      yPos -= lineHeight * 2; // Espaço antes da tabela
      
      // Cabeçalho da Tabela
      const headerY = yPos;
      const col1 = 50;   // Qtd
      const col2 = 80;   // Nota Fiscal
      const col3 = 150;  // Data
      const col4 = 250;  // Volumes
      
      // Desenha linhas do cabeçalho
      page.drawText('Qtd', { x: col1, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText('Nota Fiscal', { x: col2, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText('Data', { x: col3, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText('Volumes', { x: col4, y: headerY, size: fontSize, font, color: rgb(0, 0, 0) });
      
      // Linha divisória
      yPos -= 5;
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      // Dados das notas
      yPos -= 25;
      let totalVolumes = 0;
      
      controle.notas.forEach((nota, index) => {
        if (yPos < 100) {
          // Se estiver chegando no final da página, cria uma nova página
          page.drawText('Continua na próxima página...', { x: 50, y: 50, size: fontSize - 2, font, color: rgb(0.5, 0.5, 0.5) });
          yPos = height - 50; // Volta para o topo da nova página
        }
        
        const volumes = parseInt(nota.volumes) || 1;
        totalVolumes += volumes;
        const dataNota = nota.dataCriacao ? new Date(nota.dataCriacao).toLocaleDateString('pt-BR') : '-';
        
        page.drawText((index + 1).toString(), { x: col1, y: yPos, size: fontSize, font });
        page.drawText(nota.numeroNota || '-', { x: col2, y: yPos, size: fontSize, font });
        page.drawText(dataNota, { x: col3, y: yPos, size: fontSize, font });
        page.drawText(volumes.toString(), { x: col4, y: yPos, size: fontSize, font });
        
        yPos -= lineHeight;
      });
      
      // Totalizadores
      yPos -= lineHeight;
      page.drawLine({
        start: { x: 50, y: yPos },
        end: { x: width - 50, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0),
      });
      
      yPos -= lineHeight;
      page.drawText('TOTAL:', { x: col2, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(controle.notas.length.toString(), { x: col1, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      page.drawText(totalVolumes.toString(), { x: col4, y: yPos, size: fontSize, font, color: rgb(0, 0, 0) });
      
      // Rodapé
      yPos -= lineHeight * 2;
      page.drawText(`Nº Controle: ${controle.numeroManifesto || '-'}`, { x: 50, y: yPos, size: fontSize - 1, font });
      page.drawText(`Total de Volumes: ${totalVolumes}`, { x: 250, y: yPos, size: fontSize - 1, font });

      const pdfBytes = await doc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setPdfOpen(true);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      enqueueSnackbar('Erro ao gerar PDF', { variant: 'error' });
    }
  };


  const canEdit = (c: Controle): boolean => {
    if (!c.finalizado) return true;
    return user?.tipo === 'GERENTE' || user?.tipo === 'ADMIN';
  };

  const handleOpenEdit = (c: Controle) => {
    setEditing(c);
    setEditData({
      motorista: c.motorista,
      responsavel: c.responsavel,
      cpfMotorista: c.cpfMotorista ?? '',
      transportadora: c.transportadora,
      qtdPallets: c.qtdPallets,
      observacao: c.observacao ?? '',
    });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    setEditData({});
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    try {
      await atualizarControle(editing.id, editData as any);
      enqueueSnackbar('Controle atualizado com sucesso', { variant: 'success' });
      handleCloseEdit();
    } catch (e) {
      enqueueSnackbar('Erro ao atualizar controle', { variant: 'error' });
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

  const handleExcluirControle = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este controle? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      await api.delete(`/api/controles/${id}`);
      await fetchControles();
      enqueueSnackbar('Controle excluído com sucesso!', { variant: 'success' });
    } catch (error: unknown) {
      console.error('Erro ao excluir controle:', error);
      enqueueSnackbar('Erro ao excluir controle', { variant: 'error' });
    } finally {
      setLoading(false);
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
                <TableCell>Nº</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {controles.map((controle, idx) => (
                <TableRow key={controle.id} hover>
                  <TableCell>{controle.numeroManifesto || 'N/A'}</TableCell>
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
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => router.push(`/controle/${controle.id}`)}
                        sx={{ minWidth: '60px', fontSize: '0.7rem', padding: '2px 8px' }}
                      >
                        Ver
                      </Button>
                      <Button 
                        variant="outlined" 
                        size="small"
                        onClick={() => gerarPdf(controle as unknown as Controle, idx + 1)}
                        sx={{ minWidth: '60px', fontSize: '0.7rem', padding: '2px 8px' }}
                      >
                        PDF
                      </Button>
                      {canEdit(controle) && (
                        <>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handleOpenEdit(controle)}
                            sx={{ minWidth: '60px', fontSize: '0.7rem', padding: '2px 8px' }}
                          >
                            Editar
                          </Button>
                          <IconButton 
                            onClick={() => handleExcluirControle(controle.id)} 
                            color="error" 
                            size="small"
                            sx={{ padding: '4px' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                    {!controle.finalizado && (
                      <Button 
                        variant="contained" 
                        color="primary" 
                        size="small"
                        onClick={() => handleFinalizarControle(controle.id)}
                        sx={{ minWidth: '80px', fontSize: '0.7rem', padding: '2px 8px' }}
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
    {editing && (
      <Dialog open onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Controle</DialogTitle>
        <DialogContent dividers>
          <TextField
            margin="normal"
            fullWidth
            label="Motorista"
            value={editData.motorista ?? ''}
            onChange={e => setEditData({ ...editData, motorista: e.target.value })}
          />
          <TextField
            margin="normal"
            fullWidth
            label="Responsável"
            value={editData.responsavel ?? ''}
            onChange={e => setEditData({ ...editData, responsavel: e.target.value })}
          />
          <TextField
            margin="normal"
            fullWidth
            label="CPF Motorista"
            value={editData.cpfMotorista ?? ''}
            onChange={e => setEditData({ ...editData, cpfMotorista: e.target.value })}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel id="transportadora-label">Transportadora</InputLabel>
            <Select
              labelId="transportadora-label"
              value={editData.transportadora ?? 'ACERT'}
              label="Transportadora"
              onChange={e => setEditData({ ...editData, transportadora: e.target.value as any })}
            >
              <MenuItem value="ACERT">ACERT</MenuItem>
              <MenuItem value="EXPRESSO_GOIAS">EXPRESSO GOIÁS</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            type="number"
            fullWidth
            label="Quantidade de Pallets"
            value={editData.qtdPallets ?? 0}
            onChange={e => setEditData({ ...editData, qtdPallets: Number(e.target.value) })}
          />
          <TextField
            margin="normal"
            fullWidth
            multiline
            minRows={3}
            label="Observação"
            value={editData.observacao ?? ''}
            onChange={e => setEditData({ ...editData, observacao: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Salvar</Button>
        </DialogActions>
      </Dialog>
    )}
    {/* Dialog de visualização do PDF */}
    {pdfUrl && (
      <Dialog open={pdfOpen} onClose={() => setPdfOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>Pré-visualização do PDF</DialogTitle>
        <DialogContent dividers sx={{ height: 600 }}>
          <iframe src={pdfUrl} width="100%" height="100%" style={{ border: 'none' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPdfOpen(false)}>Fechar</Button>
          <Button
            onClick={() => {
              const a = document.createElement('a');
              a.href = pdfUrl;
              a.download = 'romaneio.pdf';
              a.click();
            }}
          >
            Baixar
          </Button>
          {navigator.share && (
            <Button
              onClick={() => {
                navigator.share({ title: 'Romaneio', url: pdfUrl });
              }}
            >
              Compartilhar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    )}
  </Container>
  );
};

export default ListarControlesContent;
