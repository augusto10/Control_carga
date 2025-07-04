import React, { useEffect } from 'react';
import { useStore } from '../store/store';
import AssinaturaControle from './AssinaturaControle';
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
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  IconButton,
  ListItemSecondaryAction
} from '@mui/material';
import { useRouter } from 'next/router';
import { Delete } from '@mui/icons-material';
import { useSnackbar } from 'notistack';

interface Assinatura {
  id: string;
  tipo: string;
  status: string;
  token: string;
}

interface Controle {
  id: string;
  motorista: string;
  responsavel: string;
  numeroManifesto?: string | null;
  dataCriacao: Date;
  cpfMotorista?: string;
  transportadora: 'ACERT' | 'EXPRESSO_GOIAS' | 'ACCERT';
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
  assinaturas?: Assinatura[];
}

const ListarControlesContent: React.FC = () => {
    const { controles, fetchControles, finalizarControle, atualizarControle, deletarControle } = useStore();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = React.useState(false);
    const [editing, setEditing] = React.useState<Controle | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
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

  const handleVisualizarPdf = async (controleId: string) => {
    try {
      console.log(`Iniciando visualização de PDF para o controle: ${controleId}`);
      const response = await fetch(`/api/controles/${controleId}/pdf`);
      console.log('Resposta da API recebida:', response);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Falha ao buscar PDF. Status:', response.status, 'Mensagem:', errorText);
        throw new Error(`Falha ao buscar PDF: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('Blob do PDF criado:', blob);

      if (blob.type !== 'application/pdf') {
          console.warn('O tipo do blob não é application/pdf, é:', blob.type);
      }

      const url = URL.createObjectURL(blob);
      console.log('URL do PDF criada:', url);

      setPdfUrl(url);
      setPdfOpen(true);
    } catch (error) {
      console.error('Erro detalhado ao visualizar PDF:', error);
      enqueueSnackbar('Erro ao carregar PDF. Verifique o console para mais detalhes.', { variant: 'error' });
    }
  };

  const handleClosePdf = () => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
    setPdfOpen(false);
    setPdfUrl(null);
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

    const handleRemoveNota = (notaId: string) => {
    if (editing && editData.notas) {
      const novasNotas = editData.notas.filter(n => n.id !== notaId);
      setEditData({ ...editData, notas: novasNotas });
    }
  };

  const handleOpenConfirmDelete = (id: string) => {
    setDeletingId(id);
    setConfirmDeleteOpen(true);
  };

  const handleCloseConfirmDelete = () => {
    setDeletingId(null);
    setConfirmDeleteOpen(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    try {
      await deletarControle(deletingId);
      enqueueSnackbar('Controle excluído com sucesso', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Erro ao excluir controle', { variant: 'error' });
    }
    handleCloseConfirmDelete();
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

  const handleOpenEdit = (c: Controle) => {
    setEditing(c);
        setEditData({
      ...c,
      notas: [...c.notas] 
    });
  };

  const handleCloseEdit = () => {
    setEditing(null);
    setEditData({});
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <>
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
        <Paper sx={{ mb: 3 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nº</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Motorista</TableCell>
                  <TableCell>Responsável</TableCell>
                  <TableCell>Notas</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Assinar</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {controles.map((controle, idx) => (
                  <TableRow key={controle.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell>{controle.dataCriacao ? new Date(controle.dataCriacao).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell>{controle.motorista}</TableCell>
                    <TableCell>{controle.responsavel}</TableCell>
                    <TableCell>{controle.notas.length}</TableCell>
                    <TableCell>
                      {controle.finalizado ? (
                        <Chip label="Finalizado" color="success" />
                      ) : (
                        <Chip label="Em andamento" color="warning" />
                      )}
                    </TableCell>
                    <TableCell>
                      <>
                        {controle.finalizado ? (
                          <AssinaturaControle
                            controleId={controle.id}
                            motorista={controle.motorista}
                            responsavel={controle.responsavel}
                            cpfMotorista={controle.cpfMotorista ?? ''}
                          />
                        ) : (
                          <Chip 
                            label="Em andamento"
                            color="warning"
                          />
                        )}
                      </>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.2, justifyContent: 'flex-end' }}>
                        <Button 
                          variant="outlined" 
                          size="small"
                          sx={{ minWidth: 56, px: 1, py: 0.5, fontSize: 12, lineHeight: 1 }}
                          onClick={() => router.push(`/controle/${controle.id}`)}
                        >
                          Ver
                        </Button>
                        <Button 
                          variant="outlined" 
                          size="small"
                          sx={{ minWidth: 56, px: 1, py: 0.5, fontSize: 12, lineHeight: 1 }}
                          onClick={() => handleVisualizarPdf(controle.id)}
                        >
                          PDF
                        </Button>
                        {(controle && !controle.finalizado) && (
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ minWidth: 56, px: 1, py: 0.5, fontSize: 12, lineHeight: 1 }}
                            onClick={() => handleOpenEdit(controle)}
                          >
                            Editar
                          </Button>
                        )}
                        {!controle.finalizado && (
                                                    <Button 
                            variant="contained" 
                            color="primary" 
                            size="small"
                            sx={{ minWidth: 56, px: 1, py: 0.5, fontSize: 12, lineHeight: 1 }}
                            onClick={() => handleFinalizarControle(controle.id)}
                          >
                            Finalizar
                          </Button>
                        )}
                        {!controle.finalizado && (
                           <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            sx={{ minWidth: 56, px: 1, py: 0.5, fontSize: 12, lineHeight: 1 }}
                            onClick={() => handleOpenConfirmDelete(controle.id)}
                          >
                            Excluir
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
        <Dialog open={!!editing} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
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
                onChange={e => setEditData({ ...editData, transportadora: e.target.value as 'ACERT' | 'EXPRESSO_GOIAS' | 'ACCERT' })}
              >
                <MenuItem value="ACERT">ACERT</MenuItem>
                <MenuItem value="EXPRESSO_GOIAS">EXPRESSO GOIAS</MenuItem>
                <MenuItem value="ACCERT">ACCERT</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="normal"
              fullWidth
              label="Quantidade de Pallets"
              type="number"
              value={editData.qtdPallets ?? 0}
              onChange={e => setEditData({ ...editData, qtdPallets: parseInt(e.target.value) || 0 })}
            />
                        <TextField
              margin="normal"
              fullWidth
              label="Observação"
              value={editData.observacao ?? ''}
              onChange={e => setEditData({ ...editData, observacao: e.target.value })}
            />

            <Typography variant="h6" sx={{ mt: 2 }}>Notas Fiscais Vinculadas</Typography>
            <List dense>
              {editData.notas && editData.notas.map(nota => (
                <ListItem key={nota.id}>
                  <ListItemText primary={`Nota Nº: ${nota.numeroNota}`} secondary={`Código: ${nota.codigo}`} />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveNota(nota.id)}>
                      <Delete />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseEdit} color="primary">
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} color="primary">
              Salvar
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={pdfOpen} onClose={handleClosePdf} maxWidth="lg" fullWidth>
          <DialogTitle>Visualização de PDF</DialogTitle>
          <DialogContent sx={{ height: '80vh' }}>
            {pdfUrl && (
              <iframe
                src={pdfUrl}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title="Visualizador de PDF"
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClosePdf} color="primary">
              Fechar
            </Button>
                    </DialogActions>
        </Dialog>

        <Dialog
          open={confirmDeleteOpen}
          onClose={handleCloseConfirmDelete}
        >
          <DialogTitle>Confirmar Exclusão</DialogTitle>
          <DialogContent>
            <Typography>Tem certeza de que deseja excluir este controle? Esta ação não pode ser desfeita.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseConfirmDelete}>Cancelar</Button>
            <Button onClick={handleConfirmDelete} color="error" variant="contained">
              Excluir
            </Button>
          </DialogActions>
        </Dialog>

      </Container>
    </>
  );
};

export default ListarControlesContent;
