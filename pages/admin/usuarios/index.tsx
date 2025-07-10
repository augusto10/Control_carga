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
  DialogContentText
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import AdminRoute from '../../../components/admin/AdminRoute';
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

function GerenciarUsuariosContent() {
  const { user } = useAuth();
  // Removidas variáveis não utilizadas: isAuthenticated, logout, router
  // Elas foram mantidas no comentário para referência futura, caso sejam necessárias
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
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Gerenciar Usuários
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Gerencie os usuários e suas permissões de acesso ao sistema
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleOpenNovoUsuario}
          sx={{ height: 'fit-content' }}
        >
          Novo Usuário
        </Button>
      </Box>

      <Paper sx={{ width: '100%', overflow: 'hidden', boxShadow: 3 }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nome</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>E-mail</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Último Acesso</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        {loading ? 'Carregando usuários...' : 'Nenhum usuário encontrado'}
                      </Typography>
                      {!loading && (
                        <Button 
                          variant="outlined" 
                          color="primary" 
                          startIcon={<AddIcon />}
                          onClick={handleOpenNovoUsuario}
                          sx={{ mt: 1 }}
                        >
                          Adicionar Usuário
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((usuario) => (
                  <TableRow key={usuario.id}>
                    <TableCell>{usuario.nome}</TableCell>
                    <TableCell>{usuario.email}</TableCell>
                    <TableCell>
                      <Box 
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: usuario.tipo === 'ADMIN' ? 'primary.light' : 
                                    usuario.tipo === 'GERENTE' ? 'secondary.light' : 'grey.200',
                          color: usuario.tipo === 'ADMIN' ? 'primary.contrastText' : 
                                   usuario.tipo === 'GERENTE' ? 'secondary.contrastText' : 'text.primary',
                          fontWeight: 'medium',
                          fontSize: '0.75rem',
                        }}
                      >
                        {usuario.tipo === 'ADMIN' ? 'Administrador' : 
                         usuario.tipo === 'GERENTE' ? 'Gerente' : 'Usuário'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box 
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          bgcolor: usuario.ativo ? 'success.light' : 'error.light',
                          color: 'white',
                          fontWeight: 'medium',
                          fontSize: '0.75rem',
                        }}
                      >
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </Box>
                    </TableCell>
                    <TableCell>
                      {usuario.ultimoAcesso 
                        ? new Date(usuario.ultimoAcesso).toLocaleString() 
                        : 'Nunca acessou'}
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Tooltip title="Editar usuário">
                          <span>
                            <IconButton 
                              onClick={() => handleOpenEditarUsuario(usuario)}
                              color="primary"
                              disabled={usuario.id === user?.id}
                              size="small"
                              sx={{
                                '&:hover': { backgroundColor: 'primary.light', color: 'white' },
                              }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title={usuario.ativo ? 'Desativar usuário' : 'Ativar usuário'}>
                          <span>
                            <IconButton 
                              onClick={() => handleToggleStatus(usuario.id, usuario.ativo)}
                              color={usuario.ativo ? 'error' : 'success'}
                              disabled={usuario.id === user?.id}
                              size="small"
                              sx={{
                                '&:hover': { 
                                  backgroundColor: usuario.ativo ? 'error.light' : 'success.light', 
                                  color: 'white' 
                                },
                              }}
                            >
                              {usuario.ativo ? 
                                <DeleteIcon fontSize="small" /> : 
                                <span style={{ fontSize: '0.8rem' }}>Ativar</span>
                              }
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
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
                  <MenuItem value="ADMIN">
                    <Box>
                      <Box fontWeight="medium">Administrador</Box>
                      <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                        Acesso total ao sistema
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="GERENTE">
                    <Box>
                      <Box fontWeight="medium">Gerente</Box>
                      <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                        Acesso a relatórios e gestão de operações
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="USUARIO">
                    <Box>
                      <Box fontWeight="medium">Usuário</Box>
                      <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                        Acesso básico ao sistema
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="SEPARADOR">
                    <Box>
                      <Box fontWeight="medium">Separador</Box>
                      <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                        Acesso à área de Separação
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="CONFERENTE">
                    <Box>
                      <Box fontWeight="medium">Conferente</Box>
                      <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                        Acesso à área de Conferência
                      </Typography>
                    </Box>
                  </MenuItem>
                  <MenuItem value="AUDITOR">
                    <Box>
                      <Box fontWeight="medium">Auditor</Box>
                      <Typography variant="caption" color="text.secondary" fontSize="0.75rem">
                        Acesso à área de Auditoria
                      </Typography>
                    </Box>
                  </MenuItem>
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

      {/* Diálogo de Confirmação */}
      <Dialog
        open={confirmDialog.open}
        onClose={handleCloseConfirmDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {confirmDialog.content}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleCloseConfirmDialog} 
            color="inherit"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={confirmDialog.onConfirm} 
            color={confirmDialog.title.includes('Desativar') ? 'error' : 'primary'}
            variant="contained"
            autoFocus
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
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
