import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { SelectChangeEvent } from '@mui/material/Select';
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
  Select,
  FormControl,
  InputLabel,
  FormControlLabel,
  Switch,
  Box,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  DialogContentText,
  Avatar,
  Chip,
  useTheme,
  useMediaQuery,
  Stack,
  Fade,
  InputAdornment,
  Grid,
  alpha
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon, 
  Add as AddIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
  Shield as ShieldIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import AdminRoute from '../../../components/admin/AdminRoute';
import { TipoUsuario } from '@prisma/client';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

interface Usuario {
  id: string;
  nome: string;
  email: string;
  tipo: TipoUsuario;
  ativo: boolean;
  dataCriacao: string;
  ultimoAcesso?: string | null;
  senha?: string;
  confirmarSenha?: string;
  foto?: string | null;
}

function GerenciarUsuariosContent() {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentUsuario, setCurrentUsuario] = useState<Partial<Usuario> | null>(null);
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

  // Carregar usuários quando o componente for montado
  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/usuarios');
      setUsuarios(response.data);
    } catch (error: unknown) {
      console.error('Erro ao carregar usuários:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar usuários';
      setError(`Erro ao carregar usuários: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenNovoUsuario = () => {
    setCurrentUsuario({
      nome: '',
      email: '',
      tipo: 'USUARIO',
      ativo: true,
      senha: '',
      confirmarSenha: ''
    });
    setIsEditing(false);
    setOpenDialog(true);
  };

  const handleOpenEditarUsuario = (usuario: Usuario) => {
    setCurrentUsuario({
      ...usuario,
      senha: '',
      confirmarSenha: ''
    });
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentUsuario(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }> | 
    SelectChangeEvent<TipoUsuario>
  ) => {
    const { name, value } = e.target as { name: string; value: unknown };
    setCurrentUsuario(prev => ({
      ...prev!,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUsuario) return;

    try {
      setLoading(true);
      
      if (isEditing) {
        await api.post('/api/admin/usuarios/edit', {
          id: currentUsuario.id,
          nome: currentUsuario.nome,
          tipo: currentUsuario.tipo,
          senha: currentUsuario.senha,
          ativo: currentUsuario.ativo
        });
        setSnackbar({ open: true, message: 'Usuário atualizado com sucesso!', severity: 'success' });
      } else {
        await api.post('/api/admin/usuarios', currentUsuario);
        setSnackbar({ open: true, message: 'Usuário criado com sucesso!', severity: 'success' });
      }
      
      handleCloseDialog();
      await carregarUsuarios();
    } catch (error: unknown) {
      console.error('Erro ao salvar usuário:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error && 
                         error.response && typeof error.response === 'object' && 
                         'data' in error.response && 
                         error.response.data && typeof error.response.data === 'object' &&
                         'message' in error.response.data ?
                         String(error.response.data.message) : 'Erro ao salvar usuário';
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' as const
      });
    } finally {
      setLoading(false);
    }
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    content: string;
    onConfirm: () => Promise<void>;
  }>({
    open: false,
    title: '',
    content: '',
    onConfirm: async () => {}
  });

  const handleToggleStatus = (id: string, ativo: boolean) => {
    setConfirmDialog({
      open: true,
      title: ativo ? 'Desativar Usuário' : 'Ativar Usuário',
      content: ativo 
        ? 'Tem certeza que deseja desativar este usuário? Ele não poderá mais acessar o sistema até que seja ativado novamente.'
        : 'Tem certeza que deseja ativar este usuário? Ele terá acesso ao sistema de acordo com as permissões do seu perfil.',
      onConfirm: async () => {
        try {
          setLoading(true);
        await api.post('/api/admin/usuarios/toggle-status', { id, ativo: !ativo });
          await carregarUsuarios();
          setSnackbar({ 
            open: true, 
            message: `Usuário ${!ativo ? 'ativado' : 'desativado'} com sucesso!`, 
            severity: 'success' 
          });
        } catch (error: unknown) {
          console.error('Erro ao atualizar status do usuário:', error);
          const errorMessage = error && typeof error === 'object' && 'response' in error && 
                            error.response && typeof error.response === 'object' && 
                            'data' in error.response && 
                            error.response.data && typeof error.response.data === 'object' &&
                            'message' in error.response.data ?
                            String(error.response.data.message) : 'Erro ao atualizar status do usuário';
          
          setSnackbar({ 
            open: true, 
            message: errorMessage,
            severity: 'error' as const
          });
        } finally {
          setLoading(false);
          setConfirmDialog(prev => ({ ...prev, open: false }));
        }
      }
    });
  };

  const handleCloseConfirmDialog = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }));
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTipoLabel = (tipo: TipoUsuario) => {
    switch (tipo) {
      case 'ADMIN': return 'Administrador';
      case 'GERENTE': return 'Gerente';
      case 'SEPARADOR': return 'Separador';
      case 'CONFERENTE': return 'Conferente';
      case 'AUDITOR': return 'Auditor';
      default: return 'Usuário';
    }
  };

  const getTipoColor = (tipo: TipoUsuario) => {
    switch (tipo) {
      case 'ADMIN': return 'error';
      case 'GERENTE': return 'warning';
      case 'SEPARADOR': return 'info';
      case 'CONFERENTE': return 'primary';
      case 'AUDITOR': return 'secondary';
      default: return 'default';
    }
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
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
              fontWeight: 600,
            }}
          >
            {error}
          </Alert>
        </MotionBox>
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
            <PeopleIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
              Gestão de Usuários
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Administre as permissões e contas de acesso ao sistema.
            </Typography>
          </Box>
          <Stack direction="row" spacing={2}>
            <Tooltip title="Atualizar lista">
              <IconButton
                onClick={carregarUsuarios}
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
              startIcon={<PersonAddIcon />}
              onClick={handleOpenNovoUsuario}
              sx={{
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
                '&:hover': {
                  background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                  boxShadow: `0 6px 25px ${alpha(theme.palette.primary.main, 0.4)}`,
                }
              }}
            >
              Novo Usuário
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
          placeholder="Buscar usuário por nome ou e-mail..."
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
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Usuário</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Último Acesso</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: '#475569' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
              <TableBody>
              {loading && usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <CircularProgress size={40} thickness={4} />
                    <Typography sx={{ mt: 2, color: 'text.secondary', fontWeight: 500 }}>
                      Carregando usuários...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : filteredUsuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                    <PeopleIcon sx={{ fontSize: 48, color: alpha('#94a3b8', 0.2), mb: 2 }} />
                    <Typography variant="h6" fontWeight="600" color="text.secondary">
                      Nenhum usuário encontrado
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      Tente ajustar os filtros ou adicionar um novo usuário
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence>
                  {filteredUsuarios.map((usuario, index) => (
                    <MotionTableRow
                      key={usuario.id}
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
                            src={usuario.foto || undefined}
                            sx={{
                              width: 40,
                              height: 40,
                              background: `linear-gradient(135deg, ${alpha('#3b82f6', 0.1)} 0%, ${alpha('#8b5cf6', 0.1)} 100%)`,
                              color: '#3b82f6',
                              fontWeight: 600,
                              fontSize: '0.875rem'
                            }}
                          >
                            {usuario.nome.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight="600" color="#1e293b">
                              {usuario.nome}
                            </Typography>
                            <Typography variant="caption" color="#64748b">
                              {usuario.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getTipoLabel(usuario.tipo)}
                          color={getTipoColor(usuario.tipo)}
                          size="small"
                          icon={<ShieldIcon sx={{ fontSize: '14px !important' }} />}
                          sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={usuario.ativo ? 'Ativo' : 'Inativo'}
                          color={usuario.ativo ? 'success' : 'default'}
                          variant={usuario.ativo ? 'filled' : 'outlined'}
                          size="small"
                          icon={usuario.ativo ? <CheckCircleIcon /> : <CancelIcon />}
                          sx={{ fontWeight: 500, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="#475569">
                          {usuario.ultimoAcesso 
                            ? new Date(usuario.ultimoAcesso).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) 
                            : 'Nunca acessou'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Tooltip title="Editar Usuário">
                            <IconButton 
                              onClick={() => handleOpenEditarUsuario(usuario)}
                              disabled={usuario.id === user?.id}
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
                          <Tooltip title={usuario.ativo ? 'Desativar Usuário' : 'Ativar Usuário'}>
                            <IconButton 
                              onClick={() => handleToggleStatus(usuario.id, usuario.ativo)}
                              disabled={usuario.id === user?.id}
                              sx={{
                                color: usuario.ativo ? '#ef4444' : '#10b981',
                                '&:hover': {
                                  background: usuario.ativo ? alpha('#ef4444', 0.1) : alpha('#10b981', 0.1),
                                  color: usuario.ativo ? '#dc2626' : '#059669'
                                }
                              }}
                            >
                              {usuario.ativo ? <DeleteIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
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

      {/* Diálogo de formulário */}
      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: { borderRadius: 4, p: 1 }
        }}
      >
        <form onSubmit={handleSubmit}>
          <DialogTitle sx={{ fontWeight: '800', fontSize: '1.5rem', pb: 0 }}>
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ mb: 3 }}>
              {isEditing ? 'Atualize as informações do usuário abaixo.' : 'Preencha os dados para criar um novo acesso ao sistema.'}
            </DialogContentText>
            <Stack spacing={2.5}>
              <TextField
                label="Nome Completo"
                name="nome"
                value={currentUsuario?.nome || ''}
                onChange={handleInputChange}
                required
                fullWidth
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <TextField
                label="E-mail"
                name="email"
                type="email"
                value={currentUsuario?.email || ''}
                onChange={handleInputChange}
                required
                fullWidth
                disabled={isEditing}
                InputProps={{ sx: { borderRadius: 2 } }}
              />
              <FormControl fullWidth>
                <InputLabel id="tipo-usuario-label">Tipo de Usuário</InputLabel>
                <Select
                  labelId="tipo-usuario-label"
                  name="tipo"
                  value={currentUsuario?.tipo || 'USUARIO'}
                  onChange={handleInputChange}
                  label="Tipo de Usuário"
                  required
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="ADMIN">
                    <Box sx={{ py: 0.5 }}>
                      <Box fontWeight="600">Administrador</Box>
                      <Typography variant="caption" color="text.secondary">Acesso total ao sistema</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="GERENTE">
                    <Box sx={{ py: 0.5 }}>
                      <Box fontWeight="600">Gerente</Box>
                      <Typography variant="caption" color="text.secondary">Relatórios e gestão de operações</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="USUARIO">
                    <Box sx={{ py: 0.5 }}>
                      <Box fontWeight="600">Usuário</Box>
                      <Typography variant="caption" color="text.secondary">Acesso operacional básico</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="SEPARADOR">
                    <Box sx={{ py: 0.5 }}>
                      <Box fontWeight="600">Separador</Box>
                      <Typography variant="caption" color="text.secondary">Acesso à área de Separação</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="CONFERENTE">
                    <Box sx={{ py: 0.5 }}>
                      <Box fontWeight="600">Conferente</Box>
                      <Typography variant="caption" color="text.secondary">Acesso à área de Conferência</Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="AUDITOR">
                    <Box sx={{ py: 0.5 }}>
                      <Box fontWeight="600">Auditor</Box>
                      <Typography variant="caption" color="text.secondary">Acesso à área de Auditoria</Typography>
                    </Box>
                  </MenuItem>
                </Select>
              </FormControl>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label={isEditing ? 'Nova Senha' : 'Senha'}
                    name="senha"
                    type="password"
                    value={currentUsuario?.senha || ''}
                    onChange={handleInputChange}
                    fullWidth
                    required={!isEditing}
                    placeholder={isEditing ? 'Opcional' : ''}
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Confirmar Senha"
                    name="confirmarSenha"
                    type="password"
                    value={currentUsuario?.confirmarSenha || ''}
                    onChange={handleInputChange}
                    fullWidth
                    required={!isEditing}
                    InputProps={{ sx: { borderRadius: 2 } }}
                  />
                </Grid>
              </Grid>

              {currentUsuario?.senha && currentUsuario?.confirmarSenha && 
                currentUsuario.senha !== currentUsuario.confirmarSenha && (
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
                      fontWeight: 600,
                    }}
                  >
                    As senhas não coincidem
                  </Alert>
              )}

              <FormControlLabel
                control={
                  <Switch
                    name="ativo"
                    checked={currentUsuario?.ativo || false}
                    onChange={(e) => {
                      const { checked } = e.target;
                      setCurrentUsuario(prev => ({ ...prev!, ativo: checked }));
                    }}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" fontWeight="600">Usuário Ativo</Typography>
                    <Typography variant="caption" color="text.secondary">Define se o usuário pode logar no sistema</Typography>
                  </Box>
                }
                sx={{ ml: 0.5 }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 3, gap: 1 }}>
            <Button 
              onClick={handleCloseDialog} 
              color="inherit"
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: '600' }}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={
                loading || 
                !currentUsuario?.nome || 
                !currentUsuario?.email || 
                (!isEditing && (!currentUsuario?.senha || currentUsuario.senha !== currentUsuario.confirmarSenha))
              }
              sx={{ 
                borderRadius: 2, 
                px: 4, 
                textTransform: 'none', 
                fontWeight: '700',
                boxShadow: '0 4px 12px rgba(25, 118, 210, 0.2)'
              }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Salvar Alterações'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Diálogo de confirmação */}
      <Dialog 
        open={confirmDialog.open} 
        onClose={handleCloseConfirmDialog}
        PaperProps={{ sx: { borderRadius: 4, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: '800' }}>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirmDialog.content}</DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 3, gap: 1 }}>
          <Button 
            onClick={handleCloseConfirmDialog} 
            color="inherit"
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: '600' }}
          >
            Voltar
          </Button>
          <Button 
            onClick={confirmDialog.onConfirm} 
            color={confirmDialog.title.includes('Desativar') ? 'error' : 'success'}
            variant="contained"
            sx={{ borderRadius: 2, px: 3, textTransform: 'none', fontWeight: '700' }}
          >
            Confirmar
          </Button>
        </DialogActions>
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

const GerenciarUsuarios = () => {
  return (
    <AdminRoute>
      <GerenciarUsuariosContent />
    </AdminRoute>
  );
};

export default GerenciarUsuarios;
