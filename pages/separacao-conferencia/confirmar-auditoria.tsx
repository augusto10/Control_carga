import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  Grid,
  TextField,
  CircularProgress,
  Alert,
  Snackbar,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  SelectChangeEvent,
  alpha,
  useTheme
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

const glassStyles = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.08)',
};

const buttonStyles = {
  borderRadius: '16px',
  padding: '12px 24px',
  fontWeight: 800,
  textTransform: 'none',
  fontSize: '0.95rem',
  letterSpacing: '0.3px',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 20px rgba(0,0,0,0.1)'
  }
} as const;

const MOTIVOS_INCONSISTENCIA = [
  'AVARIA',
  'QUANTIDADE', 
  'PRODUTO TROCADO',
  'EMBALAGEM',
  'PRODUTO SUJO',
  'PRODUTO VENCIDO',
  'ETIQUETAGEM',
  'LOTE',
  'SEM INCONSISTÊNCIA',
  'PRODUTO FALTANDO'
] as const;

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Pedido {
  id: string;
  numeroPedido: string;
  dataCriacao: string;
  controle: {
    id: string;
    numeroManifesto: string | null;
    motorista: string;
    responsavel: string;
    transportadora: string;
    separador: Usuario | null;
    auditor: Usuario | null;
  } | null;
}

interface FormData {
  pedido100: string;
  inconsistencia: string;
  motivoInconsistencia: string;
  observacoes: string;
}

function ConfirmarAuditoria() {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<string>('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<FormData>({
    pedido100: '',
    inconsistencia: '',
    motivoInconsistencia: '',
    observacoes: ''
  });

  // Carregar pedidos disponíveis para auditoria
  const carregarPedidos = async () => {
    try {
      setCarregando(true);
      setErro(null);
      
      // Buscar pedidos que foram separados mas ainda não auditados
      const response = await api.get('/api/pedidos/listar-para-auditoria');
      setPedidos(response.data);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      setErro('Erro ao carregar a lista de pedidos. Tente novamente mais tarde.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPedidos();
  }, []);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePedidoChange = (event: SelectChangeEvent) => {
    setPedidoSelecionado(event.target.value);
    // Resetar formulário quando trocar de pedido
    setFormData({
      pedido100: '',
      inconsistencia: '',
      motivoInconsistencia: '',
      observacoes: ''
    });
  };

  const handleSalvar = async () => {
    if (!pedidoSelecionado) {
      setErro('Selecione um pedido para auditar');
      return;
    }

    if (!formData.pedido100 || !formData.inconsistencia) {
      setErro('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.inconsistencia === 'sim' && !formData.motivoInconsistencia) {
      setErro('Selecione o motivo da inconsistência');
      return;
    }

    try {
      setSalvando(true);
      setErro(null);

      const dadosAuditoria = {
        pedidoId: pedidoSelecionado,
        pedido100: formData.pedido100 === 'sim',
        inconsistencia: formData.inconsistencia === 'sim',
        motivoInconsistencia: formData.inconsistencia === 'sim' ? formData.motivoInconsistencia : null,
        observacoes: formData.observacoes || null,
        auditorId: user?.id
      };

      await api.post('/api/pedidos/confirmar-auditoria', dadosAuditoria);
      
      setSucesso('Auditoria confirmada com sucesso!');
      
      // Resetar formulário
      setPedidoSelecionado('');
      setFormData({
        pedido100: '',
        inconsistencia: '',
        motivoInconsistencia: '',
        observacoes: ''
      });
      
      // Recarregar lista de pedidos
      await carregarPedidos();
      
    } catch (error) {
      console.error('Erro ao salvar auditoria:', error);
      setErro('Erro ao salvar auditoria. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleVoltar = () => {
    router.back();
  };

  const handleFecharNotificacao = () => {
    setErro(null);
    setSucesso(null);
  };

  const pedidoAtual = pedidos.find(p => p.id === pedidoSelecionado);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, md: 6 } }}>
      {/* Header */}
      <MotionBox
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        sx={{ mb: 4 }}
      >
        <AppBar 
          position="static" 
          sx={{ 
            ...glassStyles,
            borderRadius: '24px',
            color: 'text.primary',
            overflow: 'hidden',
            p: 1
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                edge="start"
                onClick={handleVoltar}
                sx={{ 
                  color: 'primary.main',
                  bgcolor: alpha('#1976d2', 0.08),
                  borderRadius: '16px',
                  '&:hover': { 
                    bgcolor: 'primary.main',
                    color: 'white',
                    transform: 'translateX(-4px)'
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.2,
                    borderRadius: '16px',
                    bgcolor: alpha('#1976d2', 0.1),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(25, 118, 210, 0.15)'
                  }}
                >
                  <AddIcon sx={{ color: 'primary.main', fontSize: 28 }} />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                    Confirmar Auditoria
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', opacity: 0.8 }}>
                    Conferência de Pedidos
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Toolbar>
        </AppBar>
      </MotionBox>

      {carregando ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress thickness={5} size={50} sx={{ color: 'primary.main', opacity: 0.8 }} />
        </Box>
      ) : (
        <MotionPaper
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          sx={{ 
            ...glassStyles,
            borderRadius: '24px',
            overflow: 'hidden'
          }}
        >
          <Box sx={{ p: { xs: 3, md: 5 } }}>
            <Grid container spacing={4}>
              {/* Seleção de Pedido */}
              <Grid item xs={12}>
                <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 800, mb: 1.5, display: 'block', letterSpacing: 1.2 }}>
                  SELEÇÃO DO PEDIDO
                </Typography>
                <FormControl fullWidth>
                  <InputLabel sx={{ fontWeight: 600 }}>Selecione um pedido para auditar</InputLabel>
                  <Select
                    value={pedidoSelecionado}
                    label="Selecione um pedido para auditar"
                    onChange={handlePedidoChange}
                    disabled={salvando}
                    sx={{ 
                      borderRadius: '16px',
                      bgcolor: 'rgba(255, 255, 255, 0.4)',
                      fontWeight: 600,
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        borderWidth: '1px',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: '1px',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                        borderWidth: '2px',
                      }
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          ...glassStyles,
                          borderRadius: '16px',
                          mt: 1,
                          boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                        }
                      }
                    }}
                  >
                    {pedidos.map((pedido) => (
                      <MenuItem 
                        key={pedido.id} 
                        value={pedido.id} 
                        sx={{ 
                          py: 1.5, 
                          px: 2, 
                          borderRadius: '12px', 
                          mx: 1, 
                          my: 0.5,
                          '&.Mui-selected': {
                            bgcolor: alpha('#1976d2', 0.1),
                            color: 'primary.main',
                            fontWeight: 700,
                            '&:hover': { bgcolor: alpha('#1976d2', 0.15) }
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Pedido #{pedido.numeroPedido}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {pedido.controle?.transportadora || 'Sem transportadora'} • {pedido.controle?.numeroManifesto || 'N/A'}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Informações do Pedido Selecionado */}
              <AnimatePresence mode="wait">
                {pedidoAtual && (
                  <Grid item xs={12}>
                    <MotionBox
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Paper 
                        elevation={0}
                        sx={{ 
                          p: 3, 
                          bgcolor: alpha('#1976d2', 0.04),
                          borderRadius: '24px',
                          border: '1px solid rgba(255, 255, 255, 0.4)',
                          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.02)',
                          backdropFilter: 'blur(5px)'
                        }}
                      >
                        <Typography variant="overline" sx={{ color: 'primary.main', fontWeight: 900, mb: 2, display: 'flex', alignItems: 'center', gap: 1.5, letterSpacing: 1.2 }}>
                          <Box sx={{ width: 4, height: 18, bgcolor: 'primary.main', borderRadius: '4px' }} />
                          DETALHES DO PEDIDO
                        </Typography>
                        <Grid container spacing={2}>
                          {[
                            { label: 'Número', value: pedidoAtual.numeroPedido },
                            { label: 'Manifesto', value: pedidoAtual.controle?.numeroManifesto || 'N/A' },
                            { label: 'Motorista', value: pedidoAtual.controle?.motorista || 'N/A' },
                            { label: 'Transportadora', value: pedidoAtual.controle?.transportadora || 'N/A' },
                            { label: 'Separador', value: pedidoAtual.controle?.separador?.nome || 'N/A' },
                            { label: 'Responsável', value: pedidoAtual.controle?.responsavel || 'N/A' },
                          ].map((item, idx) => (
                            <Grid item xs={12} sm={6} md={4} key={idx}>
                              <Box sx={{ 
                                p: 2, 
                                borderRadius: '16px', 
                                bgcolor: 'rgba(255, 255, 255, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.6)',
                                transition: 'all 0.2s',
                                '&:hover': { transform: 'translateY(-2px)', bgcolor: 'rgba(255, 255, 255, 0.8)' }
                              }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, display: 'block', mb: 0.5 }}>
                                  {item.label}
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 800, color: 'text.primary' }}>
                                  {item.value}
                                </Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Paper>
                    </MotionBox>
                  </Grid>
                )}
              </AnimatePresence>

              {/* Formulário de Auditoria */}
              <AnimatePresence>
                {pedidoSelecionado && (
                  <Grid item xs={12}>
                    <MotionBox
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, mb: 1, display: 'block', letterSpacing: 1 }}>
                            STATUS DA CONFERÊNCIA
                          </Typography>
                          <FormControl fullWidth>
                            <InputLabel sx={{ fontWeight: 600 }}>Pedido 100%?</InputLabel>
                            <Select
                              value={formData.pedido100}
                              label="Pedido 100%?"
                              onChange={(e) => handleInputChange('pedido100', e.target.value)}
                              disabled={salvando}
                              sx={{ 
                                borderRadius: '16px',
                                bgcolor: 'rgba(255, 255, 255, 0.4)',
                                fontWeight: 600,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.08)' }
                              }}
                              MenuProps={{
                                PaperProps: { sx: { ...glassStyles, borderRadius: '16px', mt: 1 } }
                              }}
                            >
                              <MenuItem value="sim" sx={{ py: 1.5, borderRadius: '12px', mx: 1, my: 0.5 }}>Sim</MenuItem>
                              <MenuItem value="nao" sx={{ py: 1.5, borderRadius: '12px', mx: 1, my: 0.5 }}>Não</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, mb: 1, display: 'block', letterSpacing: 1 }}>
                            INCONSISTÊNCIA
                          </Typography>
                          <FormControl fullWidth>
                            <InputLabel sx={{ fontWeight: 600 }}>Houve inconsistência?</InputLabel>
                            <Select
                              value={formData.inconsistencia}
                              label="Houve inconsistência?"
                              onChange={(e) => handleInputChange('inconsistencia', e.target.value)}
                              disabled={salvando}
                              sx={{ 
                                borderRadius: '16px',
                                bgcolor: 'rgba(255, 255, 255, 0.4)',
                                fontWeight: 600,
                                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0, 0, 0, 0.08)' }
                              }}
                              MenuProps={{
                                PaperProps: { sx: { ...glassStyles, borderRadius: '16px', mt: 1 } }
                              }}
                            >
                              <MenuItem value="sim" sx={{ py: 1.5, borderRadius: '12px', mx: 1, my: 0.5 }}>Sim</MenuItem>
                              <MenuItem value="nao" sx={{ py: 1.5, borderRadius: '12px', mx: 1, my: 0.5 }}>Não</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>

                        <AnimatePresence>
                          {formData.inconsistencia === 'sim' && (
                            <Grid item xs={12}>
                              <MotionBox
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                              >
                                <Typography variant="overline" sx={{ color: 'error.main', fontWeight: 800, mb: 1, display: 'block', letterSpacing: 1 }}>
                                  MOTIVO DA INCONSISTÊNCIA
                                </Typography>
                                <FormControl fullWidth error>
                                  <InputLabel sx={{ fontWeight: 600 }}>Selecione o motivo</InputLabel>
                                  <Select
                                    value={formData.motivoInconsistencia}
                                    label="Selecione o motivo"
                                    onChange={(e) => handleInputChange('motivoInconsistencia', e.target.value)}
                                    disabled={salvando}
                                    sx={{ 
                                      borderRadius: '16px',
                                      bgcolor: 'rgba(255, 255, 255, 0.4)',
                                      fontWeight: 600,
                                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(211, 47, 47, 0.3)' }
                                    }}
                                    MenuProps={{
                                      PaperProps: { sx: { ...glassStyles, borderRadius: '16px', mt: 1 } }
                                    }}
                                  >
                                    {MOTIVOS_INCONSISTENCIA.map((motivo) => (
                                      <MenuItem key={motivo} value={motivo} sx={{ py: 1.5, borderRadius: '12px', mx: 1, my: 0.5 }}>
                                        {motivo}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </MotionBox>
                            </Grid>
                          )}
                        </AnimatePresence>

                        <Grid item xs={12}>
                          <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, mb: 1, display: 'block', letterSpacing: 1 }}>
                            OBSERVAÇÕES ADICIONAIS
                          </Typography>
                          <TextField
                            fullWidth
                            multiline
                            rows={3}
                            label="Detalhes importantes da auditoria"
                            value={formData.observacoes}
                            onChange={(e) => handleInputChange('observacoes', e.target.value)}
                            disabled={salvando}
                            placeholder="Descreva detalhes importantes da auditoria..."
                            sx={{ 
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '16px',
                                bgcolor: 'rgba(255, 255, 255, 0.4)',
                                fontWeight: 500,
                                transition: 'all 0.2s',
                                '& fieldset': {
                                  borderColor: 'rgba(0, 0, 0, 0.08)',
                                  borderWidth: '1px',
                                },
                                '&:hover fieldset': {
                                  borderColor: 'primary.main',
                                },
                                '&.Mui-focused fieldset': {
                                  borderWidth: '2px',
                                }
                              }
                            }}
                          />
                        </Grid>
                      </Grid>

                      {/* Botões de Ação */}
                      <Box sx={{ display: 'flex', gap: 2, mt: 6, justifyContent: 'flex-end' }}>
                        <Button
                          variant="text"
                          onClick={handleVoltar}
                          disabled={salvando}
                          sx={{ 
                            ...buttonStyles,
                            px: 4, 
                            color: 'text.secondary',
                            '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', transform: 'translateY(-2px)' }
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="contained"
                          onClick={handleSalvar}
                          disabled={salvando || !pedidoSelecionado}
                          startIcon={salvando ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
                          sx={{ 
                            ...buttonStyles,
                            px: 6,
                            bgcolor: 'primary.main',
                            boxShadow: '0 8px 20px rgba(25, 118, 210, 0.25)',
                            '&:hover': {
                              bgcolor: 'primary.dark',
                              boxShadow: '0 12px 28px rgba(25, 118, 210, 0.35)',
                              transform: 'translateY(-2px)'
                            }
                          }}
                        >
                          {salvando ? 'Salvando...' : 'Confirmar Auditoria'}
                        </Button>
                      </Box>
                    </MotionBox>
                  </Grid>
                )}
              </AnimatePresence>
            </Grid>
          </Box>
        </MotionPaper>
      )}

      {/* Notificações */}
      <Snackbar
        open={!!erro}
        autoHideDuration={6000}
        onClose={handleFecharNotificacao}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleFecharNotificacao} 
          severity="error" 
          variant="standard"
          sx={{ 
            width: '100%', 
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
          {erro}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!sucesso}
        autoHideDuration={4000}
        onClose={handleFecharNotificacao}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleFecharNotificacao} 
          severity="success" 
          variant="standard"
          sx={{ 
            width: '100%', 
            borderRadius: '16px',
            backdropFilter: 'blur(12px)',
            backgroundColor: alpha(theme.palette.success.main, 0.15),
            color: theme.palette.success.dark,
            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
            '& .MuiAlert-icon': {
              color: theme.palette.success.main,
            },
            boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
            fontWeight: 600,
          }}
        >
          {sucesso}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default ConfirmarAuditoria;
