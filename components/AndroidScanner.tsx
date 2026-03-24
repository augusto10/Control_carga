import React, { useRef, useState } from 'react';
import {
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  alpha,
  useTheme
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon,
  FlashOn as FlashOnIcon,
  Edit as EditIcon
} from '@mui/icons-material';

interface AndroidScannerProps {
  onScan: (codigo: string) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  disabled?: boolean;
}

const AndroidScanner: React.FC<AndroidScannerProps> = ({
  onScan,
  onError,
  buttonText = 'Escanear',
  size = 'medium',
  variant = 'outlined',
  color = 'primary',
  disabled = false
}) => {
  const theme = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanClick = () => {
    // Verifica se a interface Android nativa está disponível
    if (typeof window !== 'undefined' && window.Android?.isAvailable?.()) {
      try {
        window.Android.scanBarcode((result: string) => {
          if (result) {
            onScan(result);
          }
        });
      } catch (err) {
        onError?.('Erro ao acessar o scanner nativo.');
        setDialogOpen(true);
      }
    } else {
      // Fallback: abre diálogo para digitação manual
      setDialogOpen(true);
    }
  };

  const handleManualSubmit = () => {
    const code = manualCode.trim();
    if (code) {
      onScan(code);
      setManualCode('');
      setDialogOpen(false);
    } else {
      onError?.('Digite um código válido.');
    }
  };

  const handleClose = () => {
    setManualCode('');
    setDialogOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleManualSubmit();
    }
  };

  // Se buttonText for vazio, renderiza como IconButton
  if (buttonText === '') {
    return (
      <>
        <IconButton
          onClick={handleScanClick}
          color={color}
          size={size}
          disabled={disabled}
          sx={{
            borderRadius: '12px',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            '&:hover': {
              bgcolor: alpha(theme.palette.primary.main, 0.15),
            }
          }}
        >
          <QrCodeScannerIcon fontSize={size === 'small' ? 'small' : 'medium'} />
        </IconButton>

        <Dialog open={dialogOpen} onClose={handleClose} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EditIcon fontSize="small" color="primary" />
              <Typography variant="subtitle1" fontWeight="700">Digitar Código</Typography>
            </Box>
            <IconButton onClick={handleClose} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Scanner não disponível. Digite o código manualmente:
            </Typography>
            <TextField
              autoFocus
              fullWidth
              label="Código de Barras"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              onKeyDown={handleKeyDown}
              InputProps={{
                sx: { borderRadius: '12px' }
              }}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleClose} sx={{ borderRadius: '10px', textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button
              onClick={handleManualSubmit}
              variant="contained"
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              }}
            >
              Confirmar
            </Button>
          </DialogActions>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <Button
        onClick={handleScanClick}
        variant={variant}
        color={color}
        size={size}
        disabled={disabled}
        startIcon={<QrCodeScannerIcon />}
        sx={{
          borderRadius: '12px',
          fontWeight: 700,
          textTransform: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {buttonText}
      </Button>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EditIcon fontSize="small" color="primary" />
            <Typography variant="subtitle1" fontWeight="700">Digitar Código</Typography>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Scanner não disponível. Digite o código manualmente:
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Código de Barras"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={handleKeyDown}
            InputProps={{
              sx: { borderRadius: '12px' }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} sx={{ borderRadius: '10px', textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            onClick={handleManualSubmit}
            variant="contained"
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AndroidScanner;
