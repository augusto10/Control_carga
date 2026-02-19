import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  useTheme,
  alpha
} from '@mui/material';

export default function GerarToken() {
  const theme = useTheme();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const gerarToken = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/gerar-token-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        // Copiar token para área de transferência
        if (data.data?.access_token) {
          navigator.clipboard.writeText(data.data.access_token);
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message: 'Erro ao gerar token',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Gerar Token - API Externa
      </Typography>
      
      <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
        Use esta página para gerar um token de acesso à API externa.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
              disabled={loading}
            />
            
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              disabled={loading}
            />
            
            <Button
              variant="contained"
              onClick={gerarToken}
              disabled={loading || !username || !password}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              size="large"
            >
              {loading ? 'Gerando...' : 'Gerar Token'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip
                label={result.success ? 'Sucesso' : 'Falha'}
                color={result.success ? 'success' : 'error'}
                sx={{ mr: 2 }}
              />
              <Typography variant="h6">
                {result.message}
              </Typography>
            </Box>

            {result.success && result.data && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Dados do Token:
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Tipo: {result.data.token_type}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Expira em: {result.data.expires_in} segundos
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Expira em: {new Date(result.data.expires_at).toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
                  ✅ Token copiado para área de transferência!
                </Typography>
              </Box>
            )}

            {!result.success && (
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
          </CardContent>
        </Card>
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Como usar o token:
          </Typography>
          <Typography variant="body2" component="div">
            <ol>
              <li>Use as credenciais corretas da API externa</li>
              <li>O token será gerado e copiado automaticamente</li>
              <li>Atualize o arquivo .env.local com as credenciais corretas</li>
              <li>Reinicie o servidor Next.js</li>
              <li>Teste novamente em /testar-api</li>
            </ol>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
