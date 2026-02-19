import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  TextField, 
  Button, 
  CircularProgress, 
  Alert, 
  Snackbar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControlLabel,
  Switch
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import AdminRoute from '../../../components/admin/AdminRoute';
import { api } from '@/services/api';

interface ConfiguracoesSistema {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
  tipo: 'TEXTO' | 'NUMERO' | 'BOOLEANO' | 'SELECAO';
  opcoes?: string[];
}

function ConfiguracoesContent() {
  const { user } = useAuth();
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<{ 
    open: boolean; 
    message: string; 
    severity: 'success' | 'error' | 'warning' | 'info' 
  }>({ 
    open: false, 
    message: '', 
    severity: 'success' 
  });

  // Carregar configurações quando o componente for montado
  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/configuracoes');
      setConfiguracoes(response.data);
    } catch (error: unknown) {
      console.error('Erro ao carregar configurações:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar configurações';
      setError(`Erro ao carregar configurações: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string | boolean) => {
    setConfiguracoes(prev => 
      prev.map(config => 
        config.id === id ? { ...config, valor: String(value) } : config
      )
    );
  };

  const handleSelectChange = (e: SelectChangeEvent<string>, id: string) => {
    const { value } = e.target;
    handleInputChange(id, value);
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const { checked } = e.target;
    handleInputChange(id, String(checked));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const configuracoesAtualizadas = configuracoes.map(({ id, valor }) => ({
        id,
        valor
      }));
      
      await api.put('/api/admin/configuracoes', { configuracoes: configuracoesAtualizadas });
      
      setSnackbar({ 
        open: true, 
        message: 'Configurações salvas com sucesso!', 
        severity: 'success' 
      });
    } catch (error: unknown) {
      console.error('Erro ao salvar configurações:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error && 
                         error.response && typeof error.response === 'object' && 
                         'data' in error.response && 
                         error.response.data && typeof error.response.data === 'object' &&
                         'message' in error.response.data ?
                         String(error.response.data.message) : 'Erro ao salvar configurações';
      
      setSnackbar({ 
        open: true, 
        message: errorMessage, 
        severity: 'error' as const
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const renderConfiguracaoInput = (config: ConfiguracoesSistema) => {
    switch (config.tipo) {
      case 'BOOLEANO':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={config.valor === 'true'}
                onChange={(e) => handleSwitchChange(e, config.id)}
                color="primary"
              />
            }
            label={config.valor === 'true' ? 'Ativado' : 'Desativado'}
          />
        );
      case 'SELECAO':
        return (
          <FormControl fullWidth variant="outlined" margin="normal">
            <InputLabel id={`${config.id}-label`}>{config.descricao}</InputLabel>
            <Select
              labelId={`${config.id}-label`}
              value={config.valor}
              onChange={(e) => handleSelectChange(e, config.id)}
              label={config.descricao}
            >
              {config.opcoes?.map((opcao) => (
                <MenuItem key={opcao} value={opcao}>
                  {opcao}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'NUMERO':
        return (
          <TextField
            fullWidth
            type="number"
            margin="normal"
            label={config.descricao}
            value={config.valor}
            onChange={(e) => handleInputChange(config.id, e.target.value)}
            variant="outlined"
          />
        );
      case 'TEXTO':
      default:
        return (
          <TextField
            fullWidth
            margin="normal"
            label={config.descricao}
            value={config.valor}
            onChange={(e) => handleInputChange(config.id, e.target.value)}
            variant="outlined"
            multiline
            rows={3}
          />
        );
    }
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Configurações do Sistema
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Gerencie as configurações gerais do sistema.
        </Typography>
      </Box>

      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 3 }}>
        {configuracoes.map((config, index) => (
          <Box key={config.id} mb={4}>
            <Typography variant="h6" gutterBottom>
              {config.chave}
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              {config.descricao}
            </Typography>
            
            {renderConfiguracaoInput(config)}
            
            {index < configuracoes.length - 1 && <Divider sx={{ my: 3 }} />}
          </Box>
        ))}
        
        <Box display="flex" justifyContent="flex-end" mt={4}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </Box>
      </Paper>

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

export default function Configuracoes() {
  return (
    <AdminRoute>
      <ConfiguracoesContent />
    </AdminRoute>
  );
}
