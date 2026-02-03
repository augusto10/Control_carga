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
  CircularProgress,
  Stack,
  alpha,
  Tooltip,
  Avatar,
  InputAdornment,
  useTheme
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Phone as PhoneIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import ProtectedRoute from '../components/ProtectedRoute';
import ResponsiveContainer from '../components/ResponsiveContainer';
import InputMask from '../components/InputMask';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

interface Funcionario {
  id: string;
  nome: string;
  telefone: string;
  cpf: string;
  cnh?: string | null;
  transportadoraId: string;
  tipo: 'FUNCIONARIO';
  tipoLabel: string;
  dataCriacao: string;
}

interface Transportadora {
  id: string;
  nome: string;
  ativo: boolean;
}

const FuncionariosPage: React.FC = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
  const [busca, setBusca] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    cpf: '',
    transportadoraId: ''
  });

  useEffect(() => {
    if (user) {
      buscarDados();
    }
  }, [user]);

  const buscarDados = async () => {
    try {
      setLoading(true);
      
      // Buscar funcionários
      const resFuncionarios = await fetch('/api/pessoas?tipo=FUNCIONARIO', {
        credentials: 'include'
      });
      
      if (resFuncionarios.ok) {
        const funcionariosData = await resFuncionarios.json();
        setFuncionarios(funcionariosData);
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

  const handleOpenDialog = (funcionario?: Funcionario) => {
    if (funcionario) {
      setEditando(funcionario);
      setFormData({
        nome: funcionario.nome,
        telefone: funcionario.telefone,
        cpf: funcionario.cpf,
        transportadoraId: funcionario.transportadoraId
      });
    } else {
      setEditando(null);
      setFormData({
        nome: '',
        telefone: '',
        cpf: '',
        transportadoraId: 'RETIRA_VENDEDOR' // Padrão para funcionários
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
        tipo: 'FUNCIONARIO'
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
          editando ? 'Funcionário atualizado com sucesso!' : 'Funcionário cadastrado com sucesso!',
          { variant: 'success' }
        );
        handleCloseDialog();
        buscarDados();
      } else {
        const errorData = await response.json();
        enqueueSnackbar(errorData.error || 'Erro ao salvar funcionário', { variant: 'error' });
      }
    } catch (error) {
      console.error('Erro ao salvar funcionário:', error);
      enqueueSnackbar('Erro ao salvar funcionário', { variant: 'error' });
    }
  };

  const handleDelete = async (funcionario: Funcionario) => {
    if (window.confirm(`Tem certeza que deseja excluir o funcionário ${funcionario.nome}?`)) {
      try {
        const response = await fetch(`/api/pessoas/${funcionario.id}`, {
          method: 'DELETE',
          credentials: 'include'
        });

        if (response.ok) {
          enqueueSnackbar('Funcionário excluído com sucesso!', { variant: 'success' });
          buscarDados();
        } else {
          const errorData = await response.json();
          enqueueSnackbar(errorData.error || 'Erro ao excluir funcionário', { variant: 'error' });
        }
      } catch (error) {
        console.error('Erro ao excluir funcionário:', error);
        enqueueSnackbar('Erro ao excluir funcionário', { variant: 'error' });
      }
    }
  };

  const funcionariosFiltrados = funcionarios.filter(f => 
    f.nome.toLowerCase().includes(busca.toLowerCase()) ||
    f.cpf.includes(busca) ||
    f.telefone.includes(busca)
  );

  return (
      <ResponsiveContainer
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Funcionários' }
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
                  <PersonIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="800" color="#1e293b" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    Funcionários
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="500">
                    Gerencie a equipe interna e motoristas vinculados
                  </Typography>
                </Box>
              </Stack>

              <Stack direction="row" spacing={2} width={{ xs: '100%', md: 'auto' }}>
                <Tooltip title="Atualizar lista">
                  <IconButton 
                    onClick={buscarDados} 
                    disabled={loading}
                    sx={{ 
                      bgcolor: 'white', 
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: '#e2e8f0',
                      width: 48,
                      height: 48
                    }}
                  >
                    <RefreshIcon className={loading ? 'spin-animation' : ''} />
                  </IconButton>
                </Tooltip>
                
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => handleOpenDialog()}
                  sx={{
                    borderRadius: '12px',
                    px: 3,
                    fontWeight: 700,
                    textTransform: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    flexGrow: { xs: 1, md: 0 }
                  }}
                >
                  Novo Funcionário
                </Button>
              </Stack>
            </Stack>
          </MotionBox>

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
            <TextField
              fullWidth
              placeholder="Pesquisar por nome, CPF ou telefone..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
                sx: { 
                  borderRadius: '16px',
                  bgcolor: alpha('#f8fafc', 0.5),
                  '&:hover': { bgcolor: alpha('#f8fafc', 0.8) }
                }
              }}
              sx={{ mb: 3 }}
            />

            <TableContainer sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid', borderColor: alpha('#e2e8f0', 0.6) }}>
              <Table>
                <TableHead sx={{ bgcolor: alpha('#f8fafc', 0.8) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Funcionário</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Contato / Documento</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Transportadora</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Data Cadastro</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                        <CircularProgress size={40} thickness={4} />
                        <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
                          Carregando funcionários...
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : funcionariosFiltrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                        <PersonIcon sx={{ fontSize: 48, color: alpha('#94a3b8', 0.2), mb: 2 }} />
                        <Typography variant="h6" fontWeight="600" color="text.secondary">
                          Nenhum funcionário encontrado
                        </Typography>
                        <Typography variant="body2" color="text.disabled">
                          Tente ajustar sua busca ou cadastre um novo funcionário.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {funcionariosFiltrados.map((funcionario, index) => (
                        <MotionTableRow 
                          key={funcionario.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          transition={{ delay: index * 0.03 }}
                          hover
                          sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}
                        >
                          <TableCell>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 700 }}>
                                {funcionario.nome.charAt(0).toUpperCase()}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2" fontWeight="700" color="#1e293b">
                                  {funcionario.nome}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" fontWeight="500">
                                  ID: {funcionario.id.slice(0, 8)}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.5}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2" fontWeight="500">{funcionario.telefone}</Typography>
                              </Stack>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <BadgeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="body2" color="text.secondary">{funcionario.cpf}</Typography>
                              </Stack>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={funcionario.transportadoraId} 
                              size="small"
                              icon={<BusinessIcon sx={{ fontSize: '14px !important' }} />}
                              sx={{ 
                                fontWeight: 700, 
                                borderRadius: '8px',
                                bgcolor: alpha(theme.palette.primary.main, 0.05),
                                color: 'primary.main',
                                border: '1px solid',
                                borderColor: alpha(theme.palette.primary.main, 0.1)
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" fontWeight="500">
                              {new Date(funcionario.dataCriacao).toLocaleDateString('pt-BR')}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Editar">
                              <IconButton
                                size="small"
                                onClick={() => handleOpenDialog(funcionario)}
                                sx={{ color: 'primary.main', mr: 1, bgcolor: alpha(theme.palette.primary.main, 0.05) }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Excluir">
                              <IconButton
                                size="small"
                                onClick={() => handleDelete(funcionario)}
                                sx={{ color: 'error.main', bgcolor: alpha(theme.palette.error.main, 0.05) }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </MotionTableRow>
                      ))}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </MotionPaper>

        {/* Dialog para adicionar/editar funcionário */}
        <Dialog 
          open={openDialog} 
          onClose={handleCloseDialog} 
          maxWidth="sm" 
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: '24px',
              p: 1
            }
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#1e293b' }}>
            {editando ? 'Editar Funcionário' : 'Novo Funcionário'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
              <TextField
                label="Nome Completo"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '12px' }
                }}
              />
              
              <InputMask
                label="Telefone"
                mask="telefone"
                value={formData.telefone}
                onChange={(value) => setFormData({ ...formData, telefone: value })}
                fullWidth
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '12px' }
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
                      <BadgeIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '12px' }
                }}
              />
              
              <TextField
                select
                label="Transportadora / Vínculo"
                value={formData.transportadoraId}
                onChange={(e) => setFormData({ ...formData, transportadoraId: e.target.value })}
                fullWidth
                required
                helperText="Funcionários usam 'Retira Vendedor' por padrão"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <BusinessIcon color="action" />
                    </InputAdornment>
                  ),
                  sx: { borderRadius: '12px' }
                }}
              >
                <MenuItem value="RETIRA_VENDEDOR">Retira Vendedor</MenuItem>
                {transportadoras.map((transportadora) => (
                  <MenuItem key={transportadora.id} value={transportadora.id}>
                    {transportadora.nome}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseDialog} sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              disabled={!formData.nome || !formData.telefone || !formData.cpf || !formData.transportadoraId}
              sx={{ 
                borderRadius: '12px', 
                px: 4, 
                fontWeight: 700,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
              }}
            >
              {editando ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogActions>
        </Dialog>

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </ResponsiveContainer>
  );
};

export default FuncionariosPage;
