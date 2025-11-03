import React, { useEffect, useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Typography,
  Box,
  Alert,
  CircularProgress,
  ButtonGroup
} from '@mui/material';
import { 
  QrCodeScanner as ScannerIcon,
  CameraAlt as CameraIcon
} from '@mui/icons-material';
import CameraScanner from './CameraScanner';

interface AndroidScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  disabled?: boolean;
}

// Declaração global para interface Android
declare global {
  interface Window {
    Android?: {
      scanBarcode: (callback: (result: string) => void) => void;
      isAvailable: () => boolean;
    };
    // Para outros tipos de scanner Android
    BarcodeScanner?: {
      scan: (callback: (result: string) => void) => void;
    };
  }
}

const AndroidScanner: React.FC<AndroidScannerProps> = ({
  onScan,
  onError,
  buttonText = "Escanear Código",
  disabled = false
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannerAvailable, setScannerAvailable] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);

  useEffect(() => {
    const checkDevice = async () => {
      try {
        const capabilities = await detectDeviceCapabilities();
        setScannerAvailable(capabilities.hasNativeScanner || capabilities.hasCameraAccess);
        
        console.log('📱 [AndroidScanner] Capacidades do dispositivo:', {
          isAndroid: capabilities.isAndroid,
          isMovfast: capabilities.isMovfast,
          hasNativeScanner: capabilities.hasNativeScanner,
          hasCameraAccess: capabilities.hasCameraAccess
        });
      } catch (error) {
        console.error('📱 [AndroidScanner] Erro ao detectar capacidades:', error);
        setScannerAvailable(false);
      }
    };
    
    checkDevice();
  }, []);

  const handleScan = async () => {
    if (disabled || isScanning) return;

    setIsScanning(true);
    setDialogOpen(true);

    try {
      // Método 1: Interface Android nativa (Movfast Ranger2)
      if (window.Android && window.Android.scanBarcode) {
        console.log('📱 [AndroidScanner] Usando interface Android nativa');
        
        window.Android.scanBarcode((result: string) => {
          console.log('📱 [AndroidScanner] Resultado do scanner:', result);
          
          if (result && result !== 'cancelled' && result !== 'error') {
            onScan(result);
            setDialogOpen(false);
          } else if (result === 'cancelled') {
            console.log('📱 [AndroidScanner] Scanner cancelado pelo usuário');
          } else {
            onError?.('Erro ao escanear código de barras');
          }
          
          setIsScanning(false);
        });
        return;
      }

      // Método 2: BarcodeScanner genérico
      if (window.BarcodeScanner && window.BarcodeScanner.scan) {
        console.log('📱 [AndroidScanner] Usando BarcodeScanner genérico');
        
        window.BarcodeScanner.scan((result: string) => {
          if (result && result !== 'cancelled') {
            onScan(result);
            setDialogOpen(false);
          }
          setIsScanning(false);
        });
        return;
      }

      // Método 3: Fallback - usar câmera para capturar imagem
      console.log('📱 [AndroidScanner] Usando fallback de câmera');
      
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Simular processamento de código de barras
          const codigo = prompt('📱 Scanner ativado! Digite o código lido:');
          if (codigo) {
            onScan(codigo);
          }
        }
        setIsScanning(false);
        setDialogOpen(false);
      };
      
      input.click();

    } catch (error) {
      console.error('📱 [AndroidScanner] Erro ao escanear:', error);
      onError?.('Erro ao acessar scanner do dispositivo');
      setIsScanning(false);
      setDialogOpen(false);
    }
  };

  const handleManualInput = () => {
    const codigo = prompt('Digite o código de barras manualmente:');
    if (codigo) {
      onScan(codigo);
    }
    setDialogOpen(false);
    setIsScanning(false);
  };

  return (
    <>
      <ButtonGroup variant="outlined" color="primary">
        <Button
          startIcon={<ScannerIcon />}
          onClick={handleScan}
          disabled={disabled || isScanning}
          sx={{
            minWidth: 'auto',
            px: 2,
            '&:hover': {
              backgroundColor: 'primary.light',
              color: 'white'
            }
          }}
        >
          {isScanning ? 'Escaneando...' : 'Scanner'}
        </Button>
        <Button
          startIcon={<CameraIcon />}
          onClick={() => setCameraScannerOpen(true)}
          disabled={disabled || isScanning}
          sx={{
            minWidth: 'auto',
            px: 2,
            '&:hover': {
              backgroundColor: 'primary.light',
              color: 'white'
            }
          }}
        >
          Câmera
        </Button>
      </ButtonGroup>

      <Dialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setIsScanning(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <ScannerIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <span>Scanner de Código de Barras</span>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            {isScanning ? (
              <Box>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="body1" gutterBottom>
                  Aguardando leitura do código...
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Aponte a câmera para o código de barras
                </Typography>
              </Box>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  {scannerAvailable 
                    ? 'Scanner nativo detectado! Use o botão abaixo para escanear.'
                    : 'Scanner nativo não detectado. Use entrada manual.'
                  }
                </Alert>
                
                <Typography variant="body2" color="text.secondary">
                  Dispositivo: {/Android/i.test(navigator.userAgent) ? 'Android' : 'Outro'}
                  <br />
                  Scanner: {scannerAvailable ? 'Disponível' : 'Não disponível'}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button
            onClick={handleManualInput}
            variant="outlined"
            disabled={isScanning}
          >
            Entrada Manual
          </Button>
          <Button
            onClick={() => {
              setDialogOpen(false);
              setIsScanning(false);
            }}
            disabled={isScanning}
          >
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>

      <CameraScanner
        open={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        onScan={onScan}
        onError={onError}
      />
    </>
  );
};

export default AndroidScanner;
