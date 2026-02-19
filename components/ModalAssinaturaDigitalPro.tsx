import React, { useState, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SaveIcon from '@mui/icons-material/Save';
import SignaturePadPro, { SignaturePadProHandles } from './SignaturePadPro';
import axios from 'axios';

interface ModalAssinaturaDigitalProProps {
  open: boolean;
  onClose: () => void;
  controleId: string;
  tipoAssinatura: 'motorista' | 'responsavel';
  onAssinaturaSalva?: () => void;
}

const ModalAssinaturaDigitalPro: React.FC<ModalAssinaturaDigitalProProps> = ({
  open,
  onClose,
  controleId,
  tipoAssinatura,
  onAssinaturaSalva
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const signaturePadRef = useRef<SignaturePadProHandles>(null);

  const handleSave = async () => {
    if (!signaturePadRef.current) {
      setError('Componente de assinatura não está pronto');
      return;
    }

    const signature = signaturePadRef.current.getSignature();
    
    if (!signature) {
      setError('Por favor, faça uma assinatura antes de salvar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Envia a assinatura para o servidor
      const response = await axios.post('/api/controles/atualizar-assinatura', {
        controleId,
        tipoAssinatura,
        assinatura: signature
      });

      if (response.data.success) {
        setSuccess(true);
        
        // Aguarda um pouco para mostrar o feedback de sucesso
        setTimeout(() => {
          if (onAssinaturaSalva) {
            onAssinaturaSalva();
          }
          handleClose();
        }, 1500);
      } else {
        throw new Error(response.data.message || 'Erro ao salvar assinatura');
      }
    } catch (err: any) {
      console.error('Erro ao salvar assinatura:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Erro ao salvar assinatura. Tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleClear = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
      setError(null);
      setSuccess(false);
    }
  };

  const getTitle = () => {
    return tipoAssinatura === 'motorista' 
      ? 'Assinatura do Motorista' 
      : 'Assinatura do Responsável';
  };

  const getDescription = () => {
    return tipoAssinatura === 'motorista'
      ? 'O motorista deve assinar abaixo para confirmar o recebimento da carga'
      : 'O responsável deve assinar abaixo para confirmar a entrega da carga';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100vh' : '90vh'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.palette.primary.main,
          color: 'white',
          py: 2
        }}
      >
        <Typography variant="h6" component="div">
          {getTitle()}
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={handleClose}
          disabled={loading}
          aria-label="fechar"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {/* Descrição */}
        <Typography variant="body2" color="text.secondary" paragraph>
          {getDescription()}
        </Typography>

        <Divider sx={{ my: 2 }} />

        {/* Mensagens de feedback */}
        {error && (
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
            sx={{ mb: 2 }}
          >
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Assinatura salva com sucesso!
          </Alert>
        )}

        {/* Componente de assinatura */}
        <Box sx={{ my: 3 }}>
          <SignaturePadPro
            ref={signaturePadRef}
            label="Assinatura Digital"
            onSave={handleSave}
            disabled={loading || success}
            showSaveButton={false}
            penColor="#000000"
            minWidth={0.5}
            maxWidth={2.5}
            velocityFilterWeight={0.7}
          />
        </Box>

        {/* Informações adicionais */}
        <Box
          sx={{
            backgroundColor: 'grey.50',
            borderRadius: 1,
            p: 2,
            mt: 2
          }}
        >
          <Typography variant="caption" color="text.secondary">
            <strong>Dicas:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              <li>Use o mouse ou toque na tela para assinar</li>
              <li>Use os botões de desfazer/refazer se necessário</li>
              <li>A assinatura será salva de forma segura e criptografada</li>
            </ul>
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          backgroundColor: 'grey.50',
          gap: 1
        }}
      >
        <Button
          onClick={handleClear}
          disabled={loading || success}
          color="error"
          variant="outlined"
        >
          Limpar
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        <Button
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          Cancelar
        </Button>
        
        <Button
          onClick={handleSave}
          disabled={loading || success || !controleId}
          variant="contained"
          color="primary"
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          sx={{
            minWidth: 120,
            backgroundColor: theme.palette.primary.main,
            '&:hover': {
              backgroundColor: theme.palette.primary.dark
            }
          }}
        >
          {loading ? 'Salvando...' : 'Salvar Assinatura'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalAssinaturaDigitalPro;
