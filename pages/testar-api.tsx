import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Grid,
  useTheme,
  alpha
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface TestResult {
  success: boolean;
  message: string;
  tests?: {
    login: {
      success: boolean;
      message: string;
      token: string;
    };
    buscaNota: {
      success: boolean;
      message: string;
      data: any;
    };
    buscaCliente: {
      success: boolean;
      message: string;
      data: any;
    };
  };
  config?: {
    apiUrl: string;
    username: string;
    timestamp: string;
  };
  error?: string;
}

export default function TestarAPI() {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const testarConexao = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test/api-externa');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        message: 'Erro ao testar conexão',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Teste de Conexão - API Externa
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Verifique se a integração com a API externa está funcionando corretamente.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={testarConexao}
          disabled={loading}
          size="large"
        >
          {loading ? 'Testando...' : 'Testar Conexão'}
        </Button>
      </Box>

      {result && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              {result.success ? (
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              ) : (
                <ErrorIcon color="error" sx={{ mr: 1 }} />
              )}
              <Typography variant="h6">
                {result.message}
              </Typography>
            </Box>

            {result.success && result.tests && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Teste de Login
                      </Typography>
                      <Chip
                        label={result.tests.login.success ? 'Sucesso' : 'Falha'}
                        color={result.tests.login.success ? 'success' : 'error'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        {result.tests.login.message}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Token: {result.tests.login.token}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Teste de Busca de Nota
                      </Typography>
                      <Chip
                        label={result.tests.buscaNota.success ? 'Sucesso' : 'Falha'}
                        color={result.tests.buscaNota.success ? 'success' : 'warning'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        {result.tests.buscaNota.message}
                      </Typography>
                      {result.tests.buscaNota.data && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            Número: {result.tests.buscaNota.data.numero}
                          </Typography>
                          <Typography variant="body2">
                            Cliente: {result.tests.buscaNota.data.cliente?.nome}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" gutterBottom>
                        Teste de Busca de Cliente
                      </Typography>
                      <Chip
                        label={result.tests.buscaCliente.success ? 'Sucesso' : 'Falha'}
                        color={result.tests.buscaCliente.success ? 'success' : 'warning'}
                        size="small"
                        sx={{ mb: 1 }}
                      />
                      <Typography variant="body2" color="textSecondary">
                        {result.tests.buscaCliente.message}
                      </Typography>
                      {result.tests.buscaCliente.data && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2">
                            Nome: {result.tests.buscaCliente.data.nome}
                          </Typography>
                          <Typography variant="body2">
                            CNPJ: {result.tests.buscaCliente.data.cnpj}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            )}

            {!result.success && result.error && (
              <Alert 
                severity="error" 
                variant="standard"
                sx={{ 
                  mt: 2,
                  borderRadius: '16px',
                  backdropFilter: 'blur(12px)',
                  backgroundColor: alpha(theme.palette.error.main, 0.15),
                  color: theme.palette.error.dark,
                  border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                  '& .MuiAlert-icon': {
                    color: theme.palette.error.main,
                  },
                  boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                  fontWeight: 600,
                }}
              >
                <Typography variant="body2">
                  Erro: {result.error}
                </Typography>
              </Alert>
            )}

            {result.config && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  Configuração da API
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  URL: {result.config.apiUrl}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Usuário: {result.config.username}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Testado em: {new Date(result.config.timestamp).toLocaleString()}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Como usar a integração
          </Typography>
          <Typography variant="body2" component="div">
            <ol>
              <li>Vá para a página de geração de etiquetas</li>
              <li>Use o scanner de código de barras</li>
              <li>O sistema buscará automaticamente os dados na API externa</li>
              <li>Os dados da nota fiscal serão preenchidos automaticamente</li>
              <li>Use a roteirização para agrupar notas por endereço</li>
            </ol>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
