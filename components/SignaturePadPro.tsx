import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Tooltip,
  IconButton,
  Paper,
  useTheme,
  useMediaQuery,
  Stack,
  Alert,
  alpha
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BrushIcon from '@mui/icons-material/Brush';
import TouchAppIcon from '@mui/icons-material/TouchApp';

// Importação dinâmica do signature_pad
let SignaturePadLib: any = null;

interface SignaturePadProProps {
  /**
   * Função chamada quando o usuário salva a assinatura
   */
  onSave: (signatureData: string) => Promise<void> | void;
  
  /**
   * Rótulo exibido acima da área de assinatura
   */
  label: string;
  
  /**
   * Valor atual da assinatura (base64)
   */
  value?: string;
  
  /**
   * Desabilita todos os controles
   */
  disabled?: boolean;
  
  /**
   * Exibe o botão de salvar
   */
  showSaveButton?: boolean;
  
  /**
   * Cor da caneta (hex)
   */
  penColor?: string;
  
  /**
   * Espessura mínima da linha
   */
  minWidth?: number;
  
  /**
   * Espessura máxima da linha
   */
  maxWidth?: number;
  
  /**
   * Velocidade da caneta
   */
  velocityFilterWeight?: number;
}

export interface SignaturePadProHandles {
  clear: () => void;
  isEmpty: () => boolean;
  getSignature: () => string | null;
  undo: () => void;
  redo: () => void;
}

const SignaturePadPro = forwardRef<SignaturePadProHandles, SignaturePadProProps>(
  ({ 
    onSave, 
    label, 
    value, 
    disabled = false, 
    showSaveButton = false,
    penColor = '#000000',
    minWidth = 0.5,
    maxWidth = 2.5,
    velocityFilterWeight = 0.7
  }, ref) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const signaturePadRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [hasSignature, setHasSignature] = useState(false);
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    
    // Histórico para undo/redo
    const historyRef = useRef<any[]>([]);
    const historyStepRef = useRef<number>(-1);
    
    // Dimensões responsivas
    const getCanvasDimensions = useCallback(() => {
      if (!containerRef.current) {
        return { width: 300, height: 150 };
      }
      
      const containerWidth = containerRef.current.offsetWidth;
      let width = Math.min(containerWidth - 2, 800); // Máximo de 800px
      let height = 200; // Altura padrão
      
      if (isMobile) {
        width = containerWidth - 2;
        height = Math.min(250, window.innerHeight * 0.3);
      } else if (isTablet) {
        width = Math.min(containerWidth - 2, 600);
        height = 220;
      }
      
      return { width, height };
    }, [isMobile, isTablet]);
    
    // Função para redimensionar o canvas mantendo o conteúdo
    const resizeCanvas = useCallback(() => {
      if (!canvasRef.current || !signaturePadRef.current || !SignaturePadLib) {
        console.log('[SignaturePadPro] ResizeCanvas cancelado - refs não disponíveis');
        return;
      }
      
      console.log('[SignaturePadPro] Redimensionando canvas...');
      const dimensions = getCanvasDimensions();
      const canvas = canvasRef.current;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      
      console.log('[SignaturePadPro] Dimensões calculadas:', dimensions, 'Ratio:', ratio);
      
      // Salva o conteúdo atual
      const data = signaturePadRef.current.toData();
      
      // Redimensiona o canvas
      canvas.width = dimensions.width * ratio;
      canvas.height = dimensions.height * ratio;
      canvas.style.width = dimensions.width + 'px';
      canvas.style.height = dimensions.height + 'px';
      
      // Escala o contexto
      const context = canvas.getContext('2d');
      if (context) {
        context.scale(ratio, ratio);
        // Adiciona fundo branco
        context.fillStyle = 'white';
        context.fillRect(0, 0, dimensions.width, dimensions.height);
      }
      
      // Limpa e restaura o conteúdo
      signaturePadRef.current.clear();
      if (data && data.length > 0) {
        signaturePadRef.current.fromData(data);
      }
      
      console.log('[SignaturePadPro] Canvas redimensionado com sucesso');
    }, [getCanvasDimensions]);
    
    // Inicializa o SignaturePad
    const initializeSignaturePad = useCallback(async () => {
      console.log('[SignaturePadPro] Tentando inicializar...', {
        canvasExists: !!canvasRef.current,
        isInitialized,
        containerExists: !!containerRef.current
      });
      
      if (!canvasRef.current || isInitialized) {
        console.log('[SignaturePadPro] Inicialização cancelada - canvas não existe ou já inicializado');
        return;
      }
      
      try {
        console.log('[SignaturePadPro] Importando signature_pad...');
        // Importa a biblioteca dinamicamente
        if (!SignaturePadLib) {
          const module = await import('signature_pad');
          SignaturePadLib = module.default;
          console.log('[SignaturePadPro] signature_pad importado com sucesso');
        }
        
        // Cria uma nova instância
        console.log('[SignaturePadPro] Criando instância do SignaturePad...');
        const pad = new SignaturePadLib(canvasRef.current, {
          minWidth,
          maxWidth,
          penColor,
          velocityFilterWeight,
          backgroundColor: 'rgb(255, 255, 255)',
          throttle: 16, // 60fps
          minDistance: 5, // Mínima distância entre pontos
        });
        
        console.log('[SignaturePadPro] SignaturePad criado com sucesso');
        
        // Adiciona listeners
        pad.addEventListener('beginStroke', () => {
          console.log('[SignaturePadPro] Início do traço');
          setError(null);
        });
        
        pad.addEventListener('endStroke', () => {
          console.log('[SignaturePadPro] Fim do traço');
          const data = pad.toData();
          if (data && data.length > 0) {
            setHasSignature(true);
            updateHistory();
          }
        });
        
        signaturePadRef.current = pad;
        
        // Configura as dimensões iniciais
        console.log('[SignaturePadPro] Configurando dimensões do canvas...');
        resizeCanvas();
        
        // Carrega valor inicial se existir
        if (value) {
          try {
            pad.fromDataURL(value);
            setHasSignature(true);
            console.log('[SignaturePadPro] Valor inicial carregado');
          } catch (err) {
            console.warn('[SignaturePadPro] Erro ao carregar assinatura existente:', err);
          }
        }
        
        setIsInitialized(true);
        setIsLoading(false);
        console.log('[SignaturePadPro] Inicialização concluída com sucesso!');
      } catch (err) {
        console.error('Erro ao inicializar SignaturePad:', err);
        setError('Erro ao carregar o componente de assinatura');
        setIsLoading(false);
      }
    }, [value, minWidth, maxWidth, penColor, velocityFilterWeight, resizeCanvas, isInitialized]);
    
    // Atualiza o histórico para undo/redo
    const updateHistory = useCallback(() => {
      if (!signaturePadRef.current) return;
      
      const data = signaturePadRef.current.toData();
      
      // Remove itens do histórico após o passo atual
      historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
      
      // Adiciona o novo estado
      historyRef.current.push(data);
      historyStepRef.current++;
      
      // Limita o histórico a 50 itens
      if (historyRef.current.length > 50) {
        historyRef.current = historyRef.current.slice(-50);
        historyStepRef.current = historyRef.current.length - 1;
      }
      
      setCanUndo(historyStepRef.current > 0);
      setCanRedo(false);
    }, []);
    
    // Função de undo
    const handleUndo = useCallback(() => {
      if (!signaturePadRef.current || historyStepRef.current <= 0) return;
      
      historyStepRef.current--;
      const data = historyRef.current[historyStepRef.current];
      signaturePadRef.current.fromData(data || []);
      
      setCanUndo(historyStepRef.current > 0);
      setCanRedo(true);
      setHasSignature(data && data.length > 0);
    }, []);
    
    // Função de redo
    const handleRedo = useCallback(() => {
      if (!signaturePadRef.current || historyStepRef.current >= historyRef.current.length - 1) return;
      
      historyStepRef.current++;
      const data = historyRef.current[historyStepRef.current];
      signaturePadRef.current.fromData(data || []);
      
      setCanUndo(true);
      setCanRedo(historyStepRef.current < historyRef.current.length - 1);
      setHasSignature(data && data.length > 0);
    }, []);
    
    // Função de limpar
    const handleClear = useCallback(() => {
      if (!signaturePadRef.current) return;
      
      signaturePadRef.current.clear();
      setHasSignature(false);
      updateHistory();
    }, [updateHistory]);
    
    // Função de salvar
    const handleSave = useCallback(async () => {
      if (!signaturePadRef.current) {
        setError('Componente não inicializado');
        return;
      }
      
      if (signaturePadRef.current.isEmpty()) {
        setError('Por favor, faça uma assinatura antes de salvar');
        return;
      }
      
      setIsSaving(true);
      setError(null);
      
      try {
        const dataURL = signaturePadRef.current.toDataURL('image/png');
        await onSave(dataURL);
        setHasSignature(true);
      } catch (err) {
        console.error('Erro ao salvar assinatura:', err);
        setError('Erro ao salvar a assinatura. Tente novamente.');
      } finally {
        setIsSaving(false);
      }
    }, [onSave]);
    
    // Expõe métodos para o componente pai
    useImperativeHandle(ref, () => ({
      clear: handleClear,
      isEmpty: () => signaturePadRef.current ? signaturePadRef.current.isEmpty() : true,
      getSignature: () => {
        if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
          return null;
        }
        return signaturePadRef.current.toDataURL('image/png');
      },
      undo: handleUndo,
      redo: handleRedo
    }), [handleClear, handleUndo, handleRedo]);
    
    // Inicialização
    useEffect(() => {
      // Aguarda um pouco para garantir que o DOM está pronto
      const timer = setTimeout(() => {
        initializeSignaturePad();
      }, 100);
      
      return () => clearTimeout(timer);
    }, [initializeSignaturePad]);
    
    // Gerenciamento de resize
    useEffect(() => {
      if (!isInitialized) return;
      
      const handleResize = () => {
        resizeCanvas();
      };
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      
      // ResizeObserver para mudanças no container
      let resizeObserver: ResizeObserver | null = null;
      if (containerRef.current && 'ResizeObserver' in window) {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerRef.current);
      }
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        resizeObserver?.disconnect();
      };
    }, [resizeCanvas, isInitialized]);
    
    // Atualiza quando o valor externo muda
    useEffect(() => {
      if (!signaturePadRef.current || !value || !isInitialized) return;
      
      try {
        signaturePadRef.current.fromDataURL(value);
        setHasSignature(true);
      } catch (err) {
        console.warn('Erro ao carregar assinatura:', err);
      }
    }, [value, isInitialized]);
    
    // Desabilita/habilita o pad
    useEffect(() => {
      if (!signaturePadRef.current) return;
      
      if (disabled) {
        signaturePadRef.current.off();
      } else {
        signaturePadRef.current.on();
      }
    }, [disabled]);
    
    return (
      <Box sx={{ width: '100%' }}>
        <Stack spacing={2}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              {label}
            </Typography>
            {hasSignature && !disabled && (
              <CheckCircleIcon color="success" fontSize="small" />
            )}
          </Box>
          
          {/* Mensagem de erro */}
          {error && (
            <Alert 
              severity="error" 
              variant="standard"
              onClose={() => setError(null)}
              sx={{ 
                borderRadius: '16px',
                backdropFilter: 'blur(12px)',
                backgroundColor: alpha(theme.palette.error.main, 0.15),
                color: theme.palette.error.dark,
                border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                '& .MuiAlert-icon': {
                  color: theme.palette.error.main,
                },
                boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                fontWeight: 600,
              }}
            >
              {error}
            </Alert>
          )}
          
          {/* Canvas Container */}
          <Paper
            ref={containerRef}
            elevation={2}
            sx={{
              position: 'relative',
              width: '100%',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#fff',
              opacity: disabled ? 0.6 : 1,
              transition: 'opacity 0.2s',
              cursor: disabled ? 'not-allowed' : 'crosshair'
            }}
          >
            {isLoading ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: isMobile ? 250 : 200,
                  backgroundColor: '#f5f5f5'
                }}
              >
                <CircularProgress size={32} />
              </Box>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  style={{
                    display: 'block',
                    touchAction: 'none',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                    MozUserSelect: 'none',
                    msUserSelect: 'none'
                  }}
                />
                
                {/* Placeholder quando vazio */}
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
                    {isMobile ? (
                      <>
                        <TouchAppIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="body2">
                          Toque para assinar
                        </Typography>
                      </>
                    ) : (
                      <>
                        <BrushIcon sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="body2">
                          Clique e arraste para assinar
                        </Typography>
                      </>
                    )}
                  </Box>
                )}
              </>
            )}
          </Paper>
          
          {/* Controles */}
          <Stack 
            direction="row" 
            spacing={1} 
            sx={{ 
              flexWrap: 'wrap', 
              gap: 1,
              '& > *': {
                flexGrow: isMobile ? 1 : 0
              }
            }}
          >
            {/* Botões de Undo/Redo */}
            {!disabled && (
              <>
                <Tooltip title="Desfazer">
                  <span>
                    <IconButton
                      onClick={handleUndo}
                      disabled={!canUndo}
                      size={isMobile ? "medium" : "small"}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <UndoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                
                <Tooltip title="Refazer">
                  <span>
                    <IconButton
                      onClick={handleRedo}
                      disabled={!canRedo}
                      size={isMobile ? "medium" : "small"}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <RedoIcon />
                    </IconButton>
                  </span>
                </Tooltip>
                
                <Box sx={{ flexGrow: 1 }} />
              </>
            )}
            
            {/* Botão Limpar */}
            <Button
              variant="outlined"
              color="error"
              size={isMobile ? "large" : "medium"}
              startIcon={<DeleteIcon />}
              onClick={handleClear}
              disabled={disabled || !hasSignature}
              sx={{
                minWidth: isMobile ? 'auto' : 100,
                borderRadius: 2
              }}
            >
              Limpar
            </Button>
            
            {/* Botão Salvar */}
            {showSaveButton && (
              <Button
                variant="contained"
                color="primary"
                size={isMobile ? "large" : "medium"}
                startIcon={isSaving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                onClick={handleSave}
                disabled={disabled || !hasSignature || isSaving}
                sx={{
                  minWidth: isMobile ? 'auto' : 120,
                  borderRadius: 2,
                  backgroundColor: theme.palette.primary.main,
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark
                  }
                }}
              >
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            )}
          </Stack>
          
          {/* Preview da assinatura salva */}
          {value && !hasSignature && (
            <Paper
              elevation={1}
              sx={{
                p: 2,
                backgroundColor: 'grey.50',
                borderRadius: 2
              }}
            >
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Assinatura salva anteriormente:
              </Typography>
              <Box
                component="img"
                src={value}
                alt="Assinatura salva"
                sx={{
                  maxWidth: '100%',
                  maxHeight: 80,
                  mt: 1,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  backgroundColor: 'white'
                }}
              />
              {!disabled && (
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => setHasSignature(true)}
                  sx={{ mt: 1 }}
                >
                  Editar assinatura
                </Button>
              )}
            </Paper>
          )}
        </Stack>
      </Box>
    );
  }
);

SignaturePadPro.displayName = 'SignaturePadPro';

export default SignaturePadPro;
