import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  TextField, 
  Button, 
  CircularProgress, 
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  FormControlLabel,
  Switch,
  Grid,
  Card,
  CardContent,
  Stack,
  Tooltip,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material';
import { 
  Save as SaveIcon,
  Settings as SettingsIcon,
  Tune as TuneIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Email as EmailIcon,
  Help as HelpIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
// useAuth removido pois não está sendo utilizado
import AdminRoute from '../../../components/admin/AdminRoute';
import { api } from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useSnackbar } from 'notistack';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);
const MotionGrid = motion(Grid);

interface ConfiguracoesSistema {
  id: string;
  chave: string;
  valor: string;
  descricao: string;
  tipo: 'TEXTO' | 'NUMERO' | 'BOOLEANO' | 'SELECAO';
  opcoes?: string[];
}

function ConfiguracoesContent() {
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { enqueueSnackbar } = useSnackbar();

  // Carregar configurações quando o componente for montado
  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/configuracoes');
      setConfiguracoes(response.data.data || []);
    } catch (error: unknown) {
      console.error('Erro ao carregar configurações:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao carregar configurações';
      setError(`Erro ao carregar configurações: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (id: string, value: string | boolean) => {
    setConfiguracoes(prev => 
      prev.map(config => 
        config.id === id ? { ...config, valor: String(value) } : config
      )
    );
  };

  const handleSelectChange = (e: SelectChangeEvent<string>, id: string) => {
    const { value } = e.target;
    handleInputChange(id, value);
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    const { checked } = e.target;
    handleInputChange(id, String(checked));
  };

  interface ConfiguracaoAtualizada {
    id: string;
    valor: string;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      
      const configuracoesAtualizadas: ConfiguracaoAtualizada[] = configuracoes.map(({ id, valor }) => ({
        id,
        valor
      }));
      
      await api.put('/api/admin/configuracoes', { configuracoes: configuracoesAtualizadas });
      
      enqueueSnackbar('Configurações salvas com sucesso!', { variant: 'success' });
    } catch (error: unknown) {
      console.error('Erro ao salvar configurações:', error);
      const errorMessage = error && typeof error === 'object' && 'response' in error && 
                         error.response && typeof error.response === 'object' && 
                         'data' in error.response && 
                         error.response.data && typeof error.response.data === 'object' &&
                         'message' in error.response.data ?
                         String(error.response.data.message) : 'Erro ao salvar configurações';
      
      enqueueSnackbar(errorMessage, { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  

  const getIconForConfig = (chave: string) => {
    const chaveLower = chave.toLowerCase();
    if (chaveLower.includes('email') || chaveLower.includes('smtp')) return <EmailIcon />;
    if (chaveLower.includes('seguranca') || chaveLower.includes('senha')) return <SecurityIcon />;
    if (chaveLower.includes('notificacao')) return <NotificationsIcon />;
    if (chaveLower.includes('banco') || chaveLower.includes('storage')) return <StorageIcon />;
    if (chaveLower.includes('geral')) return <TuneIcon />;
    return <SettingsIcon />;
  };

  const renderConfiguracaoInput = (config: ConfiguracoesSistema) => {
    switch (config.tipo) {
      case 'BOOLEANO':
        return (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2,
            borderRadius: 3,
            bgcolor: 'rgba(25, 118, 210, 0.04)',
            border: '1px solid rgba(25, 118, 210, 0.08)',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'rgba(25, 118, 210, 0.08)',
              borderColor: 'rgba(25, 118, 210, 0.2)',
            }
          }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              {config.descricao}
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={config.valor === 'true'}
                  onChange={(e) => handleSwitchChange(e, config.id)}
                  color="primary"
                />
              }
              label={config.valor === 'true' ? 'Ativado' : 'Desativado'}
              sx={{ m: 0, '& .MuiTypography-root': { fontWeight: 700, fontSize: '0.8rem', color: config.valor === 'true' ? 'primary.main' : 'text.disabled' } }}
            />
          </Box>
        );
      case 'SELECAO':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1.5} sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <TuneIcon fontSize="small" sx={{ opacity: 0.7 }} />
              {config.descricao}
            </Typography>
            <FormControl fullWidth variant="outlined">
              <Select
                value={config.valor}
                onChange={(e) => handleSelectChange(e, config.id)}
                sx={{ 
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255, 255, 255, 0.5)',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.1)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                }}
              >
                {config.opcoes?.map((opcao) => (
                  <MenuItem key={opcao} value={opcao} sx={{ borderRadius: 1.5, mx: 1, my: 0.5 }}>
                    {opcao}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );
      case 'NUMERO':
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1.5} sx={{ fontWeight: 500 }}>
              {config.descricao}
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={config.valor}
              onChange={(e) => handleInputChange(config.id, e.target.value)}
              variant="outlined"
              InputProps={{ 
                sx: { 
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255, 255, 255, 0.5)',
                  '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                  '&:hover fieldset': { borderColor: 'primary.main' },
                } 
              }}
            />
          </Box>
        );
      case 'TEXTO':
      default:
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" mb={1.5} sx={{ fontWeight: 500 }}>
              {config.descricao}
            </Typography>
            <TextField
              fullWidth
              value={config.valor}
              onChange={(e) => handleInputChange(config.id, e.target.value)}
              variant="outlined"
              multiline
              rows={config.valor.length > 50 ? 3 : 1}
              InputProps={{ 
                sx: { 
                  borderRadius: 2.5,
                  bgcolor: 'rgba(255, 255, 255, 0.5)',
                  '& fieldset': { borderColor: 'rgba(0,0,0,0.1)' },
                  '&:hover fieldset': { borderColor: 'primary.main' },
                } 
              }}
            />
          </Box>
        );
    }
  };

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <MotionBox
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Alert 
            severity="error" 
            variant="standard"
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
        </MotionBox>
      </Container>
    );
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress thickness={4} size={60} sx={{ color: 'primary.main', opacity: 0.8 }} />
      </Box>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      pt: 4,
      pb: 10,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorations */}
      <Box sx={{
        position: 'absolute',
        top: -100,
        right: -100,
        width: 400,
        height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(25, 118, 210, 0.05) 0%, rgba(25, 118, 210, 0) 70%)',
        zIndex: 0
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(25, 118, 210, 0.03) 0%, rgba(25, 118, 210, 0) 70%)',
        zIndex: 0
      }} />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <AnimatePresence>
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            mb={5}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <Box 
                sx={{ 
                  p: 2.5, 
                  borderRadius: 4, 
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  color: 'white',
                  boxShadow: '0 12px 24px rgba(25, 118, 210, 0.25)',
                  display: 'flex',
                  transform: 'rotate(-3deg)'
                }}
              >
                <SettingsIcon sx={{ fontSize: 40 }} />
              </Box>
              <Box>
                <Typography variant="h3" component="h1" fontWeight="900" sx={{ color: '#0f172a', letterSpacing: '-0.04em', mb: 0.5 }}>
                  Configurações
                </Typography>
                <Typography variant="h6" color="text.secondary" fontWeight="500" sx={{ opacity: 0.8 }}>
                  Personalize o comportamento do sistema e parâmetros globais
                </Typography>
              </Box>
            </Stack>
          </MotionBox>

          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={4}>
              {configuracoes.map((config, index) => (
                <Grid item xs={12} md={6} key={config.id}>
                  <MotionCard
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + (index * 0.08), duration: 0.5 }}
                    whileHover={{ y: -6, transition: { duration: 0.2 } }}
                    sx={{
                      height: '100%',
                      borderRadius: 5,
                      background: 'rgba(255, 255, 255, 0.8)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
                      transition: 'all 0.3s ease-in-out',
                      overflow: 'hidden'
                    }}
                  >
                    <Box sx={{ height: 6, background: 'linear-gradient(90deg, #1976d2, #64b5f6)', opacity: 0.8 }} />
                    <CardContent sx={{ p: 4 }}>
                      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
                        <Box sx={{ 
                          p: 1.5, 
                          borderRadius: 2.5, 
                          bgcolor: 'rgba(25, 118, 210, 0.1)', 
                          color: 'primary.main',
                          display: 'flex'
                        }}>
                          {getIconForConfig(config.chave)}
                        </Box>
                        <Typography variant="h6" fontWeight="800" color="#1e293b" sx={{ textTransform: 'capitalize', letterSpacing: '-0.01em' }}>
                          {config.chave.replace(/_/g, ' ')}
                        </Typography>
                      </Stack>
                      
                      <Box sx={{ mt: 2 }}>
                        {renderConfiguracaoInput(config)}
                      </Box>
                    </CardContent>
                  </MotionCard>
                </Grid>
              ))}

              <Grid item xs={12}>
                <MotionBox 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  display="flex" 
                  justifyContent="flex-end" 
                  mt={4}
                >
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={saving}
                    sx={{
                      px: 8,
                      py: 2,
                      borderRadius: 4,
                      textTransform: 'none',
                      fontSize: '1.15rem',
                      fontWeight: '800',
                      background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                      boxShadow: '0 12px 28px rgba(25, 118, 210, 0.3)',
                      '&:hover': {
                        boxShadow: '0 18px 36px rgba(25, 118, 210, 0.4)',
                        transform: 'translateY(-3px)'
                      },
                      '&:active': {
                        transform: 'translateY(0)'
                      },
                      transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                    startIcon={saving ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                  >
                    {saving ? 'Salvando Alterações...' : 'Salvar Todas as Configurações'}
                  </Button>
                </MotionBox>
              </Grid>
            </Grid>
          </Box>
        </AnimatePresence>
      </Container>

      
    </Box>
  );
}

export default function Configuracoes() {
  return (
    <AdminRoute>
      <ConfiguracoesContent />
    </AdminRoute>
  );
}
