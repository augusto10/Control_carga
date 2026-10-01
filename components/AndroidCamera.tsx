import React, { useRef, useState } from 'react';
import {
  Button,
  Box,
  Typography,
  alpha,
  useTheme,
  Stack,
  Chip
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Image as ImageIcon
} from '@mui/icons-material';

interface AndroidCameraProps {
  onCapture: (file: File) => void;
  onError?: (error: string) => void;
  currentFile?: File | null;
  buttonText?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  disabled?: boolean;
}

const AndroidCamera: React.FC<AndroidCameraProps> = ({
  onCapture,
  onError,
  currentFile = null,
  buttonText = 'Tirar Foto',
  size = 'medium',
  variant = 'contained',
  color = 'primary',
  disabled = false
}) => {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleCaptureClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        onError?.('Por favor, selecione uma imagem válida.');
        return;
      }

      // Limitar tamanho a 10MB
      if (file.size > 10 * 1024 * 1024) {
        onError?.('A imagem deve ter no máximo 10MB.');
        return;
      }

      // Gerar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      onCapture(file);
    }

    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setPreview(null);
    // Notifica com um arquivo vazio ou null - o parent deve lidar com isso
  };

  const hasImage = currentFile !== null || preview !== null;

  const buttonSizeMap = {
    small: { px: 2, py: 1, fontSize: '0.8rem' },
    medium: { px: 3, py: 1.5, fontSize: '0.875rem' },
    large: { px: 4, py: 2, fontSize: '1rem' }
  };

  const btnStyles = buttonSizeMap[size] || buttonSizeMap.medium;

  return (
    <Box>
      {/* Input oculto - usa capture="environment" para câmera traseira em mobile */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {hasImage && preview ? (
        <Stack spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: '100%',
              maxWidth: size === 'small' ? 120 : 200,
              aspectRatio: '4/3',
              borderRadius: 3,
              overflow: 'hidden',
              border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
              position: 'relative',
              mx: 'auto'
            }}
          >
            <img
              src={preview}
              alt="Preview"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                bgcolor: alpha(theme.palette.success.main, 0.9),
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CheckCircleIcon sx={{ color: 'white', fontSize: 16 }} />
            </Box>
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              onClick={handleCaptureClick}
              variant="outlined"
              size="small"
              startIcon={<PhotoCameraIcon />}
              disabled={disabled}
              sx={{
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '0.75rem'
              }}
            >
              Trocar
            </Button>
          </Stack>
        </Stack>
      ) : hasImage && !preview ? (
        <Stack spacing={1.5} alignItems="center">
          <Chip
            icon={<CheckCircleIcon />}
            label={currentFile?.name || 'Foto capturada'}
            color="success"
            size="small"
            sx={{ fontWeight: 700, borderRadius: '8px', maxWidth: '100%' }}
          />
          <Button
            onClick={handleCaptureClick}
            variant="outlined"
            size="small"
            startIcon={<PhotoCameraIcon />}
            disabled={disabled}
            sx={{
              borderRadius: '10px',
              textTransform: 'none',
              fontWeight: 700,
              fontSize: '0.75rem'
            }}
          >
            Trocar Foto
          </Button>
        </Stack>
      ) : (
        <Button
          onClick={handleCaptureClick}
          variant={variant}
          color={color}
          size={size}
          disabled={disabled}
          startIcon={<PhotoCameraIcon />}
          sx={{
            borderRadius: '12px',
            fontWeight: 700,
            textTransform: 'none',
            ...btnStyles,
            ...(variant === 'contained' && {
              background: `linear-gradient(135deg, ${theme.palette[color]?.main || theme.palette.primary.main} 0%, ${theme.palette[color]?.dark || theme.palette.primary.dark} 100%)`,
              boxShadow: `0 6px 16px ${alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.25)}`,
              '&:hover': {
                boxShadow: `0 8px 20px ${alpha(theme.palette[color]?.main || theme.palette.primary.main, 0.35)}`,
              }
            })
          }}
        >
          {buttonText}
        </Button>
      )}
    </Box>
  );
};

export default AndroidCamera;
