import React, { useRef, useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Button, 
  Box, 
  Typography, 
  styled, 
  CircularProgress,
  Tooltip,
  IconButton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

// Importação dinâmica para evitar problemas de SSR
const SignatureCanvas = dynamic(
  () => import('react-signature-canvas'),
  { ssr: false }
);

// Estilos globais para o canvas de assinatura
const globalStyles = `
  .signature-canvas {
    touch-action: none;
    width: 100% !important;
    height: 100% !important;
    background-color: #fff;
  }
  
  @media (max-width: 600px) {
    .signature-canvas {
      height: 150px !important;
    }
  }
`;

// Adiciona estilos globais
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.innerHTML = globalStyles;
  document.head.appendChild(styleElement);
}

const SignatureContainer = styled(Box)(({ theme }) => ({
  border: '2px dashed #ccc',
  borderRadius: '8px',
  margin: '10px 0',
  position: 'relative',
  transition: 'border-color 0.3s ease',
  '&:hover': {
    borderColor: theme.palette.primary.main,
  },
  '& > canvas': {
    width: '100% !important',
    height: '200px !important',
    background: '#f8f8f8',
    cursor: 'crosshair',
  },
}));

const SignaturePlaceholder = styled(Box)({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  color: '#999',
  textAlign: 'center',
  pointerEvents: 'none',
  width: '100%',
  padding: '0 20px',
  fontSize: '0.9rem',
  opacity: 0.8,
});

const ButtonContainer = styled(Box)({
  display: 'flex',
  gap: '10px',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginTop: '16px',
});

const SignaturePreview = styled(Box)({
  border: '1px solid #ddd',
  borderRadius: '4px',
  padding: '8px',
  marginTop: '16px',
  textAlign: 'center',
  '& img': {
    maxWidth: '100%',
    maxHeight: '100px',
    display: 'block',
    margin: '0 auto',
  },
});

interface AssinaturaDigitalProps {
  /**
   * Função chamada quando o usuário clica no botão de salvar assinatura
   * @param signatureData - A assinatura em formato base64 (data URL)
   * @returns Uma Promise que é resolvida quando a operação de salvamento é concluída
   */
  onSave: (signatureData: string) => Promise<void> | void;
  
  /**
   * Rótulo exibido acima da área de assinatura
   */
  label: string;
  
  /**
   * Valor atual da assinatura (opcional)
   * Se fornecido, exibe uma prévia da assinatura salva
   */
  value?: string;
  
  /**
   * Desabilita todos os controles do componente
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Exibe o botão de limpar assinatura
   * @default false
   */
  showSaveButton?: boolean;
}

export interface AssinaturaDigitalHandles {
  clear: () => void;
  isEmpty: () => boolean;
  getSignature: () => string | null;
}

const AssinaturaDigital = forwardRef<AssinaturaDigitalHandles, AssinaturaDigitalProps>(
  ({ onSave, label, value, disabled = false, showSaveButton = false }, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [isSigned, setIsSigned] = useState(!!value);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [dimensions, setDimensions] = useState({ width: 300, height: 200 });
    const [isReady, setIsReady] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const signatureRef = useRef<SignatureCanvas>(null);
    
    // Efeito para inicialização segura do canvas
    useEffect(() => {
      const updateDimensions = () => {
        if (containerRef.current) {
          const { width, height } = containerRef.current.getBoundingClientRect();
          setDimensions({
            width: Math.max(300, width - 40), // Largura mínima de 300px
            height: isMobile ? 150 : 200
          });
          setIsReady(true);
        }
      };
      
      updateDimensions();
      window.addEventListener('resize', updateDimensions);
      
      // Limpeza
      return () => {
        window.removeEventListener('resize', updateDimensions);
      };
    }, [isMobile]);
    
    // Atualiza o estado de assinado quando o valor da prop muda
    useEffect(() => {
      setIsSigned(!!value);
    }, [value]);

    // Expõe métodos para o componente pai
    useImperativeHandle(ref, () => ({
      clear: () => {
        if (signatureRef.current) {
          try {
            signatureRef.current.clear();
            setIsSigned(false);
            setHasDrawn(false);
            return true;
          } catch (error) {
            console.error('Erro ao limpar assinatura:', error);
            return false;
          }
        }
        return false;
      },
      isEmpty: () => {
        try {
          return signatureRef.current ? signatureRef.current.isEmpty() : true;
        } catch (error) {
          console.error('Erro ao verificar assinatura vazia:', error);
          return true;
        }
      },
      getSignature: () => {
        try {
          if (!signatureRef.current || signatureRef.current.isEmpty()) {
            return null;
          }
          
          const dataUrl = signatureRef.current.getTrimmedCanvas().toDataURL('image/png');
          return dataUrl && dataUrl !== 'data:,' ? dataUrl : null;
          
        } catch (error) {
          console.error('Erro ao obter assinatura:', error);
          return null;
        }
      }
    }));

    const handleClear = () => {
      if (signatureRef.current) {
        try {
          signatureRef.current.clear();
          setIsSigned(false);
          setHasDrawn(false);
        } catch (error) {
          console.error('Erro ao limpar assinatura:', error);
        }
      }
    };

    const handleSave = async () => {
      try {
        if (!signatureRef.current) {
          throw new Error('Referência do canvas de assinatura não encontrada. Atualize a página e tente novamente.');
        }
        
        // Verifica se há uma assinatura
        if (signatureRef.current.isEmpty()) {
          throw new Error('Por favor, faça uma assinatura antes de salvar.');
        }
        
        setIsSaving(true);
        
        try {
          // Garante que o canvas está pronto
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Obtém a assinatura como base64
          const signatureData = signatureRef.current.toDataURL('image/png');
          
          if (!signatureData || signatureData === 'data:,') {
            throw new Error('Falha ao gerar a assinatura. A imagem está vazia ou inválida.');
          }
          
          // Valida o tamanho da assinatura (máx 1MB)
          const base64String = signatureData.split(',')[1] || '';
          const padding = (base64String.match(/=*$/) || [''])[0].length;
          const fileSize = (base64String.length * 3) / 4 - padding;
          const maxSize = 1 * 1024 * 1024; // 1MB
          
          if (fileSize > maxSize) {
            throw new Error(`A assinatura é muito grande (${(fileSize / 1024).toFixed(2)}KB). O tamanho máximo permitido é 1MB.`);
          }
          
          // Chama a função de salvamento fornecida pelo componente pai
          await onSave(signatureData);
          
          // Atualiza o estado
          setIsSigned(true);
          setHasDrawn(false);
          
        } catch (error) {
          console.error('Erro ao processar a assinatura:', error);
          throw error; // Propaga o erro para o bloco catch externo
        }
      } catch (error: any) {
        console.error('Erro ao salvar assinatura:', error);
        // Re-lança o erro com uma mensagem mais amigável se necessário
        if (error instanceof Error) {
          throw new Error(`Não foi possível salvar a assinatura: ${error.message}`);
        }
        throw new Error('Ocorreu um erro inesperado ao salvar a assinatura.');
      } finally {
        setIsSaving(false);
      }
    };

    // Efeito para sincronizar o valor inicial
    useEffect(() => {
      if (value && signatureRef.current && !hasDrawn) {
        try {
          const img = new Image();
          img.onload = () => {
            if (signatureRef.current) {
              signatureRef.current.clear();
              signatureRef.current.fromDataURL(value);
              setIsSigned(true);
            }
          };
          img.onerror = () => {
            console.error('Erro ao carregar imagem da assinatura');
          };
          img.src = value;
        } catch (error) {
          console.error('Erro ao carregar assinatura existente:', error);
        }
      }
    }, [value, hasDrawn]);

    if (!isReady) {
      return (
        <Box 
          sx={{ 
            height: isMobile ? 150 : 200, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            backgroundColor: '#f8f8f8',
            borderRadius: 1
          }}
        >
          <CircularProgress size={24} />
        </Box>
      );
    }

    return (
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ mr: 1 }}>
            {label}:
          </Typography>
          <Tooltip title="Assine no campo abaixo. Use o mouse ou o dedo (em dispositivos touch).">
            <HelpOutlineIcon fontSize="small" color="action" />
          </Tooltip>
        </Box>
        
        <Box sx={{ position: 'relative' }}>
          <Box 
            ref={containerRef}
            sx={{
              border: '1px solid #ddd',
              borderRadius: 1,
              overflow: 'hidden',
              backgroundColor: '#fff',
              position: 'relative',
              height: isMobile ? 150 : 200,
              width: '100%',
              touchAction: 'none'
            }}
          >
            {isReady && (
              <>
                <SignatureCanvas
                  ref={signatureRef}
                  penColor="black"
                  canvasProps={{
                    className: 'signature-canvas',
                    style: {
                      width: '100%',
                      height: '100%',
                      backgroundColor: '#fff',
                      touchAction: 'none'
                    }
                  }}
                  onBegin={() => {
                    setHasDrawn(true);
                    setIsSigned(false);
                  }}
                />
                {!hasDrawn && !isSigned && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      color: 'text.disabled',
                      pointerEvents: 'none',
                      textAlign: 'center',
                      width: '100%',
                      px: 2
                    }}
                  >
                    <Typography variant="caption" component="div">
                      Assine no espaço acima
                    </Typography>
                    <Typography variant="caption" component="div" sx={{ fontSize: '0.7rem', opacity: 0.7 }}>
                      Use o mouse ou o dedo para assinar
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Box>

        <Box
          sx={{
            mt: 1,
            display: 'flex',
            gap: 1,
            flexWrap: 'wrap',
            '& > *': {
              flex: isMobile ? '1 1 100%' : '0 0 auto',
              minWidth: isMobile ? '100%' : 'auto'
            },
            '@media (min-width: 600px)': {
              '& > *': {
                flex: '0 0 auto',
                minWidth: 'auto'
              }
            }
          }}
        >
          <Tooltip 
            title={disabled ? 'Desabilitado' : (!hasDrawn && !isSigned) ? 'Faça uma assinatura para habilitar' : 'Limpar assinatura'}
            placement="top"
            arrow
          >
            <Box sx={{ display: 'inline-flex', width: isMobile ? '100%' : 'auto' }}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                fullWidth={isMobile}
                startIcon={<DeleteIcon />}
                onClick={handleClear}
                disabled={disabled || (!hasDrawn && !isSigned)}
                sx={{
                  minWidth: 120,
                  '&.Mui-disabled': {
                    borderColor: 'transparent',
                    color: 'text.disabled'
                  },
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'rgba(211, 47, 47, 0.04)',
                    borderColor: '#d32f2f'
                  }
                }}
              >
                Limpar
              </Button>
            </Box>
          </Tooltip>

          {showSaveButton && (
            <Tooltip 
              title={disabled ? 'Desabilitado' : (!hasDrawn && !isSigned) ? 'Faça uma assinatura para salvar' : 'Salvar assinatura'}
              placement="top"
              arrow
            >
              <Box sx={{ display: 'inline-flex', width: isMobile ? '100%' : 'auto' }}>
                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  fullWidth={isMobile}
                  startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={disabled || isSaving || (!hasDrawn && !isSigned)}
                  sx={{
                    minWidth: 120,
                    backgroundColor: '#ff6b35',
                    '&:hover': {
                      backgroundColor: '#e65100',
                    },
                    '&.Mui-disabled': {
                      backgroundColor: 'rgba(0, 0, 0, 0.12)',
                      color: 'rgba(0, 0, 0, 0.26)'
                    },
                    transition: 'all 0.2s ease-in-out',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                  }}
                >
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </Box>
            </Tooltip>
          )}
        </Box>

        {value && (
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Assinatura atual:
            </Typography>
            <Box 
              component="img" 
              src={value} 
              alt="Assinatura digital salva"
              sx={{
                maxWidth: '100%',
                maxHeight: 100,
                border: '1px solid #eee',
                borderRadius: 1,
                p: 1,
                backgroundColor: '#fff',
                opacity: disabled ? 0.7 : 1,
                transition: 'opacity 0.2s ease-in-out'
              }}
            />
            {!disabled && (
              <Box mt={1} textAlign="right">
                <Button 
                  size="small" 
                  color="primary"
                  onClick={handleClear}
                  disabled={isSaving}
                  startIcon={<EditIcon fontSize="small" />}
                >
                  Editar assinatura
                </Button>
              </Box>
            )}
          </Box>
        )}
      </Box>
    );
  }
);

AssinaturaDigital.displayName = 'AssinaturaDigital';

export default AssinaturaDigital;
