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
  CircularProgress, 
  Snackbar, 
  Alert, 
  IconButton, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogContentText, 
  DialogActions, 
  Box,
  Avatar, 
  TextField, 
  InputAdornment, 
  Chip, 
  Tooltip, 
  useTheme, 
  Stack,
  alpha,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  Search as SearchIcon, 
  LocalShipping as ShippingIcon, 
  Phone as PhoneIcon, 
  Badge as BadgeIcon, 
  Refresh as RefreshIcon, 
  Person as PersonIcon,
  Badge as CnhIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { api } from '@/services/api';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import InputMask from 'react-input-mask';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnh: string;
  transportadoraId: string;
  transportadora?: TransportadoraApi;
}

interface TransportadoraApi {
  id: string;
  nome: string;
  descricao: string;
}

function MotoristasContent() {
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [transportadoras, setTransportadoras] = useState<TransportadoraApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [snackbar, setSnackbar] = useState<{ 
    open: boolean; 
    message: string; 
    severity: 'success' | 'error' | 'warning' | 'info' 
  }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; motorista: Motorista | null }>({ open: false, motorista: null });
  const [deleting, setDeleting] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState<Motorista | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    cnh: '',
    transportadoraId: ''
  });
  const { user } = useAuth();
  const theme = useTheme();

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      setLoading(true);
      const [motRes, transRes] = await Promise.all([
        api.get<Motorista[]>('/api/motoristas'),
        api.get<TransportadoraApi[]>('/api/transportadoras')
      ]);
      setMotoristas(motRes.data);
      setTransportadoras(transRes.data);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erro ao carregar dados', severity: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const canDelete = () => {
    return user && ['ADMIN', 'GERENTE'].includes(user.tipo);
  };

  const confirmarExclusao = async (id: string) => {
    setDeleting(id);
    try {
      await api.post('/api/motoristas/delete', { id });
      setMotoristas(motoristas.filter(m => m.id !== id));
      setSnackbar({ open: true, message: 'Motorista excluído com sucesso', severity: 'success' });
      setDeleteDialog({ open: false, motorista: null });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao excluir motorista';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setDeleting(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editando) {
        await api.put(`/api/motoristas/${editando.id}`, formData);
        setSnackbar({ open: true, message: 'Motorista atualizado com sucesso', severity: 'success' });
      } else {
        await api.post('/api/motoristas', formData);
        setSnackbar({ open: true, message: 'Motorista criado com sucesso', severity: 'success' });
      }
      setOpenDialog(false);
      setEditando(null);
      setFormData({ nome: '', telefone: '', cpf: '', cnh: '', transportadoraId: '' });
      carregar();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao salvar motorista';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    }
  };

  const handleEdit = (motorista: Motorista) => {
    setEditando(motorista);
    setFormData({
      nome: motorista.nome,
      telefone: motorista.telefone,
      cpf: motorista.cpf,
      cnh: motorista.cnh,
      transportadoraId: motorista.transportadoraId
    });
    setOpenDialog(true);
  };

  const filteredMotoristas = motoristas.filter(m => 
    m.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.cpf.includes(searchTerm) ||
    m.cnh.includes(searchTerm) ||
    (m.transportadora?.descricao || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout
      title="Motoristas"
      subtitle="Gerencie os motoristas cadastrados no sistema"
    >
      {/* Header Section - Actions Only */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        sx={{
          display: 'flex',
          justifyContent: 'flex-end',
          mb: 3
        }}
      >
        <Stack direction="row" spacing={2}>
          <Tooltip title="Atualizar lista">
              <IconButton
                onClick={carregar}
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
            <Button
              variant="contained"
              startIcon={<PersonIcon />}
              onClick={() => {
                setEditando(null);
                setFormData({
                  nome: '',
                  telefone: '',
                  cpf: '',
                  cnh: '',
                  transportadoraId: ''
                });
                setOpenDialog(true);
              }}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                }
              }}
            >
              Novo Motorista
            </Button>
          </Stack>
        </MotionBox>

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
          placeholder="Buscar motorista por nome, CPF ou transportadora..."
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
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Motorista</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contato</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Documentação</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Transportadora</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={40} thickness={4} />
                    <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
                      Carregando motoristas...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredMotoristas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <PersonIcon sx={{ fontSize: 48, color: alpha('#94a3b8', 0.2), mb: 2 }} />
                    <Typography variant="h6" fontWeight="600" color="text.secondary">
                      Nenhum motorista encontrado
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Tente ajustar os filtros ou adicione um novo motorista
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredMotoristas.map((motorista, index) => (
                    <MotionTableRow
                      key={motorista.id}
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
                            {motorista.nome.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="600" color="#1e293b">
                              {motorista.nome}
                            </Typography>
                            <Typography variant="caption" color="#64748b">
                              ID: {motorista.id.slice(0, 8)}...
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={1}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <PhoneIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2" color="#475569">
                              {motorista.telefone}
                            </Typography>
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={1}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <BadgeIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2" color="#475569" sx={{ fontFamily: 'monospace' }}>
                              {motorista.cpf}
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <CnhIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2" color="#475569" sx={{ fontFamily: 'monospace' }}>
                              {motorista.cnh}
                            </Typography>
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={motorista.transportadora?.descricao || 'Não informada'}
                          size="small"
                          sx={{
                            background: alpha('#3b82f6', 0.1),
                            color: '#3b82f6',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                            border: `1px solid ${alpha('#3b82f6', 0.2)}`
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Editar motorista">
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(motorista)}
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
                          {canDelete() && (
                            <Tooltip title="Excluir motorista">
                              <IconButton
                                size="small"
                                onClick={() => setDeleteDialog({ open: true, motorista })}
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

      {/* Dialog de cadastro/edição */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="600" color="primary.main">
            {editando ? 'Editar Motorista' : 'Novo Motorista'}
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={3}>
              <TextField
                label="Nome"
                fullWidth
                required
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <InputMask
                  mask="(99) 99999-9999"
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                >
                  {(inputProps: any) => (
                    <TextField
                      {...inputProps}
                      label="Telefone"
                      fullWidth
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  )}
                </InputMask>
                <InputMask
                  mask="999.999.999-99"
                  value={formData.cpf}
                  onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                >
                  {(inputProps: any) => (
                    <TextField
                      {...inputProps}
                      label="CPF"
                      fullWidth
                      required
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                        },
                      }}
                    />
                  )}
                </InputMask>
              </Stack>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="CNH"
                  fullWidth
                  required
                  value={formData.cnh}
                  onChange={(e) => setFormData({ ...formData, cnh: e.target.value })}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                    },
                  }}
                />
                <FormControl fullWidth required>
                  <InputLabel>Transportadora</InputLabel>
                  <Select
                    value={formData.transportadoraId}
                    label="Transportadora"
                    onChange={(e) => setFormData({ ...formData, transportadoraId: e.target.value })}
                    sx={{
                      borderRadius: 2,
                    }}
                  >
                    {transportadoras.map((trans) => (
                      <MenuItem key={trans.id} value={trans.id}>
                        {trans.descricao}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={() => setOpenDialog(false)}
              sx={{
                borderColor: alpha(theme.palette.divider, 0.3),
                color: theme.palette.text.secondary,
                '&:hover': {
                  background: alpha(theme.palette.action.hover, 0.04),
                  borderColor: alpha(theme.palette.divider, 0.5)
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                }
              }}
            >
              {editando ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, motorista: null })}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.95)} 0%, ${alpha(theme.palette.background.paper, 0.85)} 100%)`,
            backdropFilter: 'blur(10px)',
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Typography variant="h6" fontWeight="600" color="primary.main">
            Confirmar Exclusão
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o motorista <strong>{deleteDialog.motorista?.nome}</strong>?
            <br />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Esta ação não poderá ser desfeita.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setDeleteDialog({ open: false, motorista: null })}
            disabled={deleting === deleteDialog.motorista?.id}
            sx={{
              borderColor: alpha(theme.palette.divider, 0.3),
              color: theme.palette.text.secondary,
              '&:hover': {
                background: alpha(theme.palette.action.hover, 0.04),
                borderColor: alpha(theme.palette.divider, 0.5)
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => confirmarExclusao(deleteDialog.motorista?.id || '')}
            disabled={deleting === deleteDialog.motorista?.id}
            variant="contained"
            color="error"
            startIcon={deleting === deleteDialog.motorista?.id ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.error.main} 0%, ${theme.palette.error.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.error.dark} 0%, ${theme.palette.error.main} 100%)`,
              }
            }}
          >
            {deleting === deleteDialog.motorista?.id ? 'Excluindo...' : 'Excluir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar de notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{
            minWidth: '300px',
            borderRadius: 2,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.12)}`
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </AppLayout>
  );
}

function MotoristasPage() {
  return <MotoristasContent />;
}

(MotoristasPage as any).usesAppLayout = true;

export default MotoristasPage;
