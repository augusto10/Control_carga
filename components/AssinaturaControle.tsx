import { useState } from 'react';
import { Button, Dialog, DialogTitle, DialogContent, DialogActions, Snackbar, Alert } from '@mui/material';
import { Check, Send } from '@mui/icons-material';
import { useRouter } from 'next/router';
import AssinaturaCanvas from './AssinaturaCanvas';

interface AssinaturaControleProps {
  controleId: string;
  motorista: string;
  responsavel: string;
  cpfMotorista: string;
}

export default function AssinaturaControle({ controleId, motorista, responsavel, cpfMotorista }: AssinaturaControleProps) {
  const [loading, setLoading] = useState(false);
  const [openCanvas, setOpenCanvas] = useState(false);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const router = useRouter();

  const handleAbrirCanvas = () => {
    setOpenCanvas(true);
  };

  const handleCancelarCanvas = () => {
    setOpenCanvas(false);
  };

  const handleSalvarAssinatura = async (assinaturaDataUrl: string) => {
    setOpenCanvas(false);
    setLoading(true);
    try {
      const response = await fetch('/api/controles/assinatura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          controleId,
          motorista,
          responsavel,
          cpfMotorista,
          assinaturaBase64: assinaturaDataUrl,
        }),
      });
      if (!response.ok) {
        throw new Error('Erro ao enviar assinatura');
      }
      setSnackbar({ open: true, message: 'Assinatura enviada com sucesso!', severity: 'success' });
      setTimeout(() => router.push('/controles'), 1200);
    } catch (error) {
      setSnackbar({ open: true, message: 'Erro ao enviar assinatura', severity: 'error' });
      setLoading(false);
    }
  };

  return (
    <div>
      <Button
        variant="contained"
        color="primary"
        size="small"
        startIcon={<Send />}
        onClick={handleAbrirCanvas}
        disabled={loading}
        sx={{ minWidth: 140 }}
      >
        Enviar p/ assinatura
      </Button>
      <Dialog open={openCanvas} onClose={handleCancelarCanvas} maxWidth="xs" fullWidth>
        <DialogTitle>Assinatura Digital</DialogTitle>
        <DialogContent>
          <AssinaturaCanvas onSalvar={handleSalvarAssinatura} onCancelar={handleCancelarCanvas} />
        </DialogContent>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
