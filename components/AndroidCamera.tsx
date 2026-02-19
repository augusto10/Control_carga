import React, { useState, useRef } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Typography,
  Box,
  Alert,
  Chip
} from '@mui/material';
import { 
  CameraAlt as CameraIcon,
  PhotoCamera as PhotoIcon,
  Check as CheckIcon
} from '@mui/icons-material';

interface AndroidCameraProps {
  onCapture: (file: File) => void;
  onError?: (error: string) => void;
  buttonText?: string;
  disabled?: boolean;
  currentFile?: File | null;
  variant?: 'contained' | 'outlined';
  size?: 'small' | 'medium' | 'large';
}

const AndroidCamera: React.FC<AndroidCameraProps> = ({
  onCapture,
  onError,
  buttonText = "Tirar Foto",
  disabled = false,
  currentFile = null,
  variant = 'contained',
  size = 'medium'
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = () => {
    if (disabled || capturing) return;

    // Verificar se é dispositivo móvel
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isMobile) {
      // Para dispositivos móveis, usar input file com capture
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Usar câmera traseira
      
      // Para Android, adicionar configurações específicas
      if (isAndroid) {
        input.setAttribute('capture', 'camera');
      }
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          // Validar tipo de arquivo
          if (!file.type.startsWith('image/')) {
            onError?.('Arquivo deve ser uma imagem');
            return;
          }
          
          // Validar tamanho (máximo 10MB)
          if (file.size > 10 * 1024 * 1024) {
            onError?.('Imagem muito grande. Máximo 10MB');
            return;
          }
          
          console.log('📸 [AndroidCamera] Foto capturada:', {
            name: file.name,
            size: file.size,
            type: file.type
          });
          
          onCapture(file);
          setDialogOpen(false);
        }
        setCapturing(false);
      };
      
      input.onerror = () => {
        onError?.('Erro ao acessar câmera');
        setCapturing(false);
      };
      
      setCapturing(true);
      input.click();
    } else {
      // Para desktop, mostrar dialog com opções
      setDialogOpen(true);
    }
  };

  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        onError?.('Arquivo deve ser uma imagem');
        return;
      }
      
      // Validar tamanho (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        onError?.('Imagem muito grande. Máximo 10MB');
        return;
      }
      
      onCapture(file);
      setDialogOpen(false);
    }
  };

  const buttonIcon = currentFile ? <CheckIcon /> : <CameraIcon />;
  const buttonColor = currentFile ? 'success' : 'primary';
  const displayText = currentFile ? 'Foto Capturada' : buttonText;

  return (
    <>
      <Box sx={{ textAlign: 'center' }}>
        {currentFile && (
          <Chip 
            label={currentFile.name} 
            color="success" 
            sx={{ mb: 1, maxWidth: 200 }}
            size="small"
          />
        )}
        
        <Button
          variant={variant}
          startIcon={buttonIcon}
          onClick={handleCameraCapture}
          disabled={disabled || capturing}
          color={buttonColor}
          size={size}
          fullWidth
          sx={{
            minHeight: 48,
            '&:hover': {
              transform: 'scale(1.02)',
              transition: 'transform 0.2s'
            }
          }}
        >
          {capturing ? 'Abrindo Câmera...' : displayText}
        </Button>
      </Box>

      {/* Input file oculto para desktop */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Dialog para desktop */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PhotoIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
            <span>Capturar Foto</span>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Alert severity="info" sx={{ mb: 3 }}>
              Para melhor experiência, use um dispositivo móvel com câmera.
            </Alert>
            
            <Typography variant="body1" gutterBottom>
              Escolha uma opção:
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<PhotoIcon />}
                onClick={handleFileSelect}
                size="large"
              >
                Selecionar Arquivo
              </Button>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Formatos aceitos: JPG, PNG, WEBP
              <br />
              Tamanho máximo: 10MB
            </Typography>
          </Box>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>
            Cancelar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default AndroidCamera;
