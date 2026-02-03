import { useState, useEffect, useCallback } from 'react';
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
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Box,
  Stack,
  InputAdornment,
  Avatar,
  alpha,
  useTheme,
  Chip,
  Grid,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  LocalShipping as LocalShippingIcon,
  Refresh as RefreshIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/services/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import InputMask from '@/components/InputMask';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

// Mapeamento para exibir nomes amigáveis das transportadoras
const transportadoraNomes: Record<string, string> = {
  'ACERT': 'ACERT',
  'ACCERT': 'ACCERT', 
  'EXPRESSO_GOIAS': 'Expresso Goiás',
  'TERCEIRIZADA': 'Terceirizada',
  'DETAFRA_TRANSPORTES': 'Detafra Transportes',
  'RETIRA_VENDEDOR': 'Retira Vendedor',
  'RETIRA_CLIENTE': 'Retira Cliente',
  'VLOG': 'VLOG'
};

interface Motorista {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnh: string;
  transportadoraId: string; // Este é o enum Transportadora
}

function MotoristasContent() {
  const theme = useTheme();
  const [motoristas, setMotoristas] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; motorista: Motorista | null }>({ open: false, motorista: null });
  const [deleting, setDeleting] = useState<string | null>(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [current, setCurrent] = useState<Partial<Motorista> | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success'|'error' }>({ open:false, message:'', severity:'success' });

  const filteredMotoristas = motoristas.filter(m => 
    (m.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.cpf || '').includes(searchTerm) ||
    (m.cnh && m.cnh.includes(searchTerm)) ||
    (transportadoraNomes[m.transportadoraId] || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const motRes = await api.get<Motorista[]>('/api/motoristas');
      console.log('Motoristas carregados:', motRes.data);
      setMotoristas(motRes.data);
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: 'Erro ao carregar dados', severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleOpenNovo = ()=>{
    setCurrent({ nome:'', telefone:'', cpf:'', cnh:'', transportadoraId:'' });
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleOpenEdit = (m:Motorista)=>{
    setCurrent({ ...m });
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = ()=>{ setOpenDialog(false); setCurrent(null); };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>)=>{
    const {name,value} = e.target;
    setCurrent(prev => ({ ...prev!, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!current) return;

    // Validações básicas
    if (!current.nome || current.nome.trim() === '') {
      setSnackbar({ open: true, message: 'Nome é obrigatório', severity: 'error' });
      return;
    }

    if (!current.cpf || current.cpf.length !== 11) {
      setSnackbar({ open: true, message: 'CPF deve ter 11 dígitos', severity: 'error' });
      return;
    }

    if (!current.telefone || (current.telefone.length !== 10 && current.telefone.length !== 11)) {
      setSnackbar({ open: true, message: 'Telefone deve ter 10 ou 11 dígitos', severity: 'error' });
      return;
    }

    if (!current.transportadoraId) {
      setSnackbar({ open: true, message: 'Transportadora é obrigatória', severity: 'error' });
      return;
    }

    try {
      setLoading(true);
      if (isEditing) {
        await api.put(`/api/motoristas/${current.id}`, current);
        setSnackbar({ open: true, message: 'Motorista atualizado com sucesso!', severity: 'success' });
      } else {
        await api.post('/api/motoristas', current);
        setSnackbar({ open: true, message: 'Motorista criado com sucesso!', severity: 'success' });
      }
      handleCloseDialog();
      await carregar();
    } catch (err: any) {
      console.error(err);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Erro ao salvar motorista';
      setSnackbar({ open: true, message: errorMessage, severity: 'error' });
    } finally {
      setLoading(false);
    }
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
              Gestão de Motoristas
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Cadastre e gerencie os motoristas autorizados para transporte de carga
            </Typography>
          </Box>
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
              startIcon={<AddIcon />}
              onClick={handleOpenNovo}
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
                            <BadgeIcon sx={{ fontSize: 16, color: '#64748b' }} />
                            <Typography variant="body2" color="#475569" sx={{ fontFamily: 'monospace' }}>
                              {motorista.cnh}
                            </Typography>
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={transportadoraNomes[motorista.transportadoraId] || motorista.transportadoraId}
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
                              onClick={() => handleOpenEdit(motorista)}
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
        onClose={handleCloseDialog}
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
            {isEditing ? 'Editar Motorista' : 'Novo Motorista'}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Nome"
              fullWidth
              required
              name="nome"
              value={current?.nome || ''}
              onChange={handleChange}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <InputMask
                mask="telefone"
                value={current?.telefone || ''}
                onChange={(value) => setCurrent(prev => ({ ...prev!, telefone: value }))}
                label="Telefone"
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <InputMask
                mask="cpf"
                value={current?.cpf || ''}
                onChange={(value) => setCurrent(prev => ({ ...prev!, cpf: value }))}
                label="CPF"
                fullWidth
                required
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            </Stack>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <InputMask
                mask="cnh"
                value={current?.cnh || ''}
                onChange={(value) => setCurrent(prev => ({ ...prev!, cnh: value }))}
                label="CNH"
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
              <FormControl fullWidth required>
                <InputLabel>Transportadora</InputLabel>
                <Select
                  value={current?.transportadoraId || ''}
                  label="Transportadora"
                  name="transportadoraId"
                  onChange={(e) => setCurrent(prev => ({ ...prev!, transportadoraId: e.target.value }))}
                  sx={{
                    borderRadius: 2,
                  }}
                >
                  {Object.entries(transportadoraNomes).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
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
                borderColor: alpha(theme.palette.divider, 0.5)
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              '&:hover': {
                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
              }
            }}
          >
            {isEditing ? 'Atualizar' : 'Cadastrar'}
          </Button>
        </DialogActions>
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
    </Container>
  );
}

function MotoristasPage() {
  return (
    <ProtectedRoute>
      <MotoristasContent />
    </ProtectedRoute>
  );
}

export default MotoristasPage;
