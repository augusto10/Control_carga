import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
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
  Snackbar
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '@/contexts/AuthContext';
import { TipoUsuario } from '@prisma/client';
import { api } from '@/services/api';

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
}

export default function GerenciarUsuarios() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
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

  // Verificar se o usuário tem permissão
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.tipo !== 'ADMIN') {
      setError('Acesso negado. Você não tem permissão para acessar esta página.');
      setLoading(false);
    } else {
      carregarUsuarios();
    }
  }, [isAuthenticated, user, router]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
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
        await api.put(`/api/admin/usuarios/${currentUsuario.id}`, currentUsuario);
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

  const handleToggleStatus = async (id: string, ativo: boolean) => {
    if (!window.confirm(`Tem certeza que deseja ${ativo ? 'desativar' : 'ativar'} este usuário?`)) {
      return;
    }

    try {
      setLoading(true);
      await api.patch(`/api/admin/usuarios/${id}/status`, { ativo: !ativo });
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
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
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
          Gerenciar Usuários
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleOpenNovoUsuario}
        >
          Novo Usuário
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nome</TableCell>
                <TableCell>E-mail</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Último Acesso</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.map((usuario) => (
                <TableRow key={usuario.id}>
                  <TableCell>{usuario.nome}</TableCell>
                  <TableCell>{usuario.email}</TableCell>
                  <TableCell>
                    {usuario.tipo === 'ADMIN' ? 'Administrador' : 
                     usuario.tipo === 'GERENTE' ? 'Gerente' : 'Usuário'}
                  </TableCell>
                  <TableCell>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={usuario.ativo}
                          onChange={() => handleToggleStatus(usuario.id, usuario.ativo)}
                          color="primary"
                        />
                      }
                      label={usuario.ativo ? 'Ativo' : 'Inativo'}
                    />
                  </TableCell>
                  <TableCell>
                    {usuario.ultimoAcesso 
                      ? new Date(usuario.ultimoAcesso).toLocaleString() 
                      : 'Nunca acessou'}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      onClick={() => handleOpenEditarUsuario(usuario)}
                      color="primary"
                      disabled={usuario.id === user?.id}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      onClick={() => handleToggleStatus(usuario.id, usuario.ativo)}
                      color={usuario.ativo ? 'error' : 'success'}
                      disabled={usuario.id === user?.id}
                    >
                      {usuario.ativo ? <DeleteIcon /> : <span>Ativar</span>}
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Diálogo de formulário */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField
                label="Nome"
                name="nome"
                value={currentUsuario?.nome || ''}
                onChange={handleInputChange}
                required
                fullWidth
                margin="normal"
              />
              <TextField
                label="E-mail"
                name="email"
                type="email"
                value={currentUsuario?.email || ''}
                onChange={handleInputChange}
                required
                fullWidth
                margin="normal"
                disabled={isEditing}
              />
              <FormControl fullWidth margin="normal">
                <InputLabel id="tipo-usuario-label">Tipo de Usuário</InputLabel>
                <Select
                  labelId="tipo-usuario-label"
                  name="tipo"
                  value={currentUsuario?.tipo || 'USUARIO'}
                  onChange={handleInputChange}
                  label="Tipo de Usuário"
                  required
                >
                  <MenuItem value="ADMIN">Administrador</MenuItem>
                  <MenuItem value="GERENTE">Gerente</MenuItem>
                  <MenuItem value="USUARIO">Usuário</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label={isEditing ? 'Nova Senha (deixe em branco para não alterar)' : 'Senha'}
                name="senha"
                type="password"
                value={currentUsuario?.senha || ''}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required={!isEditing}
              />
              <TextField
                label="Confirmar Senha"
                name="confirmarSenha"
                type="password"
                value={currentUsuario?.confirmarSenha || ''}
                onChange={handleInputChange}
                fullWidth
                margin="normal"
                required={!isEditing}
              />
              {!isEditing && currentUsuario?.senha && currentUsuario?.confirmarSenha && 
                currentUsuario.senha !== currentUsuario.confirmarSenha && (
                  <Alert severity="error">As senhas não coincidem</Alert>
              )}
              <FormControlLabel
                control={
                  <Switch
                    name="ativo"
                    checked={currentUsuario?.ativo || false}
                    onChange={handleInputChange}
                    color="primary"
                  />
                }
                label="Usuário ativo"
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog} color="inherit">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              color="primary" 
              variant="contained"
              disabled={
                loading || 
                !currentUsuario?.nome || 
                !currentUsuario?.email || 
                (!isEditing && (!currentUsuario?.senha || currentUsuario.senha !== currentUsuario.confirmarSenha))
              }
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
