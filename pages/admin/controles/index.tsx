import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody,
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  IconButton, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  TextField, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  Select, 
  SelectChangeEvent, 
  Box, 
  CircularProgress, 
  Alert, 
  Snackbar, 
  Chip,
  Avatar,
  Tooltip,
  DialogContentText
} from '@mui/material';
import { 
  Edit as EditIcon, 
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import AdminRoute from '../../../components/admin/AdminRoute';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Controle {
  id: string;
  numero: string;
  motorista: string;
  responsavel: string;
  status: 'ABERTO' | 'EM_ANDAMENTO' | 'FINALIZADO' | 'CANCELADO';
  dataCriacao: string;
  dataFinalizacao?: string | null;
  notasFiscais: Array<{
    id: string;
    numero: string;
    valor: number;
  }>;
  usuario: {
    nome: string;
  };
}

function GerenciarControlesContent() {
  // user mantido para uso futuro
  const { user } = useAuth();
  const [controles, setControles] = useState<Controle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentControle, setCurrentControle] = useState<Partial<Controle> | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState<{ 
    open: boolean; 
    message: string; 
    severity: 'success' | 'error' | 'warning' | 'info' 
  }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  // Carregar controles quando o componente for montado
  useEffect(() => {
    carregarControles();
  }, []);

  const carregarControles = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/controles');
      setControles(response.data);
    } catch (error: unknown) {
      console.error('Erro ao carregar controles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar controles';
      setError(`Erro ao carregar controles: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditarControle = (controle: Controle) => {
    setCurrentControle({
      ...controle,
      motorista: controle.motorista || '',
      responsavel: controle.responsavel || ''
    });
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentControle(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target as { name: string; value: unknown };
    setCurrentControle(prev => ({
      ...prev!,
      [name]: value
    }));
  };

  const handleStatusChange = (e: SelectChangeEvent<string>) => {
    const { value } = e.target;
    setCurrentControle(prev => ({
      ...prev!,
      status: value as Controle['status']
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentControle) return;

    try {
      setLoading(true);
      
      if (isEditing && currentControle.id) {
        await api.put(`/api/controles/${currentControle.id}`, currentControle);
        setSnackbar({ open: true, message: 'Controle atualizado com sucesso!', severity: 'success' });
      }
      
      handleCloseDialog();
      await carregarControles();
    } catch (error: unknown) {
      console.error('Erro ao salvar controle:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error && 
                         error.response && typeof error.response === 'object' && 
                         'data' in error.response && 
                         error.response.data && typeof error.response.data === 'object' &&
                         'message' in error.response.data ?
                         String(error.response.data.message) : 'Erro ao salvar controle';
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' as const
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizarControle = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja finalizar este controle?')) {
      return;
    }

    try {
      setLoading(true);
      await api.patch(`/api/controles/${id}/finalizar`);
      await carregarControles();
      setSnackbar({ 
        open: true, 
        message: 'Controle finalizado com sucesso!', 
        severity: 'success' 
      });
    } catch (error: unknown) {
      console.error('Erro ao finalizar controle:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error && 
                         error.response && typeof error.response === 'object' && 
                         'data' in error.response && 
                         error.response.data && typeof error.response.data === 'object' &&
                         'message' in error.response.data ?
                         String(error.response.data.message) : 'Erro ao finalizar controle';
      
      setSnackbar({ 
        open: true, 
        message: errorMessage,
        severity: 'error' as const
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const getStatusColor = (status: string): 'primary' | 'info' | 'success' | 'error' | 'default' => {
    switch (status) {
      case 'ABERTO':
        return 'primary';
      case 'EM_ANDAMENTO':
        return 'info';
      case 'FINALIZADO':
        return 'success';
      case 'CANCELADO':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ABERTO':
        return 'Aberto';
      case 'EM_ANDAMENTO':
        return 'Em Andamento';
      case 'FINALIZADO':
        return 'Finalizado';
      case 'CANCELADO':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (loading && !openDialog) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Gerenciar Controles
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<RefreshIcon />}
          onClick={carregarControles}
          disabled={loading}
        >
          Atualizar
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden', mb: 3 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Motorista</TableCell>
                <TableCell>Responsável</TableCell>
                <TableCell>Notas Fiscais</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Data Criação</TableCell>
                <TableCell>Usuário</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {controles.map((controle) => (
                <TableRow key={controle.id}>
                  <TableCell>{controle.numero}</TableCell>
                  <TableCell>{controle.motorista || '-'}</TableCell>
                  <TableCell>{controle.responsavel || '-'}</TableCell>
                  <TableCell>
                    {controle.notasFiscais && controle.notasFiscais.length > 0 ? (
                      <Chip 
                        label={`${controle.notasFiscais.length} nota(s)`} 
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    ) : (
                      <Chip 
                        label="Sem notas" 
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={getStatusLabel(controle.status)} 
                      color={getStatusColor(controle.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(controle.dataCriacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>{controle.usuario?.nome || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => handleOpenEditarControle(controle)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    {controle.status !== 'FINALIZADO' && (
                      <IconButton 
                        onClick={() => handleFinalizarControle(controle.id)}
                        color="success"
                        size="small"
                        disabled={controle.status === 'CANCELADO'}
                      >
                        <CheckCircleIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {controles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                    <Typography color="textSecondary">
                      Nenhum controle encontrado
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Diálogo de edição */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>Editar Controle</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Número"
                name="numero"
                value={currentControle?.numero || ''}
                onChange={handleInputChange}
                required
                fullWidth
                margin="normal"
                disabled
              />
              <TextField
                label="Motorista"
                name="motorista"
                value={currentControle?.motorista || ''}
                onChange={handleInputChange}
                required
                fullWidth
                margin="normal"
              />
              <TextField
                label="Responsável"
                name="responsavel"
                value={currentControle?.responsavel || ''}
                onChange={handleInputChange}
                required
                fullWidth
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="status-controle-label">Status</InputLabel>
                <Select
                  labelId="status-controle-label"
                  name="status"
                  value={currentControle?.status || 'ABERTO'}
                  onChange={handleStatusChange}
                  label="Status"
                  required
                >
                  <MenuItem value="ABERTO">Aberto</MenuItem>
                  <MenuItem value="EM_ANDAMENTO">Em Andamento</MenuItem>
                  <MenuItem value="FINALIZADO">Finalizado</MenuItem>
                  <MenuItem value="CANCELADO">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="inherit">
              Descartar
            </Button>
            <Button 
              type="submit" 
              color="primary" 
              variant="contained"
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default function GerenciarControles() {
  return (
    <AdminRoute>
      <GerenciarControlesContent />
    </AdminRoute>
  );
}
