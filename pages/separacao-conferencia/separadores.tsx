// ===== CADASTRAR SEPARAÇÃO - DOMÍNIO DE PEDIDOS =====
// 
// IMPORTANTE: Esta página é específica para cadastro de PEDIDOS (separação/conferência)
// NÃO confundir com NOTAS FISCAIS - são processos logísticos completamente distintos
//
// DOMÍNIO DE PEDIDOS vs NOTAS FISCAIS:
// 
// 1. PEDIDOS (Este arquivo):
//    - Solicitações internas de produtos para separação no estoque
//    - Processo de picking/separação de itens do armazém
//    - Conferência e auditoria dos itens separados
//    - Fluxo: Criação → Separação → Conferência → Auditoria → Finalização
//    - Usado por separadores e conferentes internos
//    - Pode ou não gerar notas fiscais posteriormente
//
// 2. NOTAS FISCAIS (Controle de Carga):
//    - Documentos fiscais obrigatórios que acompanham mercadorias
//    - Usadas para controle de transporte e entrega externa
//    - Vinculadas a controles de carga para motoristas
//    - Fluxo: Criação → Vinculação ao Controle → Transporte → Assinatura → Finalização
//    - Usado por motoristas e responsáveis externos
//
// ATENÇÃO: Não misturar os dois domínios - são tabelas, APIs e fluxos diferentes!
// Todos os dados são salvos em PedidoConferido

import { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Grid,
  Box,
  CircularProgress,
  SelectChangeEvent,
  Alert,
  alpha,
  Stack,
  InputAdornment,
  Tooltip,
  useTheme
} from '@mui/material';
import { 
  Assignment as AssignmentIcon, 
  Person as PersonIcon, 
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Info as InfoIcon,
  Group as GroupIcon,
  History as HistoryIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);

interface Usuario {
  id: string;
  nome: string;
  tipo: 'SEPARADOR' | 'AUDITOR' | 'CONFERENTE';
}

export default function CadastrarSeparacaoPage() {
  const theme = useTheme();
  const [pedido, setPedido] = useState('');

  const [separadorId, setSeparadorId] = useState('');
  const [auditorId, setAuditorId] = useState('');

  const [separadores, setSeparadores] = useState<Usuario[]>([]);
  const [auditores, setAuditores] = useState<Usuario[]>([]);
  
  const [loading, setLoading] = useState(true);
  const { enqueueSnackbar } = useSnackbar();

  const glassStyles = {
    background: alpha('#ffffff', 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
  };

  useEffect(() => {
    async function fetchUsuarios() {
      try {
        setLoading(true);
        const { data } = await api.get<Usuario[]>('/api/usuarios-por-funcao');
        setSeparadores(data.filter(u => u.tipo === 'SEPARADOR'));
        setAuditores(data.filter(u => u.tipo === 'AUDITOR'));
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        enqueueSnackbar('Falha ao carregar dados de usuários.', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    }
    fetchUsuarios();
  }, [enqueueSnackbar]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    try {
      const response = await api.post('/api/pedidos', {
        numeroPedido: pedido,
        separadorId: separadorId,
        auditorId: auditorId || null,
      });

      if (response.status === 200 || response.status === 201) {
        enqueueSnackbar('Separação cadastrada com sucesso!', { variant: 'success' });
        handleCancel();
      } else {
        throw new Error('Falha ao salvar a separação');
      }
    } catch (error: any) {
      console.error('Erro ao salvar separação:', error);
      const errorMessage = error?.response?.data?.error || 'Erro ao salvar a separação. Tente novamente.';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleCancel = () => {
    setPedido('');
    setSeparadorId('');
    setAuditorId('');
  };

  if (loading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
      }}>
        <Stack spacing={3} alignItems="center">
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress size={64} thickness={4} sx={{ color: 'primary.main', opacity: 0.2 }} />
            <CircularProgress 
              size={64} 
              thickness={4} 
              sx={{ 
                color: 'primary.main', 
                position: 'absolute',
                strokeLinecap: 'round'
              }} 
            />
            <AssignmentIcon sx={{ position: 'absolute', fontSize: 32, color: 'primary.main', opacity: 0.5 }} />
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" fontWeight="800" color="text.primary" gutterBottom>
              Carregando Usuários
            </Typography>
            <Typography variant="body2" color="text.secondary" fontWeight="500">
              Sincronizando equipe de separação...
            </Typography>
          </Box>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      pt: { xs: 4, md: 8 },
      pb: { xs: 4, md: 8 }
    }}>
      <Container maxWidth="sm">
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{ mb: 4 }}
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ 
              bgcolor: 'primary.main', 
              width: 56, 
              height: 56, 
              borderRadius: 3,
              boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AssignmentIcon sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
                Separadores
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Cadastrar Nova Separação
              </Typography>
            </Box>
          </Stack>
        </MotionBox>

        <MotionPaper
          elevation={0}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          sx={{
            p: { xs: 3, sm: 5 },
            borderRadius: '24px',
            ...glassStyles,
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Aviso sobre domínio de dados */}
          <Alert 
            severity="info" 
            variant="standard"
            icon={<InfoIcon sx={{ color: theme.palette.info.main }} />}
            sx={{ 
              mb: 4, 
              borderRadius: '16px',
              backdropFilter: 'blur(12px)',
              backgroundColor: alpha(theme.palette.info.main, 0.15),
              color: theme.palette.info.dark,
              border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
              '& .MuiAlert-icon': {
                color: theme.palette.info.main,
              },
              '& .MuiAlert-message': {
                fontWeight: 500,
                fontSize: '0.875rem'
              },
              boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
            }}
          >
            <Typography variant="subtitle2" fontWeight="800" sx={{ mb: 0.5, color: theme.palette.info.main }}>
              Domínio de Pedidos
            </Typography>
            Esta funcionalidade é específica para separação e conferência de pedidos. 
            Não confundir com notas fiscais - são processos totalmente distintos.
          </Alert>

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={4}>
              <Grid item xs={12}>
                <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', ml: 1 }}>
                  Informações do Pedido
                </Typography>
                <TextField
                  required
                  fullWidth
                  id="numero-pedido"
                  label="Nº do Pedido"
                  placeholder="Ex: 123456"
                  value={pedido}
                  onChange={(e) => setPedido(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: 'primary.main', opacity: 0.7 }} />
                      </InputAdornment>
                    ),
                    sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', ml: 1 }}>
                  Equipe Responsável
                </Typography>
                <Stack spacing={3}>
                  <FormControl fullWidth required>
                    <InputLabel id="separador-label" sx={{ fontWeight: 600 }}>Separador</InputLabel>
                    <Select
                      labelId="separador-label"
                      id="separador-select"
                      value={separadorId}
                      label="Separador"
                      onChange={(e: SelectChangeEvent) => setSeparadorId(e.target.value)}
                      sx={{ borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }}
                      startAdornment={
                        <InputAdornment position="start" sx={{ ml: 1 }}>
                          <PersonIcon sx={{ color: 'primary.main', opacity: 0.7 }} />
                        </InputAdornment>
                      }
                    >
                      {separadores.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                            {user.nome}
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel id="auditor-label" sx={{ fontWeight: 600 }}>Auditor (Opcional)</InputLabel>
                    <Select
                      labelId="auditor-label"
                      id="auditor-select"
                      value={auditorId}
                      label="Auditor (Opcional)"
                      onChange={(e: SelectChangeEvent) => setAuditorId(e.target.value)}
                      sx={{ borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }}
                      startAdornment={
                        <InputAdornment position="start" sx={{ ml: 1 }}>
                          <GroupIcon sx={{ color: 'primary.main', opacity: 0.7 }} />
                        </InputAdornment>
                      }
                    >
                      <MenuItem value="">
                        <Typography color="text.secondary" fontStyle="italic">Selecionar depois</Typography>
                      </MenuItem>
                      {auditores.map((user) => (
                        <MenuItem key={user.id} value={user.id}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'primary.main' }} />
                            {user.nome}
                          </Stack>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>
              </Grid>

              <Grid item xs={12}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
                  <Button 
                    fullWidth 
                    variant="outlined" 
                    color="inherit" 
                    onClick={handleCancel}
                    sx={{ 
                      borderRadius: '12px', 
                      py: 1.5, 
                      fontWeight: 700,
                      textTransform: 'none',
                      borderColor: alpha('#1e293b', 0.2),
                      '&:hover': { bgcolor: alpha('#1e293b', 0.05), borderColor: alpha('#1e293b', 0.3) }
                    }}
                  >
                    Limpar Formulário
                  </Button>
                  <Button 
                    fullWidth 
                    type="submit" 
                    variant="contained" 
                    sx={{ 
                      borderRadius: '12px', 
                      py: 1.5, 
                      fontWeight: 800,
                      textTransform: 'none',
                      boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      '&:hover': { 
                        boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
                        transform: 'translateY(-1px)'
                      },
                      transition: 'all 0.2s'
                    }}
                  >
                    Salvar Registro
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </MotionPaper>
      </Container>
    </Box>
  );
}
