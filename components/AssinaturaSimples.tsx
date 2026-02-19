import React, { useRef, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

interface AssinaturaSimplesProps {
  onSave: (signature: string) => void;
  disabled?: boolean;
  label?: string;
}

const AssinaturaSimples: React.FC<AssinaturaSimplesProps> = ({
  onSave,
  disabled = false,
  label = "Assinatura Digital"
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configurar canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2; // Para alta resolução
    canvas.height = rect.height * 2;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      
      // Fundo branco
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  // Obter posição do mouse/touch
  const getEventPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  // Iniciar desenho
  const startDrawing = (e: any) => {
    if (disabled) return;
    
    e.preventDefault();
    setIsDrawing(true);
    setError(null);
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getEventPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  // Desenhar
  const draw = (e: any) => {
    if (!isDrawing || disabled) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getEventPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    
    setHasSignature(true);
  };

  // Parar desenho
  const stopDrawing = () => {
    setIsDrawing(false);
  };

  // Limpar canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setError(null);
  };

  // Salvar assinatura
  const handleSave = async () => {
    if (!hasSignature) {
      setError('Por favor, faça uma assinatura antes de salvar');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoading(true);
    setError(null);

    try {
      const dataURL = canvas.toDataURL('image/png');
      await onSave(dataURL);
      setHasSignature(true);
    } catch (err) {
      console.error('Erro ao salvar assinatura:', err);
      setError('Erro ao salvar a assinatura. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="subtitle1" fontWeight="medium" sx={{ mb: 2 }}>
        {label}
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={2}
        sx={{
          position: 'relative',
          width: '100%',
          height: 200,
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: '#fff',
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'crosshair',
          border: '2px solid #e0e0e0',
          '&:hover': {
            borderColor: disabled ? '#e0e0e0' : '#ff9800'
          }
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none'
          }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />

        {!hasSignature && !disabled && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              pointerEvents: 'none',
              color: 'text.secondary',
              opacity: 0.5
            }}
          >
            <Typography variant="body2">
              Clique e arraste para assinar
            </Typography>
          </Box>
        )}
      </Paper>

      <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          color="error"
          startIcon={<DeleteIcon />}
          onClick={clearCanvas}
          disabled={disabled || !hasSignature}
        >
          Limpar
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={disabled || !hasSignature || loading}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </Box>
    </Box>
  );
};

export default AssinaturaSimples;
