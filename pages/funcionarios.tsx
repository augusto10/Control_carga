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
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import Layout from '../components/Layout';
import InputMask from '../components/InputMask';

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
  const { user } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState<Funcionario | null>(null);
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
    if (confirm(`Tem certeza que deseja excluir o funcionário ${funcionario.nome}?`)) {
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

  if (!user) return null;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PersonIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Funcionários
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 500,
              background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
              }
            }}
          >
            Novo Funcionário
          </Button>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
            <Table>
              <TableHead sx={{ bgcolor: 'grey.50' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Nome</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Telefone</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>CPF</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Transportadora</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Data Cadastro</TableCell>
                  <TableCell sx={{ fontWeight: 600, textAlign: 'center' }}>Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {funcionarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Nenhum funcionário cadastrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  funcionarios.map((funcionario) => (
                    <TableRow key={funcionario.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{funcionario.nome}</TableCell>
                      <TableCell>{funcionario.telefone}</TableCell>
                      <TableCell>{funcionario.cpf}</TableCell>
                      <TableCell>
                        <Chip 
                          label={funcionario.transportadoraId} 
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(funcionario.dataCriacao).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(funcionario)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(funcionario)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Dialog para adicionar/editar funcionário */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editando ? 'Editar Funcionário' : 'Novo Funcionário'}
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
              <TextField
                label="Nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                fullWidth
                required
              />
              
              <InputMask
                label="Telefone"
                mask="telefone"
                value={formData.telefone}
                onChange={(value) => setFormData({ ...formData, telefone: value })}
                fullWidth
                required
              />
              
              <InputMask
                label="CPF"
                mask="cpf"
                value={formData.cpf}
                onChange={(value) => setFormData({ ...formData, cpf: value })}
                fullWidth
                required
                disabled={!!editando}
              />
              
              <TextField
                select
                label="Transportadora"
                value={formData.transportadoraId}
                onChange={(e) => setFormData({ ...formData, transportadoraId: e.target.value })}
                fullWidth
                required
                helperText="Funcionários usam 'Retira Vendedor' por padrão"
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
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              disabled={!formData.nome || !formData.telefone || !formData.cpf || !formData.transportadoraId}
            >
              {editando ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  );
};

export default FuncionariosPage;
