import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Grid,
  Box,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import { useSnackbar } from 'notistack';
import api from '../../services/api';

interface Usuario {
  id: string;
  nome: string;
  tipo: 'SEPARADOR' | 'AUDITOR' | 'CONFERENTE';
}

export default function CadastrarSeparacaoPage() {
  const [pedido, setPedido] = useState('');

  const [separadorId, setSeparadorId] = useState('');
  const [auditorId, setAuditorId] = useState('');
  const [conferenteId, setConferenteId] = useState('');

  const [separadores, setSeparadores] = useState<Usuario[]>([]);
  const [auditores, setAuditores] = useState<Usuario[]>([]);
  const [conferentes, setConferentes] = useState<Usuario[]>([]);
  
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    async function fetchUsuarios() {
      try {
        setLoading(true);
        const { data } = await api.get<Usuario[]>('/api/usuarios-por-funcao');
        setSeparadores(data.filter(u => u.tipo === 'SEPARADOR'));
        setAuditores(data.filter(u => u.tipo === 'AUDITOR'));
        setConferentes(data.filter(u => u.tipo === 'CONFERENTE'));
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        enqueueSnackbar('Falha ao carregar dados de usuários.', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
    fetchUsuarios();
  }, [enqueueSnackbar]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await api.post('/api/pedidos', {
        numeroPedido: pedido,
        separadorId: separadorId,
        auditorId: auditorId,
      });

      if (response.status === 200 || response.status === 201) {
        enqueueSnackbar('Pedido salvo com sucesso!', { variant: 'success' });
        handleCancel(); // Limpa o formulário
      } else {
        throw new Error('Falha ao salvar o pedido');
      }
    } catch (error) {
      console.error('Erro ao salvar separação:', error);
      enqueueSnackbar('Erro ao salvar o pedido. Tente novamente.', { variant: 'error' });
    }
  };

  const handleCancel = () => {
    setPedido('');

    setSeparadorId('');
    setAuditorId('');
    setConferenteId('');
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="sm">
      <Paper sx={{ p: { xs: 2, sm: 4 }, mt: 4 }}>
        <Typography variant="h5" component="h1" fontWeight="bold" gutterBottom>
          Cadastrar Separação
        </Typography>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                id="numero-pedido"
                label="Nº do Pedido"
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="separador-label">Separador</InputLabel>
                <Select
                  labelId="separador-label"
                  id="separador-select"
                  value={separadorId}
                  label="Separador"
                  onChange={(e: SelectChangeEvent) => setSeparadorId(e.target.value)}
                >
                  {separadores.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="auditor-label">Auditor</InputLabel>
                <Select
                  labelId="auditor-label"
                  id="auditor-select"
                  value={auditorId}
                  label="Auditor"
                  onChange={(e: SelectChangeEvent) => setAuditorId(e.target.value)}
                >
                  {auditores.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel id="conferente-label">Conferente</InputLabel>
                <Select
                  labelId="conferente-label"
                  id="conferente-select"
                  value={conferenteId}
                  label="Conferente"
                  onChange={(e: SelectChangeEvent) => setConferenteId(e.target.value)}
                >
                  {conferentes.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      {user.nome}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Button fullWidth variant="outlined" color="secondary" onClick={handleCancel} sx={{ mt: 2 }}>
                    Cancelar
                </Button>
            </Grid>
            <Grid item xs={12} sm={6}>
                <Button fullWidth type="submit" variant="contained" sx={{ mt: 2 }}>
                    Salvar
                </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}
