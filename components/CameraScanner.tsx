import React, { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Box,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  CameraAlt as CameraIcon,
  FlipCameraIos as FlipCameraIcon
} from '@mui/icons-material';
import { BrowserMultiFormatReader, Result } from '@zxing/library';

interface CameraScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (result: string) => void;
  onError?: (error: string) => void;
}

const CameraScanner: React.FC<CameraScannerProps> = ({
  open,
  onClose,
  onScan,
  onError
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [error, setError] = useState<string>('');
  const codeReader = useRef<BrowserMultiFormatReader>();

  useEffect(() => {
    codeReader.current = new BrowserMultiFormatReader();
    
    if (open) {
      startScanning();
    }

    return () => {
      if (codeReader.current) {
        codeReader.current.reset();
      }
    };
  }, [open]);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setError('');

      // Get available cameras
      const videoDevices = await navigator.mediaDevices.enumerateDevices();
      const cameras = videoDevices.filter(device => device.kind === 'videoinput');
      setDevices(cameras);

      // Use first camera by default
      if (cameras.length > 0 && !selectedDevice) {
        setSelectedDevice(cameras[0].deviceId);
      }

      if (!codeReader.current || !selectedDevice) return;

      await codeReader.current.decodeFromVideoDevice(
        selectedDevice,
        videoRef.current!,
        (result: Result | null, error?: Error) => {
          if (result) {
            const code = result.getText();
            console.log('📱 [CameraScanner] Código lido:', code);
            onScan(code);
            onClose();
          }
          if (error) {
            console.warn('📱 [CameraScanner] Erro de leitura:', error);
          }
        }
      );

    } catch (error) {
      console.error('📱 [CameraScanner] Erro ao iniciar scanner:', error);
      setError('Erro ao acessar câmera. Verifique as permissões.');
      onError?.('Erro ao acessar câmera');
      setIsScanning(false);
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    if (codeReader.current) {
      await codeReader.current.reset();
      startScanning();
    }
  };

  const handleClose = () => {
    if (codeReader.current) {
      codeReader.current.reset();
    }
    setIsScanning(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        bgcolor: 'primary.main',
        color: 'white'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CameraIcon />
          <Typography>Scanner de Código</Typography>
        </Box>
        <IconButton size="small" onClick={handleClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, position: 'relative', minHeight: 300 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}

        <video
          ref={videoRef}
          style={{
            width: '100%',
            maxHeight: '70vh',
            objectFit: 'cover'
          }}
        />

        {isScanning && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80%',
              height: '40%',
              border: '2px solid #fff',
              borderRadius: 1,
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              '&::after': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: 'red',
                animation: 'scanning 2s linear infinite'
              }
            }}
          />
        )}
      </DialogContent>

      <DialogActions sx={{ 
        justifyContent: 'space-between', 
        bgcolor: 'background.paper',
        p: 2
      }}>
        {devices.length > 1 && (
          <Button
            startIcon={<FlipCameraIcon />}
            onClick={() => {
              const currentIndex = devices.findIndex(d => d.deviceId === selectedDevice);
              const nextIndex = (currentIndex + 1) % devices.length;
              handleDeviceChange(devices[nextIndex].deviceId);
            }}
          >
            Trocar Câmera
          </Button>
        )}
        <Button variant="contained" onClick={handleClose} color="primary">
          Cancelar
        </Button>
      </DialogActions>

      <style jsx global>{`
        @keyframes scanning {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
      `}</style>
    </Dialog>
  );
};

export default CameraScanner;