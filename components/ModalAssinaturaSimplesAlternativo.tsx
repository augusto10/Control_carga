import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AssinaturaSimples from './AssinaturaSimples';
import axios from 'axios';

interface ModalAssinaturaSimplesAlternativoProps {
  open: boolean;
  onClose: () => void;
  controleId: string;
  tipoAssinatura: 'motorista' | 'responsavel';
  onAssinaturaSalva?: () => void;
}

const ModalAssinaturaSimplesAlternativo: React.FC<ModalAssinaturaSimplesAlternativoProps> = ({
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

  const handleSave = async (signature: string) => {
    if (!signature) {
      setError('Por favor, faça uma assinatura antes de salvar');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[ModalAssinaturaSimplesAlternativo] Enviando assinatura...', {
        controleId,
        tipoAssinatura,
        signatureLength: signature.length
      });

      // Envia a assinatura para o servidor
      const response = await axios.post('/api/controles/atualizar-assinatura', {
        controleId,
        tipoAssinatura,
        assinatura: signature
      });

      console.log('[ModalAssinaturaSimplesAlternativo] Resposta do servidor:', response.data);

      if (response.data.success) {
        setSuccess(true);
        
        // Chama o callback imediatamente para atualizar os dados
        if (onAssinaturaSalva) {
          await onAssinaturaSalva();
        }
        
        // Aguarda um pouco para mostrar o feedback de sucesso e depois fecha
        setTimeout(() => {
          handleClose();
        }, 1000);
      } else {
        throw new Error(response.data.message || 'Erro ao salvar assinatura');
      }
    } catch (err: any) {
      console.error('[ModalAssinaturaSimplesAlternativo] Erro ao salvar assinatura:', err);
      setError(
        err.response?.data?.error || 
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
          <AssinaturaSimples
            onSave={handleSave}
            disabled={loading || success}
            label="Faça sua assinatura abaixo"
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
            <strong>Instruções:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
              <li>Use o mouse ou toque na tela para assinar</li>
              <li>Use o botão "Limpar" se precisar refazer a assinatura</li>
              <li>Clique em "Salvar" quando estiver satisfeito com a assinatura</li>
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
          onClick={handleClose}
          disabled={loading}
          variant="outlined"
        >
          {success ? 'Fechar' : 'Cancelar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ModalAssinaturaSimplesAlternativo;
