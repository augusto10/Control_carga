import React, { useState, useEffect } from 'react';
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
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  LocalShipping as TruckIcon,
  SupervisorAccount as SupervisorIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import api from '../services/api';

interface FuncionarioCliente {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  tipo: 'MOTORISTA' | 'FUNCIONARIO' | 'CLIENTE' | 'RESPONSAVEL';
  transportadoraId?: string;
  cnh?: string;
  ativo: boolean;
  observacoes?: string;
  dataCriacao: string;
}

const transportadoras = [
  { id: 'ACERT', nome: 'ACERT' },
  { id: 'EXPRESSO_GOIAS', nome: 'Expresso Goiás' },
  { id: 'ACCERT', nome: 'ACCERT' },
  { id: 'TERCEIRIZADA', nome: 'Terceirizada' },
  { id: 'DETAFRA_TRANSPORTES', nome: 'Detafra Transportes' },
  { id: 'RETIRA_VENDEDOR', nome: 'Retira Vendedor' }
];

const tiposFuncionario = [
  { id: 'MOTORISTA', nome: 'Motorista', icon: <TruckIcon /> },
  { id: 'FUNCIONARIO', nome: 'Funcionário', icon: <PersonIcon /> },
  { id: 'CLIENTE', nome: 'Cliente', icon: <BusinessIcon /> },
  { id: 'RESPONSAVEL', nome: 'Responsável', icon: <SupervisorIcon /> }
];

const FuncionariosClientes: React.FC = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [funcionarios, setFuncionarios] = useState<FuncionarioCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('');
  const [filtroAtivo, setFiltroAtivo] = useState<string>('');

  // Estado do formulário
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    tipo: 'FUNCIONARIO' as 'MOTORISTA' | 'FUNCIONARIO' | 'CLIENTE' | 'RESPONSAVEL',
    transportadoraId: '',
    cnh: '',
    ativo: true,
    observacoes: ''
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Carrega funcionários/clientes
  const carregarFuncionarios = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filtroTipo) params.append('tipo', filtroTipo);
      if (filtroAtivo) params.append('ativo', filtroAtivo);
      if (searchTerm) params.append('search', searchTerm);

      const response = await api.get(`/api/funcionarios-clientes?${params.toString()}`);
      
      if (response.data.success) {
        setFuncionarios(response.data.data);
      }
    } catch (error: any) {
      console.error('Erro ao carregar funcionários/clientes:', error);
      enqueueSnackbar('Erro ao carregar funcionários/clientes', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarFuncionarios();
  }, [filtroTipo, filtroAtivo, searchTerm]);

  // Abre o diálogo para criar/editar
  const handleOpenDialog = (funcionario?: FuncionarioCliente) => {
    if (funcionario) {
      setEditingId(funcionario.id);
      setFormData({
        nome: funcionario.nome,
        cpf: funcionario.cpf || '',
        telefone: funcionario.telefone || '',
        email: funcionario.email || '',
        tipo: funcionario.tipo,
        transportadoraId: funcionario.transportadoraId || '',
        cnh: funcionario.cnh || '',
        ativo: funcionario.ativo,
        observacoes: funcionario.observacoes || ''
      });
    } else {
      setEditingId(null);
      setFormData({
        nome: '',
        cpf: '',
        telefone: '',
        email: '',
        tipo: 'FUNCIONARIO',
        transportadoraId: '',
        cnh: '',
        ativo: true,
        observacoes: ''
      });
    }
    setFormErrors({});
    setDialogOpen(true);
  };

  // Fecha o diálogo
  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({
      nome: '',
      cpf: '',
      telefone: '',
      email: '',
      tipo: 'FUNCIONARIO',
      transportadoraId: '',
      cnh: '',
      ativo: true,
      observacoes: ''
    });
    setFormErrors({});
  };

  // Valida o formulário
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      errors.nome = 'Nome é obrigatório';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Email inválido';
    }

    if (formData.tipo === 'MOTORISTA' && !formData.cnh.trim()) {
      errors.cnh = 'CNH é obrigatória para motoristas';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Salva funcionário/cliente
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const dadosParaEnvio = {
        ...formData,
        cpf: formData.cpf || undefined,
        telefone: formData.telefone || undefined,
        email: formData.email || undefined,
        transportadoraId: formData.transportadoraId || undefined,
        cnh: formData.cnh || undefined,
        observacoes: formData.observacoes || undefined
      };

      if (editingId) {
        // Atualizar
        await api.put(`/api/funcionarios-clientes/${editingId}`, dadosParaEnvio);
        enqueueSnackbar('Funcionário/cliente atualizado com sucesso!', { variant: 'success' });
      } else {
        // Criar
        await api.post('/api/funcionarios-clientes', dadosParaEnvio);
        enqueueSnackbar('Funcionário/cliente criado com sucesso!', { variant: 'success' });
      }

      handleCloseDialog();
      carregarFuncionarios();

    } catch (error: any) {
      console.error('Erro ao salvar funcionário/cliente:', error);
      
      if (error.response?.data?.code === 'CPF_DUPLICADO') {
        setFormErrors({ cpf: 'CPF já cadastrado' });
      } else if (error.response?.data?.code === 'EMAIL_DUPLICADO') {
        setFormErrors({ email: 'Email já cadastrado' });
      } else {
        enqueueSnackbar(
          error.response?.data?.error || 'Erro ao salvar funcionário/cliente',
          { variant: 'error' }
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Exclui funcionário/cliente
  const handleDelete = async (id: string, nome: string) => {
    if (!confirm(`Tem certeza que deseja excluir ${nome}?`)) {
      return;
    }

    try {
      await api.delete(`/api/funcionarios-clientes/${id}`);
      enqueueSnackbar('Funcionário/cliente excluído com sucesso!', { variant: 'success' });
      carregarFuncionarios();
    } catch (error: any) {
      console.error('Erro ao excluir funcionário/cliente:', error);
      enqueueSnackbar(
        error.response?.data?.error || 'Erro ao excluir funcionário/cliente',
        { variant: 'error' }
      );
    }
  };

  // Obtém a cor do chip baseado no tipo
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'MOTORISTA': return 'primary';
      case 'FUNCIONARIO': return 'secondary';
      case 'CLIENTE': return 'success';
      case 'RESPONSAVEL': return 'warning';
      default: return 'default';
    }
  };

  // Obtém o ícone do tipo
  const getTipoIcon = (tipo: string) => {
    const tipoObj = tiposFuncionario.find(t => t.id === tipo);
    return tipoObj?.icon || <PersonIcon />;
  };

  // Verifica se o usuário tem permissão
  if (!user || !['ADMIN', 'GERENTE'].includes(user.tipo)) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Alert severity="error">
            Você não tem permissão para acessar esta página.
          </Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1">
            Funcionários e Clientes
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Novo Cadastro
          </Button>
        </Box>

        {/* Filtros */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Buscar"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
                placeholder="Nome, CPF, telefone ou email"
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  label="Tipo"
                >
                  <MenuItem value="">Todos</MenuItem>
                  {tiposFuncionario.map((tipo) => (
                    <MenuItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filtroAtivo}
                  onChange={(e) => setFiltroAtivo(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="true">Ativo</MenuItem>
                  <MenuItem value="false">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setFiltroTipo('');
                  setFiltroAtivo('');
                }}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabela */}
        <Paper sx={{ width: '100%', overflow: 'hidden' }}>
          <TableContainer sx={{ maxHeight: 'calc(100vh - 300px)' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Nome</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>CPF</TableCell>
                  <TableCell>Telefone</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Transportadora</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : funcionarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Nenhum funcionário/cliente encontrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  funcionarios.map((funcionario) => (
                    <TableRow key={funcionario.id} hover>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {getTipoIcon(funcionario.tipo)}
                          {funcionario.nome}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={tiposFuncionario.find(t => t.id === funcionario.tipo)?.nome}
                          color={getTipoColor(funcionario.tipo) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{funcionario.cpf || '-'}</TableCell>
                      <TableCell>{funcionario.telefone || '-'}</TableCell>
                      <TableCell>{funcionario.email || '-'}</TableCell>
                      <TableCell>
                        {funcionario.transportadoraId 
                          ? transportadoras.find(t => t.id === funcionario.transportadoraId)?.nome 
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={funcionario.ativo ? 'Ativo' : 'Inativo'}
                          color={funcionario.ativo ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDialog(funcionario)}
                            >
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Excluir">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(funcionario.id, funcionario.nome)}
                            >
                              <DeleteIcon />
                            </IconButton>
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

        {/* Dialog de Cadastro/Edição */}
        <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingId ? 'Editar Funcionário/Cliente' : 'Novo Funcionário/Cliente'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  label="Nome *"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  error={!!formErrors.nome}
                  helperText={formErrors.nome}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth error={!!formErrors.tipo}>
                  <InputLabel>Tipo *</InputLabel>
                  <Select
                    value={formData.tipo}
                    onChange={(e) => setFormData(prev => ({ ...prev, tipo: e.target.value as any }))}
                    label="Tipo *"
                  >
                    {tiposFuncionario.map((tipo) => (
                      <MenuItem key={tipo.id} value={tipo.id}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {tipo.icon}
                          {tipo.nome}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CPF"
                  value={formData.cpf}
                  onChange={(e) => setFormData(prev => ({ ...prev, cpf: e.target.value }))}
                  error={!!formErrors.cpf}
                  helperText={formErrors.cpf}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Telefone"
                  value={formData.telefone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Transportadora</InputLabel>
                  <Select
                    value={formData.transportadoraId}
                    onChange={(e) => setFormData(prev => ({ ...prev, transportadoraId: e.target.value }))}
                    label="Transportadora"
                  >
                    <MenuItem value="">Nenhuma</MenuItem>
                    {transportadoras.map((transportadora) => (
                      <MenuItem key={transportadora.id} value={transportadora.id}>
                        {transportadora.nome}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {formData.tipo === 'MOTORISTA' && (
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="CNH *"
                    value={formData.cnh}
                    onChange={(e) => setFormData(prev => ({ ...prev, cnh: e.target.value }))}
                    error={!!formErrors.cnh}
                    helperText={formErrors.cnh}
                  />
                </Grid>
              )}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Observações"
                  multiline
                  rows={3}
                  value={formData.observacoes}
                  onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.ativo}
                      onChange={(e) => setFormData(prev => ({ ...prev, ativo: e.target.checked }))}
                    />
                  }
                  label="Ativo"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default FuncionariosClientes;
