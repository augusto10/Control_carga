import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/router';
import {
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Box,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  alpha,
  Stack,
  Avatar,
  useTheme,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  LocalShipping as ShippingIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import InputMask from '../components/InputMask';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';
import ResponsiveContainer from '@/components/ResponsiveContainer';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnh?: string | null;
  transportadoraId: string;
  tipo: 'CLIENTE';
  tipoLabel: string;
  dataCriacao: string;
}

interface Transportadora {
  id: string;
  nome: string;
  ativo: boolean;
}

const ClientesPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    transportadoraId: ''
  });

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    buscarDados();
  }, [user, router]);

  const buscarDados = async () => {
    try {
      setLoading(true);
      
      // Buscar clientes
      const resClientes = await fetch('/api/pessoas?tipo=CLIENTE', {
        credentials: 'include'
      });
      
      if (resClientes.ok) {
        const clientesData = await resClientes.json();
        setClientes(clientesData);
      }

      // Buscar transportadoras
      const resTransportadoras = await fetch('/api/transportadoras', {
        credentials: 'include'
      });
      
      if (resTransportadoras.ok) {
        const transportadorasData = await resTransportadoras.json();
        setTransportadoras(transportadorasData.filter((t: Transportadora) => t.ativo));
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      enqueueSnackbar('Erro ao carregar dados', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditando(cliente);
      setFormData({
        nome: cliente.nome,
        telefone: cliente.telefone,
        cpf: cliente.cpf,
        transportadoraId: cliente.transportadoraId
      });
    } else {
      setEditando(null);
      setFormData({
        nome: '',
        telefone: '',
        cpf: '',
        transportadoraId: 'RETIRA_CLIENTE' // Padrão para clientes
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditando(null);
    setFormData({
      nome: '',
      telefone: '',
      cpf: '',
      transportadoraId: ''
    });
  };

  const handleSubmit = async () => {
    try {
      const dadosEnvio = {
        ...formData,
        tipo: 'CLIENTE'
      };

      let response;
      if (editando) {
        response = await fetch(`/api/pessoas/${editando.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(dadosEnvio)
        });
      } else {
        response = await fetch('/api/pessoas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(dadosEnvio)
        });
      }

      if (response.ok) {
        enqueueSnackbar(
          editando ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!',
          { variant: 'success' }
        );
        handleCloseDialog();
        buscarDados();
      } else {
        const errorData = await response.json();
        enqueueSnackbar(errorData.error || 'Erro ao salvar cliente', { variant: 'error' });
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      enqueueSnackbar('Erro ao salvar cliente', { variant: 'error' });
    }
  };

  const handleDelete = async (cliente: Cliente) => {
    if (confirm(`Tem certeza que deseja excluir o cliente ${cliente.nome}?`)) {
      try {
        const response = await fetch(`/api/pessoas/${cliente.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          enqueueSnackbar('Cliente excluído com sucesso!', { variant: 'success' });
          buscarDados();
        } else {
          const errorData = await response.json();
          enqueueSnackbar(errorData.error || 'Erro ao excluir cliente', { variant: 'error' });
        }
      } catch (error) {
        console.error('Erro ao excluir cliente:', error);
        enqueueSnackbar('Erro ao excluir cliente', { variant: 'error' });
      }
    }
  };

  const clientesFiltrados = clientes.filter(c => 
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.cpf.includes(search) ||
    c.telefone.includes(search)
  );

  if (!user) return null;

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Clientes' }
        ]}
      >
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{ mb: 4 }}
        >
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={2}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 56, 
                  height: 56, 
                  boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                }}>
                  <BusinessIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="800" color="#1e293b" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    Clientes
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="500">
                    Gerencie o cadastro de clientes e parceiros
                  </Typography>
                </Box>
              </Stack>

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{
                  borderRadius: '12px',
                  px: 3,
                  py: 1.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  }
                }}
              >
                Novo Cliente
              </Button>
            </Stack>
          </MotionBox>

          <MotionPaper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              mb: 3,
              borderRadius: '24px',
              border: '1px solid',
              borderColor: alpha('#e2e8f0', 0.6),
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <TextField
                fullWidth
                placeholder="Buscar por nome, CPF ou telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '14px', bgcolor: 'white' }
                }}
              />
              <Tooltip title="Atualizar">
                <IconButton 
                  onClick={buscarDados} 
                  disabled={loading}
                  sx={{ 
                    bgcolor: 'white', 
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: '#e2e8f0',
                    width: 56,
                    height: 56
                  }}
                >
                  <RefreshIcon className={loading ? 'spin-animation' : ''} />
                </IconButton>
              </Tooltip>
            </Stack>
          </MotionPaper>

          {loading && clientes.length === 0 ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer 
              component={MotionPaper}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              elevation={0}
              sx={{ 
                borderRadius: '24px', 
                border: '1px solid',
                borderColor: alpha('#e2e8f0', 0.6),
                overflow: 'hidden',
                bgcolor: 'rgba(255, 255, 255, 0.9)'
              }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: alpha('#f8fafc', 0.8) }}>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', py: 2.5 }}>Nome</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contato</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Documento</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Transportadora</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569', textAlign: 'center' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {clientesFiltrados.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} sx={{ textAlign: 'center', py: 8 }}>
                          <Box sx={{ opacity: 0.5 }}>
                            <PersonIcon sx={{ fontSize: 48, mb: 1 }} />
                            <Typography variant="h6" fontWeight="600">
                              Nenhum cliente encontrado
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      clientesFiltrados.map((cliente, index) => (
                        <MotionTableRow 
                          key={cliente.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: index * 0.03 }}
                          hover
                          sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}
                        >
                          <TableCell sx={{ py: 2 }}>
                            <Stack direction="row" alignItems="center" spacing={1.5}>
                              <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 700, fontSize: '0.875rem' }}>
                                {cliente.nome.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="700" color="#1e293b">
                                  {cliente.nome}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Cadastrado em {new Date(cliente.dataCriacao).toLocaleDateString('pt-BR')}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <PhoneIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              <Typography variant="body2" fontWeight="600" color="#475569">
                                {cliente.telefone}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <BadgeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                              <Typography variant="body2" fontWeight="600" color="#475569">
                                {cliente.cpf}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={cliente.transportadoraId === 'RETIRA_CLIENTE' ? 'Retira Cliente' : cliente.transportadoraId} 
                              size="small"
                              sx={{ 
                                fontWeight: 700, 
                                borderRadius: '8px',
                                bgcolor: cliente.transportadoraId === 'RETIRA_CLIENTE' ? alpha('#10b981', 0.1) : alpha('#3b82f6', 0.1),
                                color: cliente.transportadoraId === 'RETIRA_CLIENTE' ? '#059669' : '#2563eb',
                                border: 'none'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(cliente)}
                                sx={{ color: 'primary.main', bgcolor: alpha(theme.palette.primary.main, 0.05), mr: 1 }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(cliente)}
                                sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </MotionTableRow>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Dialog para adicionar/editar cliente */}
          <Dialog 
            open={openDialog} 
            onClose={handleCloseDialog} 
            maxWidth="sm" 
            fullWidth
            PaperProps={{
              sx: { borderRadius: '24px', p: 1 }
            }}
          >
            <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>
              {editando ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogContent>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
                <TextField
                  label="Nome Completo"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  fullWidth
                  required
                  placeholder="Ex: João da Silva"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '14px' }
                  }}
                />
                
                <InputMask
                  label="Telefone de Contato"
                  mask="telefone"
                  value={formData.telefone}
                  onChange={(value) => setFormData({ ...formData, telefone: value })}
                  fullWidth
                  required
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PhoneIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '14px' }
                  }}
                />
                
                <InputMask
                  label="CPF"
                  mask="cpf"
                  value={formData.cpf}
                  onChange={(value) => setFormData({ ...formData, cpf: value })}
                  fullWidth
                  required
                  disabled={!!editando}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '14px' }
                  }}
                />
                
                <TextField
                  select
                  label="Transportadora Vinculada"
                  value={formData.transportadoraId}
                  onChange={(e) => setFormData({ ...formData, transportadoraId: e.target.value })}
                  fullWidth
                  required
                  helperText="Clientes usam 'Retira Cliente' por padrão"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <ShippingIcon sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '14px' }
                  }}
                >
                  <MenuItem value="RETIRA_CLIENTE">Retira Cliente</MenuItem>
                  {transportadoras.map((transportadora) => (
                    <MenuItem key={transportadora.id} value={transportadora.id}>
                      {transportadora.nome}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 1 }}>
              <Button onClick={handleCloseDialog} sx={{ fontWeight: 700, color: 'text.secondary' }}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                variant="contained"
                disabled={!formData.nome || !formData.telefone || !formData.cpf || !formData.transportadoraId}
                sx={{ 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  px: 4,
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                }}
              >
                {editando ? 'Salvar Alterações' : 'Cadastrar Cliente'}
              </Button>
            </DialogActions>
          </Dialog>
      </ResponsiveContainer>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </ProtectedRoute>
  );
};

export default ClientesPage;
