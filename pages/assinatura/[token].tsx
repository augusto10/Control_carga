import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button, Box, Typography, Alert, CircularProgress, Paper, Divider } from '@mui/material';
import ReactSignatureCanvas from 'react-signature-canvas';
import { useSnackbar } from 'notistack';

export default function AssinaturaPage() {
  const router = useRouter();
  const { token } = router.query;
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assinaturaData, setAssinaturaData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const signaturePad = useRef<ReactSignatureCanvas>(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      setFetching(true);
      setError(null);
      try {
        const res = await fetch(`/api/assinaturas/${token}`);
        if (!res.ok) throw new Error('Token inválido ou assinatura não encontrada.');
        const data = await res.json();
        setAssinaturaData(data.assinatura);
      } catch (err: any) {
        setError(err.message || 'Erro ao buscar assinatura.');
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [token]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!signaturePad.current || signaturePad.current.isEmpty()) {
        throw new Error('Por favor, forneça sua assinatura.');
      }

      const signature = signaturePad.current.getSignatureImage();

      // Enviar a assinatura para o backend
      const response = await fetch('/api/assinaturas/webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          assinatura: signature,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao salvar assinatura. Tente novamente.');
      }

      enqueueSnackbar('Documento assinado com sucesso!', { variant: 'success' });
      setSuccess(true);
      setTimeout(() => router.push('/controles'), 3000);
    } catch (err: any) {
      setError(err.message);
      enqueueSnackbar(err.message, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (signaturePad.current) {
      signaturePad.current.clear();
    }
  };

  if (fetching) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
      </Box>
    );
  }

  if (success) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <Alert severity="success" sx={{ mb: 2 }}>Documento assinado com sucesso!</Alert>
      </Box>
    );
  }

  const { controle, tipo } = assinaturaData;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
      }}
    >
      <Typography variant="h4" gutterBottom>
        Assinatura Digital do Controle
      </Typography>

      <Paper sx={{ p: 2, mb: 3, maxWidth: 600, width: '100%' }} elevation={3}>
        <Typography variant="subtitle1"><b>Nº Manifesto:</b> {controle.numeroManifesto || 'N/A'}</Typography>
        <Typography variant="subtitle1"><b>Data:</b> {new Date(controle.dataCriacao).toLocaleString('pt-BR')}</Typography>
        <Typography variant="subtitle1"><b>Motorista:</b> {controle.motorista}</Typography>
        <Typography variant="subtitle1"><b>Responsável:</b> {controle.responsavel}</Typography>
        <Typography variant="subtitle1"><b>Transportadora:</b> {controle.transportadora}</Typography>
        <Typography variant="subtitle1"><b>Tipo de Assinatura:</b> {tipo}</Typography>
      </Paper>

      <Box
        sx={{
          width: '100%',
          maxWidth: 600,
          mb: 3,
          border: '1px solid #ccc',
          borderRadius: 1,
          p: 2,
        }}
      >
        <ReactSignatureCanvas
          ref={signaturePad}
          canvasProps={{
            width: 600,
            height: 300,
            className: 'signatureCanvas',
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
        <Button
          variant="outlined"
          color="error"
          onClick={handleClear}
          disabled={loading}
        >
          Limpar
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          Enviar Assinatura
        </Button>
      </Box>
    </Box>
  );
}
