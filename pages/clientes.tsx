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
  Business as BusinessIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import Layout from '../components/Layout';
import InputMask from '../components/InputMask';

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
  const { user } = useAuth();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [transportadoras, setTransportadoras] = useState<Transportadora[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editando, setEditando] = useState<Cliente | null>(null);
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

  if (!user) return null;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <BusinessIcon sx={{ fontSize: 32, color: 'primary.main' }} />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Clientes
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
              background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e55a2b 0%, #e57a35 100%)',
              }
            }}
          >
            Novo Cliente
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
                {clientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        Nenhum cliente cadastrado
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  clientes.map((cliente) => (
                    <TableRow key={cliente.id} hover>
                      <TableCell sx={{ fontWeight: 500 }}>{cliente.nome}</TableCell>
                      <TableCell>{cliente.telefone}</TableCell>
                      <TableCell>{cliente.cpf}</TableCell>
                      <TableCell>
                        <Chip 
                          label={cliente.transportadoraId} 
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(cliente.dataCriacao).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(cliente)}
                          sx={{ mr: 1 }}
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(cliente)}
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

        {/* Dialog para adicionar/editar cliente */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editando ? 'Editar Cliente' : 'Novo Cliente'}
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
                helperText="Clientes usam 'Retira Cliente' por padrão"
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

export default ClientesPage;
