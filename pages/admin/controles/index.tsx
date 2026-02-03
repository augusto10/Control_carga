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
  DialogContentText,
  Stack,
  InputAdornment,
  alpha,
  useTheme,
  Grid
} from '@mui/material';
import { 
  Edit as EditIcon, 
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Pending as PendingIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  MoreVert as MoreVertIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  LocalShipping as LocalShippingIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../../contexts/AuthContext';
import AdminRoute from '../../../components/admin/AdminRoute';
import { api } from '@/services/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);
const MotionCard = motion(Paper);

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
  const theme = useTheme();
  const { user } = useAuth();
  const [controles, setControles] = useState<Controle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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

  const filteredControles = controles.filter(c => 
    (c.numero || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.motorista || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.responsavel || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.usuario?.nome || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const handleExcluirControle = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este controle? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/controles/delete', { id });
      await carregarControles();
      setSnackbar({
        open: true,
        message: 'Controle excluído com sucesso!',
        severity: 'success'
      });
    } catch (error: unknown) {
      console.error('Erro ao excluir controle:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error &&
                         error.response && typeof error.response === 'object' &&
                         'data' in error.response &&
                         error.response.data && typeof error.response.data === 'object' &&
                         'message' in error.response.data ?
                         String(error.response.data.message) : 'Erro ao excluir controle';

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
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Alert 
          severity="error" 
          variant="standard"
          sx={{ 
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            backgroundColor: alpha(theme.palette.error.main, 0.15),
            color: theme.palette.error.dark,
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            '& .MuiAlert-icon': {
              color: theme.palette.error.main,
            },
            boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
            fontWeight: 600,
          }}
        >
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header Section */}
      <MotionPaper
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          backdropFilter: 'blur(10px)'
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.3)}`
            }}
          >
            <LocalShippingIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
              Gestão de Controles
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Visualize, edite e gerencie todos os controles de carga do sistema.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Tooltip title="Atualizar lista">
              <IconButton
                onClick={carregarControles}
                disabled={loading}
                sx={{
                  background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.dark, 0.1)} 100%)`,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  '&:hover': {
                    background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.2)} 0%, ${alpha(theme.palette.info.dark, 0.2)} 100%)`,
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </MotionPaper>

      {/* Search Section */}
      <MotionPaper
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        sx={{
          p: 2,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.7)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          backdropFilter: 'blur(10px)'
        }}
      >
        <TextField
          fullWidth
          placeholder="Buscar controle por número, motorista ou responsável..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              background: alpha(theme.palette.background.paper, 0.8),
              '&:hover fieldset': {
                borderColor: alpha(theme.palette.primary.main, 0.3),
              },
              '&.Mui-focused fieldset': {
                borderColor: theme.palette.primary.main,
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
              },
            },
          }}
        />
      </MotionPaper>

      {/* Table Section */}
      <MotionPaper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 4,
          borderRadius: '24px',
          border: '1px solid',
          borderColor: alpha('#e2e8f0', 0.6),
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}
      >
        <TableContainer sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: alpha('#e2e8f0', 0.6) }}>
          <Table stickyHeader>
            <TableHead sx={{ bgcolor: alpha('#f8fafc', 0.8) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Número</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Motorista</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Responsável</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Notas</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Data Criação</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Usuário</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={40} thickness={4} />
                    <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
                      Carregando controles...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredControles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 8 }}>
                    <AssignmentIcon sx={{ fontSize: 48, color: alpha('#94a3b8', 0.2), mb: 2 }} />
                    <Typography variant="h6" fontWeight="600" color="text.secondary">
                      Nenhum controle encontrado
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Tente ajustar os filtros ou criar um novo controle
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredControles.map((controle, index) => (
                    <MotionTableRow
                      key={controle.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      sx={{ 
                        '&:hover': { 
                          bgcolor: alpha('#f8fafc', 0.5) 
                        },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="600" color="#1e293b">
                          {controle.numero || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.1)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                              color: '#3b82f6',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {controle.motorista?.charAt(0).toUpperCase() || <PersonIcon sx={{ fontSize: 20 }} />}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="600" color="#1e293b">
                              {controle.motorista || 'Não informado'}
                            </Typography>
                            <Typography variant="caption" color="#64748b">
                              ID: {controle.id.slice(0, 8)}...
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="#475569">
                          {controle.responsavel || 'Não informado'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {controle.notasFiscais && controle.notasFiscais.length > 0 ? (
                          <Tooltip title={`${controle.notasFiscais.length} nota(s) fiscal(is)`}>
                            <Chip 
                              label={controle.notasFiscais.length} 
                              size="small"
                              icon={<AssignmentIcon sx={{ fontSize: '14px !important' }} />}
                              sx={{ 
                                background: alpha('#3b82f6', 0.1),
                                color: '#3b82f6',
                                fontWeight: 500,
                                fontSize: '0.75rem',
                                border: `1px solid ${alpha('#3b82f6', 0.2)}`
                              }}
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">Sem notas</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(controle.status)} 
                          color={getStatusColor(controle.status) as any}
                          size="small"
                          sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <CalendarTodayIcon sx={{ fontSize: 16, color: '#64748b' }} />
                          <Typography variant="body2" color="#475569">
                            {format(new Date(controle.dataCriacao), "dd/MM/yy HH:mm", { locale: ptBR })}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" fontWeight="600" color="text.secondary">
                          {controle.usuario?.nome || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Editar">
                            <IconButton 
                              onClick={() => handleOpenEditarControle(controle)}
                              size="small"
                              sx={{
                                color: '#3b82f6',
                                '&:hover': {
                                  background: alpha('#3b82f6', 0.1),
                                  color: '#2563eb'
                                }
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton 
                              onClick={() => handleExcluirControle(controle.id)}
                              size="small"
                              sx={{
                                color: '#ef4444',
                                '&:hover': {
                                  background: alpha('#ef4444', 0.1),
                                  color: '#dc2626'
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          {controle.status !== 'FINALIZADO' && (
                            <Tooltip title="Finalizar">
                              <IconButton 
                                onClick={() => handleFinalizarControle(controle.id)}
                                size="small"
                                disabled={controle.status === 'CANCELADO'}
                                sx={{
                                  color: '#10b981',
                                  '&:hover': {
                                    background: alpha('#10b981', 0.1),
                                    color: '#059669'
                                  }
                                }}
                              >
                                <CheckCircleIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Stack>
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </MotionPaper>

      {/* Dialog de edição */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          },
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ pb: 1 }}>
            <Typography variant="h6" fontWeight="600" color="primary.main">
              Editar Controle
            </Typography>
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 3 }}>
              Atualize as informações do controle de carga selecionado.
            </DialogContentText>
            <Stack spacing={3} sx={{ mt: 1 }}>
              <TextField
                label="Número do Controle"
                name="numero"
                value={currentControle?.numero || ''}
                onChange={handleInputChange}
                fullWidth
                disabled
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="Motorista"
                name="motorista"
                value={currentControle?.motorista || ''}
                onChange={handleInputChange}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <TextField
                label="Responsável"
                name="responsavel"
                value={currentControle?.responsavel || ''}
                onChange={handleInputChange}
                required
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <FormControl fullWidth required>
                <InputLabel>Status</InputLabel>
                <Select
                  value={currentControle?.status || ''}
                  label="Status"
                  name="status"
                  onChange={handleStatusChange}
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  <MenuItem value="ABERTO">Aberto</MenuItem>
                  <MenuItem value="EM_ANDAMENTO">Em Andamento</MenuItem>
                  <MenuItem value="FINALIZADO">Finalizado</MenuItem>
                  <MenuItem value="CANCELADO">Cancelado</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={handleCloseDialog}
              sx={{
                borderColor: alpha(theme.palette.divider, 0.3),
                color: theme.palette.text.secondary,
                '&:hover': {
                  background: alpha(theme.palette.action.hover, 0.04),
                  borderColor: alpha(theme.palette.divider, 0.5),
                },
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                },
              }}
            >
              {loading ? <CircularProgress size={24} /> : 'Salvar Alterações'}
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
          variant="standard"
          sx={{ 
            width: '100%',
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            backgroundColor: alpha(theme.palette[snackbar.severity].main, 0.15),
            color: theme.palette[snackbar.severity].dark,
            border: `1px solid ${alpha(theme.palette[snackbar.severity].main, 0.3)}`,
            '& .MuiAlert-icon': {
              color: theme.palette[snackbar.severity].main,
            },
            boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
            fontWeight: 600,
          }}
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
