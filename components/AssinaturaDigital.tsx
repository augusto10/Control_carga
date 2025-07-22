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
  { 
    ssr: false, 
    loading: () => <div>Carregando canvas...</div>
  }
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
    const sigCanvas = useRef<any>(null);
    const [isSaving, setIsSaving] = useState(false);
    
    // Efeito para inicialização segura do canvas
    useEffect(() => {
      console.log('[AssinaturaDigital] useEffect inicialização chamado');
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
      
      setTimeout(() => {
        setIsReady(true);
        console.log('[AssinaturaDigital] setIsReady(true) chamado');
      }, 200);
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
        console.log('[AssinaturaDigital] clear: sigCanvas.current:', sigCanvas.current);
        if (sigCanvas.current && typeof sigCanvas.current.clear === 'function') {
          sigCanvas.current.clear();
          setHasDrawn(false);
          setIsSigned(false);
        } else {
          console.warn('[AssinaturaDigital] clear: sigCanvas.current.clear não é função', sigCanvas.current);
          // Fallback: limpa manualmente os estados
          setHasDrawn(false);
          setIsSigned(false);
        }
        return true;
      },
      isEmpty: () => {
        if (sigCanvas.current && typeof sigCanvas.current.isEmpty === 'function') {
          return sigCanvas.current.isEmpty();
        }
        // Fallback: considera vazio se não desenhou nem assinou
        console.log('[AssinaturaDigital] isEmpty fallback - hasDrawn:', hasDrawn, 'isSigned:', isSigned);
        return !hasDrawn && !isSigned;
      },
      getSignature: () => {
        if (sigCanvas.current && typeof sigCanvas.current.toDataURL === 'function') {
          return sigCanvas.current.toDataURL();
        }
        // Se não conseguir obter do canvas, tenta usar o valor existente
        if (value) {
          console.log('[AssinaturaDigital] getSignature fallback - usando value:', !!value);
          return value;
        }
        console.warn('[AssinaturaDigital] getSignature: não foi possível obter assinatura');
        return null;
      }
    }));

    const handleClear = () => {
      if (sigCanvas.current) {
        sigCanvas.current.clear();
      }
      setIsSigned(false);
      setHasDrawn(false);
    };

    const handleSave = async () => {
  setIsSaving(true);
  try {
    // Verifica se há uma assinatura
    if (!hasDrawn && !isSigned && !value) {
      throw new Error('Por favor, faça uma assinatura antes de salvar.');
    }
    
    // Captura a assinatura do canvas
    let signatureData: string | null = null;
    
    // Estratégia 1: Tenta obter do ref do canvas
    if (sigCanvas.current && hasDrawn) {
      console.log('[AssinaturaDigital] Tentando obter assinatura do ref do canvas');
      try {
        if (typeof sigCanvas.current.toDataURL === 'function') {
          signatureData = sigCanvas.current.toDataURL('image/png');
          console.log('[AssinaturaDigital] Assinatura obtida do ref do canvas');
        } else if (sigCanvas.current.getCanvas && typeof sigCanvas.current.getCanvas === 'function') {
          const canvas = sigCanvas.current.getCanvas();
          if (canvas && typeof canvas.toDataURL === 'function') {
            signatureData = canvas.toDataURL('image/png');
            console.log('[AssinaturaDigital] Assinatura obtida via getCanvas()');
          }
        }
      } catch (refError) {
        console.warn('[AssinaturaDigital] Erro ao obter assinatura do ref:', refError);
      }
    }
    
    // Estratégia 2: Se não conseguiu do ref, tenta usar o valor existente
    if (!signatureData && value) {
      console.log('[AssinaturaDigital] Usando assinatura existente (value)');
      signatureData = value;
    }
    
    // Estratégia 3: Última tentativa - busca diretamente no DOM
    if (!signatureData && hasDrawn) {
      console.log('[AssinaturaDigital] Tentando obter assinatura do DOM');
      try {
        const canvasElement = document.querySelector('.signature-canvas') as HTMLCanvasElement;
        if (canvasElement && typeof canvasElement.toDataURL === 'function') {
          signatureData = canvasElement.toDataURL('image/png');
          console.log('[AssinaturaDigital] Assinatura obtida do DOM');
        }
      } catch (domError) {
        console.warn('[AssinaturaDigital] Erro ao obter assinatura do DOM:', domError);
      }
    }
    
    if (!signatureData) {
      throw new Error('Não foi possível obter a assinatura. Tente desenhar novamente.');
    }
    
    // Valida se a assinatura não está vazia (apenas fundo branco)
    if (signatureData.length < 1000) {
      throw new Error('A assinatura parece estar vazia. Por favor, desenhe sua assinatura.');
    }
    
    console.log('[AssinaturaDigital] Chamando onSave com assinatura de tamanho:', signatureData.length);
    await onSave(signatureData);
    setIsSigned(true);
    setHasDrawn(false);
  } catch (error) {
    console.error('[AssinaturaDigital] Erro ao salvar:', error);
    // Re-lança o erro com uma mensagem mais amigável se necessário
    if (error instanceof Error) {
      throw new Error(`Não foi possível salvar a assinatura: ${error.message}`);
    }
    throw new Error('Ocorreu um erro inesperado ao salvar a assinatura');
  } finally {
    setIsSaving(false);
  }
};

    // Efeito para sincronizar o valor inicial
    useEffect(() => {
      if (value && !hasDrawn) {
        setIsSigned(true);
      }
    }, [value, hasDrawn]);

    if (!isReady) {
      console.log('[AssinaturaDigital] Renderizando CircularProgress (loading)');
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
                  penColor="black"
                  canvasProps={{
                    className: 'signature-canvas',
                    style: {
                      width: '100%',
                      height: '200px',
                      backgroundColor: '#fff',
                      touchAction: 'none'
                    }
                  }}
                  onBegin={() => {
                    console.log('[AssinaturaDigital] Assinatura iniciada');
                    setHasDrawn(true);
                    setIsSigned(false);
                  }}
                  onEnd={() => {
                    console.log('[AssinaturaDigital] Assinatura finalizada');
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
