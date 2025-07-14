import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Box, 
  FormControl, 
  Select, 
  MenuItem, 
  FormControlLabel, 
  Switch,
  Alert,
  Snackbar,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader
} from '@mui/material';
import { Save as SaveIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { api } from '../../services/api';
import { ApiResponse } from '../../types/api';
import AdminLayout from '../../components/admin/AdminLayout';
import AdminRoute from '../../components/admin/AdminRoute';

interface Configuracoes {
  id: string;
  chave: string;
  valor: string;
  descricao?: string | null;
  tipo: 'string' | 'number' | 'boolean' | 'json';
  opcoes?: string | null;
  editavel: boolean;
  dataCriacao?: string;
  dataAtualizacao?: string;
}

function ConfiguracoesSistemaContent() {
  const [configuracoes, setConfiguracoes] = useState<Configuracoes[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, any>>({});

  // Carregar configurações
  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiResponse<Configuracoes[]>>('/api/admin/configuracoes');
      
      if (!response.data.success) {
        throw new Error(response.data.error?.message || 'Erro ao carregar configurações');
      }

      const configuracoesData = response.data.data || [];
      
      // Inicializar valores iniciais
      const valoresIniciais: Record<string, any> = {};
      configuracoesData.forEach((config: Configuracoes) => {
        if (config.tipo === 'boolean') {
          valoresIniciais[config.chave] = config.valor === 'true';
        } else if (config.tipo === 'number') {
          valoresIniciais[config.chave] = parseFloat(config.valor) || 0;
        } else if (config.tipo === 'json') {
          try {
            valoresIniciais[config.chave] = JSON.parse(config.valor);
          } catch {
            valoresIniciais[config.chave] = config.valor;
          }
        } else {
          valoresIniciais[config.chave] = config.valor;
        }
      });
      
      setConfiguracoes(configuracoesData);
      setValues(valoresIniciais);
    } catch (err: unknown) {
      console.error('Erro ao carregar configurações:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err && 
        err.response && typeof err.response === 'object' && 'data' in err.response && 
        err.response.data && typeof err.response.data === 'object' && 'error' in err.response.data &&
        err.response.data.error && typeof err.response.data.error === 'object' && 'message' in err.response.data.error
          ? String(err.response.data.error.message)
          : 'Erro ao carregar configurações';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const handleChange = (chave: string, valor: any) => {
    setValues(prev => ({
      ...prev,
      [chave]: valor
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);
      
      // Preparar os dados para envio
      const dadosAtualizacao = Object.entries(values).map(([chave, valor]) => ({
        chave,
        valor: typeof valor === 'boolean' ? String(valor) : 
              typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
      }));
      
      // Enviar para a API
      await api.put('/api/admin/configuracoes', { configuracoes: dadosAtualizacao });
      
      setSuccess('Configurações salvas com sucesso!');
      
      // Recarregar as configurações para garantir sincronização
      await carregarConfiguracoes();
      
      // Fechar a mensagem de sucesso após 5 segundos
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: unknown) {
      console.error('Erro ao salvar configurações:', err);
      const errorMessage = err && typeof err === 'object' && 'response' in err && 
        err.response && typeof err.response === 'object' && 'data' in err.response && 
        err.response.data && typeof err.response.data === 'object' && 'message' in err.response.data
          ? String(err.response.data.message)
          : 'Erro ao salvar configurações. Tente novamente.';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const renderInput = (config: Configuracoes) => {
    const valorAtual = values[config.chave];
    
    switch (config.tipo) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(valorAtual)}
                onChange={(e) => handleChange(config.chave, e.target.checked)}
                disabled={!config.editavel || loading || saving}
                color="primary"
              />
            }
            label={valorAtual ? 'Ativado' : 'Desativado'}
          />
        );
        
      case 'number':
        return (
          <TextField
            fullWidth
            type="number"
            value={valorAtual || ''}
            onChange={(e) => handleChange(config.chave, parseFloat(e.target.value) || 0)}
            disabled={!config.editavel || loading || saving}
            variant="outlined"
            size="small"
          />
        );
        
      case 'json':
        return (
          <TextField
            fullWidth
            multiline
            rows={4}
            value={JSON.stringify(valorAtual || {}, null, 2)}
            onChange={(e) => {
              try {
                handleChange(config.chave, JSON.parse(e.target.value));
              } catch {
                // Manter o valor atual se o JSON for inválido
              }
            }}
            disabled={!config.editavel || loading || saving}
            variant="outlined"
            size="small"
            error={(() => {
              try {
                JSON.parse(JSON.stringify(valorAtual || {}));
                return false;
              } catch {
                return true;
              }
            })()}
            helperText="Formato JSON válido necessário"
          />
        );
        
      case 'string':
      default:
        if (config.opcoes) {
          const opcoes = config.opcoes.split(',').map(opt => opt.trim());
          return (
            <FormControl fullWidth size="small" variant="outlined">
              <Select
                value={valorAtual || ''}
                onChange={(e) => handleChange(config.chave, e.target.value)}
                disabled={!config.editavel || loading || saving}
              >
                {opcoes.map((opcao) => (
                  <MenuItem key={opcao} value={opcao}>
                    {opcao}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        }
        
        return (
          <TextField
            fullWidth
            value={valorAtual || ''}
            onChange={(e) => handleChange(config.chave, e.target.value)}
            disabled={!config.editavel || loading || saving}
            variant="outlined"
            size="small"
          />
        );
    }
  };

  return (
    <AdminLayout title="Configurações do Sistema">
      <Container maxWidth="lg">
        <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h5" component="h1">
            Configurações do Sistema
          </Typography>
          <Box>
            <Button
              variant="outlined"
              color="primary"
              onClick={carregarConfiguracoes}
              disabled={loading || saving}
              startIcon={<RefreshIcon />}
              sx={{ mr: 1 }}
            >
              Recarregar
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading || saving}
              startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </Box>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {configuracoes.map((config) => (
                <Grid item xs={12} md={6} key={config.id}>
                  <Card variant="outlined">
                    <CardHeader 
                      title={config.chave.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      subheader={config.descricao}
                      action={
                        !config.editavel && (
                          <Box sx={{ 
                            bgcolor: 'warning.light', 
                            color: 'warning.contrastText', 
                            px: 1, 
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}>
                            Somente leitura
                          </Box>
                        )
                      }
                    />
                    <CardContent>
                      {renderInput(config)}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </form>
        )}
      </Container>

      {/* Snackbar para mensagens de erro */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      {/* Snackbar para mensagens de sucesso */}
      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </AdminLayout>
  );
}

export default function ConfiguracoesSistema() {
  return (
    <AdminRoute>
      <ConfiguracoesSistemaContent />
    </AdminRoute>
  );
}
