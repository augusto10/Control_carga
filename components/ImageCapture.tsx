import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CameraAlt,
  PhotoLibrary,
  Close,
  Delete
} from '@mui/icons-material';

interface ImageCaptureProps {
  open: boolean;
  onClose: () => void;
  onImageCapture: (imageDataUrl: string) => void;
  maxImages?: number;
  currentImages?: string[];
}

const ImageCapture: React.FC<ImageCaptureProps> = ({
  open,
  onClose,
  onImageCapture,
  maxImages = 10,
  currentImages = []
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState<string>('');

  const startCamera = async () => {
    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Prioriza câmera traseira
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      setError('Erro ao acessar a câmera. Verifique as permissões.');
      console.error('Erro ao acessar câmera:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);

        const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        onImageCapture(imageDataUrl);
        stopCamera();
      }
    }
  };

  const selectFromGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageDataUrl = e.target?.result as string;
        onImageCapture(imageDataUrl);
      };
      reader.readAsDataURL(file);
    }
    // Limpa o input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Capturar Imagem
        <IconButton
          onClick={handleClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ textAlign: 'center', py: 2 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Área da câmera */}
          <Box sx={{ position: 'relative', mb: 2 }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{
                width: '100%',
                maxHeight: '400px',
                objectFit: 'cover',
                borderRadius: '8px',
                display: stream ? 'block' : 'none'
              }}
            />
            <canvas
              ref={canvasRef}
              style={{ display: 'none' }}
            />

            {!stream && (
              <Box
                sx={{
                  width: '100%',
                  height: '300px',
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '8px',
                  border: '2px dashed',
                  borderColor: 'grey.300'
                }}
              >
                <Typography variant="h6" color="textSecondary">
                  Clique em "Ligar Câmera" para começar
                </Typography>
              </Box>
            )}
          </Box>

          {/* Botões de ação */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 2 }}>
            {!stream ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<CameraAlt />}
                  onClick={startCamera}
                  size="large"
                >
                  Ligar Câmera
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<PhotoLibrary />}
                  onClick={selectFromGallery}
                  size="large"
                >
                  Galeria
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={captureImage}
                  size="large"
                >
                  Capturar
                </Button>
                <Button
                  variant="outlined"
                  onClick={stopCamera}
                  size="large"
                >
                  Cancelar
                </Button>
              </>
            )}
          </Box>

          {/* Input oculto para galeria */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          {/* Info sobre limite de imagens */}
          {currentImages.length >= maxImages && (
            <Alert severity="warning">
              Você atingiu o limite máximo de {maxImages} imagens por controle.
            </Alert>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCapture;
