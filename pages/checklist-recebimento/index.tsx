import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useDeviceDetect } from '../../hooks/useDeviceDetect';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Divider,
  Chip,
  Stack,
  Container,
  alpha,
  useTheme,
  Fade
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  PhotoCamera as PhotoCameraIcon,
  Save as SaveIcon,
  CheckCircle as CheckCircleIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  QrCodeScanner as QrCodeScannerIcon,
  CameraAlt as CameraAltIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Timer as TimerIcon,
  CalendarMonth as CalendarIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  Rule as RuleIcon,
  Info as InfoIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';
import AndroidScanner from '../../components/AndroidScanner';
import AndroidCamera from '../../components/AndroidCamera';
import ResponsiveContainer from '../../components/ResponsiveContainer';

import { useSnackbar } from 'notistack';

// Declaração global para scanner Android
declare global {
  interface Window {
    Android?: {
      scanBarcode: (callback: (result: string) => void) => void;
      isAvailable: () => boolean;
    };
  }
}

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionCard = motion(Card);
const MotionGrid = motion(Grid);

interface Produto {
  id: string;
  nomeFabricante: string;
  descricaoProduto: string;
  numeroLote: string;
  dataFabricacao: string;
  dataVencimento: string;
  admProduto: string;
  codigoBarrasCaixaMaster: string;
  codigoBarrasCaixaInterna: string;
  codigoBarrasItem: string;
  fotoProduto: File | null;
}

interface ChecklistData {
  dataRecebimento: string;
  horarioRecebimento: string;
  nomeConferente: string;
  produtos: Produto[];
  fotoRecebimento: File | null;
  fotoDevolucao: File | null;
  recebimentoPocket: boolean;
  motivoNaoPocket: string;
  possuiCodigoBarras: boolean;
  solicitouCadastroCodigoBarras: boolean;
  paraQuemSolicitou: string;
  dadosLoteCadastradosSantri: boolean;
  condicaoEmbalagens: 'OTIMA' | 'BOA' | 'RUIM' | '';
  houveRessalva: boolean;
  descricaoRessalva: string;
  paraQuemInformouRessalva: string;
  houveDevolucao: boolean;
  itensDevolvidos: string;
  quantidadeDevolvida: number;
  fotoTiradaDevolucao: boolean;
  notaDevolucaoEmitida: boolean;
  numeroNotaDevolucao: string;
  alertaValidadeAutorizado: boolean;
  nomeAutorizadorLider: string;
  produtosComAlertaValidade: string[];
}

const steps = [
  'Dados e Produtos',
  'Códigos de Barras',
  'Fotos',
  'Checklist',
  'Finalização'
];

function ChecklistRecebimentoPage() {
  const theme = useTheme();
  const [activeStep, setActiveStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const { isMobile } = useDeviceDetect();
  const { enqueueSnackbar } = useSnackbar();
  
  const glassStyles = {
    background: alpha('#ffffff', 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
  };

  const [formData, setFormData] = useState<ChecklistData>({
    dataRecebimento: new Date().toISOString().split('T')[0],
    horarioRecebimento: new Date().toTimeString().split(' ')[0].substring(0, 5),
    nomeConferente: user?.nome || '',
    produtos: [{
      id: '1',
      nomeFabricante: '',
      descricaoProduto: '',
      numeroLote: '',
      dataFabricacao: '',
      dataVencimento: '',
      admProduto: '',
      codigoBarrasCaixaMaster: '',
      codigoBarrasCaixaInterna: '',
      codigoBarrasItem: '',
      fotoProduto: null
    }],
    fotoRecebimento: null,
    fotoDevolucao: null,
    recebimentoPocket: true,
    motivoNaoPocket: '',
    possuiCodigoBarras: true,
    solicitouCadastroCodigoBarras: false,
    paraQuemSolicitou: '',
    dadosLoteCadastradosSantri: true,
    condicaoEmbalagens: '',
    houveRessalva: false,
    descricaoRessalva: '',
    paraQuemInformouRessalva: '',
    houveDevolucao: false,
    itensDevolvidos: '',
    quantidadeDevolvida: 0,
    fotoTiradaDevolucao: false,
    notaDevolucaoEmitida: false,
    numeroNotaDevolucao: '',
    alertaValidadeAutorizado: false,
    nomeAutorizadorLider: '',
    produtosComAlertaValidade: []
  });

  const adicionarProduto = () => {
    const novoProduto: Produto = {
      id: Date.now().toString(),
      nomeFabricante: '',
      descricaoProduto: '',
      numeroLote: '',
      dataFabricacao: '',
      dataVencimento: '',
      admProduto: '',
      codigoBarrasCaixaMaster: '',
      codigoBarrasCaixaInterna: '',
      codigoBarrasItem: '',
      fotoProduto: null
    };
    
    setFormData(prev => ({
      ...prev,
      produtos: [...prev.produtos, novoProduto]
    }));
  };

  const removerProduto = (id: string) => {
    if (formData.produtos.length > 1) {
      setFormData(prev => ({
        ...prev,
        produtos: prev.produtos.filter(p => p.id !== id)
      }));
    }
  };

  const atualizarProduto = (id: string, campo: keyof Produto, valor: string) => {
    setFormData(prev => ({
      ...prev,
      produtos: prev.produtos.map(p => 
        p.id === id ? { ...p, [campo]: valor } : p
      )
    }));
    
    if (campo === 'dataVencimento' && valor) {
      setTimeout(() => {
        const produtosComProblema = validarValidadeProdutos();
        if (produtosComProblema.length > 0) {
          const mensagem = `⚠️ ALERTA DE VALIDADE\n\nOs seguintes produtos estão com validade inferior a 8 meses:\n\n${produtosComProblema.join('\n')}\n\nDeseja prosseguir?`;
          
          if (window.confirm(mensagem)) {
            let nomeAutorizador;
            do {
              nomeAutorizador = prompt('👥 Digite o nome do líder que autorizou prosseguir:');
            } while (nomeAutorizador !== null && nomeAutorizador.trim() === '');

            if (nomeAutorizador) {
              setFormData(prev => ({
                ...prev,
                alertaValidadeAutorizado: true,
                nomeAutorizadorLider: nomeAutorizador.trim(),
                produtosComAlertaValidade: produtosComProblema
              }));
              
              enqueueSnackbar(`⚠️ Alerta de validade registrado.\nAutorizado por: ${nomeAutorizador.trim()}`, { variant: 'warning' });
            }
          } else {
            atualizarProduto(id, campo, '');
            enqueueSnackbar('❌ Produto com validade inferior a 8 meses não autorizado', { variant: 'error' });
          }
        }
      }, 250);
    }
  };

  const validarValidadeProdutos = () => {
    const produtosComProblema: string[] = [];
    const hoje = new Date();
    const oitoMesesEmMs = 8 * 30 * 24 * 60 * 60 * 1000;
    
    formData.produtos.forEach(produto => {
      if (produto.dataVencimento) {
        const dataVencimento = new Date(produto.dataVencimento);
        const diferencaMs = dataVencimento.getTime() - hoje.getTime();
        
        if (diferencaMs < oitoMesesEmMs && diferencaMs > 0) {
          const mesesRestantes = Math.floor(diferencaMs / (30 * 24 * 60 * 60 * 1000));
          produtosComProblema.push(`${produto.descricaoProduto || 'Produto'} (${mesesRestantes} meses restantes)`);
        } else if (diferencaMs <= 0) {
          produtosComProblema.push(`${produto.descricaoProduto || 'Produto'} (VENCIDO)`);
        }
      }
    });
    
    return produtosComProblema;
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const checklistData = new FormData();
      checklistData.append('dataRecebimento', formData.dataRecebimento);
      checklistData.append('horarioRecebimento', formData.horarioRecebimento);
      checklistData.append('nomeConferente', formData.nomeConferente);
      checklistData.append('produtos', JSON.stringify(formData.produtos));
      
      if (formData.fotoRecebimento) checklistData.append('fotoRecebimento', formData.fotoRecebimento);
      if (formData.fotoDevolucao) checklistData.append('fotoDevolucao', formData.fotoDevolucao);
      
      formData.produtos.forEach((produto) => {
        if (produto.fotoProduto) {
          checklistData.append(`fotoProduto_${produto.id}`, produto.fotoProduto);
        }
      });
      
      Object.entries(formData).forEach(([key, value]) => {
        if (!['produtos', 'fotoRecebimento', 'fotoDevolucao'].includes(key)) {
          if (key === 'produtosComAlertaValidade') {
            checklistData.append(key, JSON.stringify(value));
          } else if (value !== null) {
            checklistData.append(key, value.toString());
          }
        }
      });

      const response = await fetch('/api/checklist-recebimento', {
        method: 'POST',
        credentials: 'include',
        body: checklistData
      });

      if (!response.ok) throw new Error('Erro ao salvar checklist');

      enqueueSnackbar('Checklist salvo com sucesso!', { variant: 'success' });
      setTimeout(() => router.push('/checklist-recebimento/relatorios'), 2000);
    } catch (error) {
      enqueueSnackbar('Erro ao salvar checklist', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Data do Recebimento"
                  type="date"
                  value={formData.dataRecebimento}
                  onChange={(e) => setFormData(prev => ({ ...prev, dataRecebimento: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ 
                    startAdornment: <CalendarIcon sx={{ mr: 1, color: 'primary.main' }} />,
                    sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Horário"
                  type="time"
                  value={formData.horarioRecebimento}
                  onChange={(e) => setFormData(prev => ({ ...prev, horarioRecebimento: e.target.value }))}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ 
                    startAdornment: <TimerIcon sx={{ mr: 1, color: 'primary.main' }} />,
                    sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Conferente"
                  value={formData.nomeConferente}
                  onChange={(e) => setFormData(prev => ({ ...prev, nomeConferente: e.target.value }))}
                  InputProps={{ 
                    startAdornment: <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />,
                    sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }
                  }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} mt={2}>
                  <Typography variant="h6" fontWeight="800" color="text.primary">
                    Produtos Recebidos
                  </Typography>
                  <Button
                    startIcon={<AddIcon />}
                    onClick={adicionarProduto}
                    variant="contained"
                    sx={{ 
                      borderRadius: '12px', 
                      fontWeight: 700, 
                      textTransform: 'none',
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                    }}
                  >
                    Novo Produto
                  </Button>
                </Box>
                
                <AnimatePresence>
                  {formData.produtos.map((produto, index) => (
                    <MotionCard 
                      key={produto.id} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      sx={{ 
                        mb: 3, 
                        borderRadius: 4,
                        ...glassStyles,
                        overflow: 'hidden'
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
                          <Chip 
                            label={`Produto ${index + 1}`} 
                            color="primary" 
                            size="small" 
                            sx={{ fontWeight: '800', borderRadius: '8px' }} 
                          />
                          {formData.produtos.length > 1 && (
                            <IconButton 
                              onClick={() => removerProduto(produto.id)} 
                              color="error" 
                              size="small"
                              sx={{ bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: '10px' }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Stack>
                        <Grid container spacing={3}>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Fabricante"
                              value={produto.nomeFabricante}
                              onChange={(e) => atualizarProduto(produto.id, 'nomeFabricante', e.target.value)}
                              InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.3) } }}
                            />
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <TextField
                              fullWidth
                              label="Descrição"
                              value={produto.descricaoProduto}
                              onChange={(e) => atualizarProduto(produto.id, 'descricaoProduto', e.target.value)}
                              InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.3) } }}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Lote"
                              value={produto.numeroLote}
                              onChange={(e) => atualizarProduto(produto.id, 'numeroLote', e.target.value)}
                              InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.3) } }}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Fabricação"
                              type="date"
                              value={produto.dataFabricacao}
                              onChange={(e) => atualizarProduto(produto.id, 'dataFabricacao', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.3) } }}
                            />
                          </Grid>
                          <Grid item xs={12} md={4}>
                            <TextField
                              fullWidth
                              label="Vencimento"
                              type="date"
                              value={produto.dataVencimento}
                              onChange={(e) => atualizarProduto(produto.id, 'dataVencimento', e.target.value)}
                              InputLabelProps={{ shrink: true }}
                              InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.3) } }}
                            />
                          </Grid>
                        </Grid>
                      </CardContent>
                    </MotionCard>
                  ))}
                </AnimatePresence>
              </Grid>
            </Grid>
          </MotionBox>
        );

      case 1:
        return (
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Typography variant="h6" fontWeight="800" color="text.primary" gutterBottom sx={{ mb: 3 }}>
              Códigos de Barras
            </Typography>
            <Grid container spacing={3}>
              {formData.produtos.map((produto, index) => (
                <Grid item xs={12} key={produto.id}>
                  <MotionCard sx={{ borderRadius: 4, ...glassStyles }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="subtitle1" fontWeight="800" color="primary.main" mb={3}>
                        {produto.descricaoProduto || `Produto ${index + 1}`}
                      </Typography>
                      <Grid container spacing={3}>
                        {['admProduto', 'codigoBarrasCaixaMaster', 'codigoBarrasCaixaInterna', 'codigoBarrasItem'].map((field) => (
                          <Grid item xs={12} md={6} key={field}>
                            <Stack direction="row" spacing={1.5}>
                              <TextField
                                fullWidth
                                label={field === 'admProduto' ? 'ADM' : field.replace('codigoBarras', 'Código ').replace('Caixa', ' Cx ')}
                                value={(produto as any)[field]}
                                onChange={(e) => atualizarProduto(produto.id, field as any, e.target.value)}
                                size="small"
                                InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                              />
                              <AndroidScanner
                                onScan={(codigo) => atualizarProduto(produto.id, field as any, codigo)}
                                onError={(error) => enqueueSnackbar(error, { variant: 'error' })}
                                buttonText=""
                                size="small"
                              />
                            </Stack>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </MotionCard>
                </Grid>
              ))}
            </Grid>
          </MotionBox>
        );

      case 2:
        return (
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Typography variant="h6" fontWeight="800" color="text.primary" gutterBottom sx={{ mb: 3 }}>
              Registro Fotográfico
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <MotionPaper sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderRadius: 4, 
                  border: '2px dashed', 
                  borderColor: alpha(theme.palette.primary.main, 0.2),
                  ...glassStyles
                }}>
                  <Typography variant="subtitle1" fontWeight="800" color="primary.main" mb={2}>Foto Geral do Recebimento</Typography>
                  <AndroidCamera
                    onCapture={(file) => {
                      setFormData(prev => ({ ...prev, fotoRecebimento: file }));
                      enqueueSnackbar('Foto capturada!', { variant: 'success' });
                    }}
                    onError={(error) => enqueueSnackbar(error, { variant: 'error' })}
                    currentFile={formData.fotoRecebimento}
                    buttonText="Capturar Recebimento"
                    size="large"
                  />
                </MotionPaper>
              </Grid>
              <Grid item xs={12} md={6}>
                <MotionPaper sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  borderRadius: 4, 
                  border: '2px dashed', 
                  borderColor: alpha(theme.palette.secondary.main, 0.2),
                  ...glassStyles
                }}>
                  <Typography variant="subtitle1" fontWeight="800" color="secondary.main" mb={2}>Foto da Devolução</Typography>
                  <AndroidCamera
                    onCapture={(file) => {
                      setFormData(prev => ({ ...prev, fotoDevolucao: file }));
                      enqueueSnackbar('Foto capturada!', { variant: 'success' });
                    }}
                    onError={(error) => enqueueSnackbar(error, { variant: 'error' })}
                    currentFile={formData.fotoDevolucao}
                    buttonText="Capturar Devolução"
                    variant="outlined"
                  />
                </MotionPaper>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 3, opacity: 0.6 }} />
                <Typography variant="h6" fontWeight="800" color="text.primary" mb={3}>Fotos Individuais dos Produtos</Typography>
              </Grid>
              
              {formData.produtos.map((produto, index) => (
                <Grid item xs={12} md={4} key={produto.id}>
                  <MotionPaper sx={{ 
                    p: 2.5, 
                    textAlign: 'center', 
                    borderRadius: 4, 
                    ...glassStyles,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`
                  }}>
                    <Typography variant="body2" fontWeight="800" color="text.primary" noWrap sx={{ mb: 0.5 }}>
                      {produto.descricaoProduto || `Produto ${index + 1}`}
                    </Typography>
                    <Typography variant="caption" fontWeight="600" color="text.secondary" display="block" mb={2}>
                      Lote: {produto.numeroLote || '---'}
                    </Typography>
                    <AndroidCamera
                      onCapture={(file) => {
                        setFormData(prev => ({
                          ...prev,
                          produtos: prev.produtos.map(p => p.id === produto.id ? { ...p, fotoProduto: file } : p)
                        }));
                        enqueueSnackbar('Foto do produto capturada!', { variant: 'success' });
                      }}
                      onError={(error) => enqueueSnackbar(error, { variant: 'error' })}
                      currentFile={produto.fotoProduto}
                      buttonText="Tirar Foto"
                      size="small"
                    />
                  </MotionPaper>
                </Grid>
              ))}
            </Grid>
          </MotionBox>
        );

      case 3:
        return (
          <MotionBox initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Typography variant="h6" fontWeight="800" color="text.primary" gutterBottom sx={{ mb: 3 }}>
              Questões de Conformidade
            </Typography>
            <Stack spacing={3}>
              <MotionCard sx={{ borderRadius: 4, ...glassStyles }}>
                <CardContent sx={{ p: 3 }}>
                  <Stack spacing={2.5}>
                    <FormControlLabel
                      control={<Checkbox checked={formData.recebimentoPocket} onChange={(e) => setFormData(prev => ({ ...prev, recebimentoPocket: e.target.checked }))} color="primary" />}
                      label={<Typography variant="body2" fontWeight="700">Recebimento realizado no pocket?</Typography>}
                    />
                    {!formData.recebimentoPocket && (
                      <TextField 
                        fullWidth 
                        label="Motivo" 
                        value={formData.motivoNaoPocket} 
                        onChange={(e) => setFormData(prev => ({ ...prev, motivoNaoPocket: e.target.value }))} 
                        multiline 
                        rows={2} 
                        InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                      />
                    )}
                    
                    <FormControlLabel
                      control={<Checkbox checked={formData.possuiCodigoBarras} onChange={(e) => setFormData(prev => ({ ...prev, possuiCodigoBarras: e.target.checked }))} color="primary" />}
                      label={<Typography variant="body2" fontWeight="700">Produto com código de barras cadastrado?</Typography>}
                    />
                    
                    <FormControlLabel
                      control={<Checkbox checked={formData.solicitouCadastroCodigoBarras} onChange={(e) => setFormData(prev => ({ ...prev, solicitouCadastroCodigoBarras: e.target.checked }))} color="primary" />}
                      label={<Typography variant="body2" fontWeight="700">Solicitou cadastro de código?</Typography>}
                    />
                    {formData.solicitouCadastroCodigoBarras && (
                      <TextField 
                        fullWidth 
                        label="Para quem?" 
                        value={formData.paraQuemSolicitou} 
                        onChange={(e) => setFormData(prev => ({ ...prev, paraQuemSolicitou: e.target.value }))} 
                        size="small" 
                        InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                      />
                    )}

                    <FormControlLabel
                      control={<Checkbox checked={formData.dadosLoteCadastradosSantri} onChange={(e) => setFormData(prev => ({ ...prev, dadosLoteCadastradosSantri: e.target.checked }))} color="primary" />}
                      label={<Typography variant="body2" fontWeight="700">Lote cadastrado no SANTRI?</Typography>}
                    />

                    <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                      <InputLabel>Condições das embalagens</InputLabel>
                      <Select
                        value={formData.condicaoEmbalagens}
                        onChange={(e) => setFormData(prev => ({ ...prev, condicaoEmbalagens: e.target.value as any }))}
                        label="Condições das embalagens"
                        sx={{ borderRadius: '12px', bgcolor: alpha('#fff', 0.5) }}
                      >
                        <MenuItem value="OTIMA">Ótima</MenuItem>
                        <MenuItem value="BOA">Boa</MenuItem>
                        <MenuItem value="RUIM">Ruim</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>
                </CardContent>
              </MotionCard>

              <MotionCard sx={{ borderRadius: 4, ...glassStyles, border: formData.houveRessalva ? `1px solid ${alpha(theme.palette.error.main, 0.3)}` : `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight="800" color="text.primary" mb={3}>Ressalvas e Devoluções</Typography>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" fontWeight="700" color="text.secondary" gutterBottom>Houve Ressalva?</Typography>
                      <Stack direction="row" spacing={2}>
                        <Button 
                          variant={formData.houveRessalva ? 'contained' : 'outlined'} 
                          color="error" 
                          onClick={() => setFormData(prev => ({ ...prev, houveRessalva: true }))}
                          fullWidth
                          sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
                        >SIM</Button>
                        <Button 
                          variant={!formData.houveRessalva ? 'contained' : 'outlined'} 
                          color="success" 
                          onClick={() => setFormData(prev => ({ ...prev, houveRessalva: false, descricaoRessalva: '', paraQuemInformouRessalva: '' }))}
                          fullWidth
                          sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
                        >NÃO</Button>
                      </Stack>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="body2" fontWeight="700" color="text.secondary" gutterBottom>Devolução de Itens?</Typography>
                      <Stack direction="row" spacing={2}>
                        <Button 
                          variant={formData.houveDevolucao ? 'contained' : 'outlined'} 
                          color="error" 
                          onClick={() => setFormData(prev => ({ ...prev, houveDevolucao: true }))}
                          fullWidth
                          sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
                        >SIM</Button>
                        <Button 
                          variant={!formData.houveDevolucao ? 'contained' : 'outlined'} 
                          color="success" 
                          onClick={() => setFormData(prev => ({ ...prev, houveDevolucao: false, itensDevolvidos: '', quantidadeDevolvida: 0 }))}
                          fullWidth
                          sx={{ borderRadius: '10px', fontWeight: 700, textTransform: 'none' }}
                        >NÃO</Button>
                      </Stack>
                    </Grid>

                    {formData.houveRessalva && (
                      <Grid item xs={12}>
                        <Stack spacing={2} sx={{ mt: 1, p: 3, bgcolor: alpha(theme.palette.error.main, 0.05), borderRadius: 3, border: `1px solid ${alpha(theme.palette.error.main, 0.1)}` }}>
                          <TextField 
                            fullWidth 
                            label="Descrição da Ressalva" 
                            value={formData.descricaoRessalva} 
                            onChange={(e) => setFormData(prev => ({ ...prev, descricaoRessalva: e.target.value }))} 
                            multiline 
                            rows={2} 
                            InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                          />
                          <TextField 
                            fullWidth 
                            label="Informado para" 
                            value={formData.paraQuemInformouRessalva} 
                            onChange={(e) => setFormData(prev => ({ ...prev, paraQuemInformouRessalva: e.target.value }))} 
                            size="small" 
                            InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                          />
                        </Stack>
                      </Grid>
                    )}

                    {formData.houveDevolucao && (
                      <Grid item xs={12}>
                        <Stack spacing={2} sx={{ mt: 1, p: 3, bgcolor: alpha(theme.palette.warning.main, 0.05), borderRadius: 3, border: `1px solid ${alpha(theme.palette.warning.main, 0.1)}` }}>
                          <TextField 
                            fullWidth 
                            label="Itens Devolvidos" 
                            value={formData.itensDevolvidos} 
                            onChange={(e) => setFormData(prev => ({ ...prev, itensDevolvidos: e.target.value }))} 
                            multiline 
                            rows={2} 
                            InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                          />
                          <TextField 
                            fullWidth 
                            label="Quantidade" 
                            type="number" 
                            value={formData.quantidadeDevolvida} 
                            onChange={(e) => setFormData(prev => ({ ...prev, quantidadeDevolvida: parseInt(e.target.value) || 0 }))} 
                            size="small" 
                            InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }}
                          />
                          <FormControlLabel control={<Checkbox checked={formData.notaDevolucaoEmitida} onChange={(e) => setFormData(prev => ({ ...prev, notaDevolucaoEmitida: e.target.checked }))} color="warning" />} label={<Typography variant="body2" fontWeight="700">Nota emitida?</Typography>} />
                          {formData.notaDevolucaoEmitida && <TextField fullWidth label="Nº Nota" value={formData.numeroNotaDevolucao} onChange={(e) => setFormData(prev => ({ ...prev, numeroNotaDevolucao: e.target.value }))} size="small" InputProps={{ sx: { borderRadius: '12px', bgcolor: alpha('#fff', 0.5) } }} />}
                        </Stack>
                      </Grid>
                    )}
                  </Grid>
                </CardContent>
              </MotionCard>
            </Stack>
          </MotionBox>
        );

      case 4:
        return (
          <MotionBox initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Stack spacing={4}>
              <MotionPaper 
                sx={{ 
                  p: 3, 
                  borderRadius: 4, 
                  ...glassStyles,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <Box sx={{ position: 'absolute', top: 0, left: 0, width: 4, height: '100%', bgcolor: 'primary.main' }} />
                <Typography variant="h6" fontWeight="800" color="primary.main" mb={3} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AssignmentIcon fontSize="small" />
                  Resumo Geral do Recebimento
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data/Hora</Typography>
                    <Typography variant="body1" fontWeight="800" color="text.primary">{formData.dataRecebimento} {formData.horarioRecebimento}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conferente</Typography>
                    <Typography variant="body1" fontWeight="800" color="text.primary">{formData.nomeConferente}</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total de Produtos</Typography>
                    <Typography variant="body1" fontWeight="800" color="text.primary">{formData.produtos.length} itens registrados</Typography>
                  </Grid>
                  <Grid item xs={6} md={3}>
                    <Typography variant="caption" fontWeight="700" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status de Ocorrências</Typography>
                    <Stack direction="row" spacing={1} mt={0.5}>
                      <Chip 
                        label={formData.houveRessalva ? 'Com Ressalva' : 'Sem Ressalva'} 
                        size="small" 
                        sx={{ 
                          fontWeight: 700, 
                          borderRadius: '6px',
                          bgcolor: formData.houveRessalva ? alpha(theme.palette.error.main, 0.1) : alpha(theme.palette.success.main, 0.1),
                          color: formData.houveRessalva ? 'error.main' : 'success.main',
                          border: `1px solid ${alpha(formData.houveRessalva ? theme.palette.error.main : theme.palette.success.main, 0.2)}`
                        }} 
                      />
                      <Chip 
                        label={formData.houveDevolucao ? 'Com Devolução' : 'Sem Devolução'} 
                        size="small" 
                        sx={{ 
                          fontWeight: 700, 
                          borderRadius: '6px',
                          bgcolor: formData.houveDevolucao ? alpha(theme.palette.warning.main, 0.1) : alpha(theme.palette.success.main, 0.1),
                          color: formData.houveDevolucao ? 'warning.main' : 'success.main',
                          border: `1px solid ${alpha(formData.houveDevolucao ? theme.palette.warning.main : theme.palette.success.main, 0.2)}`
                        }} 
                      />
                    </Stack>
                  </Grid>
                </Grid>
              </MotionPaper>

              {formData.alertaValidadeAutorizado && (
                <Alert 
                  severity="warning" 
                  variant="standard"
                  icon={<WarningIcon sx={{ color: theme.palette.warning.main }} />}
                  sx={{ 
                    borderRadius: '16px',
                    backdropFilter: 'blur(12px)',
                    backgroundColor: alpha(theme.palette.warning.main, 0.15),
                    color: theme.palette.warning.dark,
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                    '& .MuiAlert-icon': {
                      color: theme.palette.warning.main,
                    },
                    '& .MuiAlert-message': {
                      fontWeight: 500,
                    },
                    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="800" sx={{ color: theme.palette.warning.main, mb: 0.5 }}>
                    Autorização de Validade
                  </Typography>
                  <Typography variant="body2" fontWeight="600">
                    Autorizado por: <strong>{formData.nomeAutorizadorLider}</strong>
                  </Typography>
                  <Box mt={1.5} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {formData.produtosComAlertaValidade.map((p, i) => (
                      <Chip 
                        key={i} 
                        label={p} 
                        size="small" 
                        sx={{ 
                          borderRadius: '8px', 
                          fontWeight: 700, 
                          fontSize: '0.75rem',
                          backgroundColor: alpha(theme.palette.warning.main, 0.1),
                          color: theme.palette.warning.dark,
                          border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`
                        }} 
                      />
                    ))}
                  </Box>
                </Alert>
              )}

              <Box>
                <Typography variant="subtitle1" fontWeight="800" color="text.primary" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InventoryIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  Detalhamento dos Produtos
                </Typography>
                <Grid container spacing={2}>
                  {formData.produtos.map((p, i) => (
                    <Grid item xs={12} md={6} key={p.id}>
                      <MotionCard 
                        sx={{ 
                          borderRadius: 4, 
                          ...glassStyles,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: `0 12px 24px ${alpha(theme.palette.common.black, 0.1)}`
                          }
                        }}
                      >
                        <CardContent sx={{ p: 2.5 }}>
                          <Stack direction="row" spacing={2} alignItems="flex-start">
                            <Box sx={{ 
                              width: 40, 
                              height: 40, 
                              borderRadius: 2, 
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'primary.main',
                              fontWeight: 800,
                              flexShrink: 0
                            }}>
                              {i + 1}
                            </Box>
                            <Box sx={{ flexGrow: 1 }}>
                              <Typography variant="subtitle1" fontWeight="800" color="text.primary" lineHeight={1.2} mb={1}>
                                {p.descricaoProduto || 'Produto sem descrição'}
                              </Typography>
                              
                              <Grid container spacing={1} mb={2}>
                                <Grid item xs={6}>
                                  <Typography variant="caption" fontWeight="700" color="text.secondary" display="block">LOTE</Typography>
                                  <Typography variant="body2" fontWeight="800">{p.numeroLote || '---'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                  <Typography variant="caption" fontWeight="700" color="text.secondary" display="block">VENCIMENTO</Typography>
                                  <Typography variant="body2" fontWeight="800" color={p.dataVencimento ? 'text.primary' : 'error.main'}>
                                    {p.dataVencimento || 'Não informado'}
                                  </Typography>
                                </Grid>
                              </Grid>

                              <Stack direction="row" spacing={1}>
                                <Chip 
                                  icon={<PhotoCameraIcon sx={{ fontSize: '14px !important' }} />}
                                  label={p.fotoProduto ? 'Foto OK' : 'Sem Foto'} 
                                  size="small" 
                                  sx={{ 
                                    borderRadius: '6px', 
                                    fontWeight: 700,
                                    bgcolor: p.fotoProduto ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.error.main, 0.1),
                                    color: p.fotoProduto ? 'success.main' : 'error.main',
                                    border: 'none'
                                  }} 
                                />
                                <Chip 
                                  icon={<QrCodeScannerIcon sx={{ fontSize: '14px !important' }} />}
                                  label={p.admProduto ? 'ADM OK' : 'Sem ADM'} 
                                  size="small" 
                                  sx={{ 
                                    borderRadius: '6px', 
                                    fontWeight: 700,
                                    bgcolor: p.admProduto ? alpha(theme.palette.success.main, 0.1) : alpha(theme.palette.warning.main, 0.1),
                                    color: p.admProduto ? 'success.main' : 'warning.main',
                                    border: 'none'
                                  }} 
                                />
                              </Stack>
                            </Box>
                          </Stack>
                        </CardContent>
                      </MotionCard>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Stack>
          </MotionBox>
        );

      default:
        return null;
    }
  };

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Checklist', path: '/checklist-recebimento' },
          { label: 'Novo' }
        ]}
      >
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between', 
            alignItems: { xs: 'flex-start', sm: 'center' }, 
            mb: 4,
            gap: 2,
            p: 3,
            borderRadius: 4,
            ...glassStyles
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ 
              bgcolor: 'primary.main', 
              p: 1.5, 
              borderRadius: 3, 
              boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            }}>
              <AssignmentIcon sx={{ color: 'white', fontSize: 32 }} />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.02em', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                Checklist Recebimento
              </Typography>
              <Typography variant="body2" color="text.secondary" fontWeight="500">
                Registro completo de entrada de mercadorias
              </Typography>
            </Box>
          </Box>
        </MotionBox>

        <MotionPaper
          elevation={0}
          sx={{
            p: { xs: 2, md: 4 },
            borderRadius: 5,
            ...glassStyles,
            position: 'relative',
            overflow: 'visible'
          }}
        >
          <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 4, bgcolor: 'primary.main', opacity: 0.1, borderRadius: '5px 5px 0 0' }} />
          
          {!isMobile ? (
            <Stepper activeStep={activeStep} sx={{ mb: 5 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel
                    StepIconProps={{
                      sx: {
                        '&.Mui-active': { color: 'primary.main' },
                        '&.Mui-completed': { color: 'success.main' },
                      }
                    }}
                  >
                    <Typography variant="body2" fontWeight="700">{label}</Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          ) : (
            <Box sx={{ mb: 4 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" fontWeight="800" color="primary.main" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Passo {activeStep + 1} de {steps.length}
                </Typography>
                <Typography variant="subtitle2" fontWeight="800" color="text.primary">
                  {steps[activeStep]}
                </Typography>
              </Stack>
              <Box sx={{ height: 6, bgcolor: alpha(theme.palette.primary.main, 0.1), borderRadius: 3, overflow: 'hidden' }}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{ height: '100%', backgroundColor: theme.palette.primary.main, borderRadius: 3 }}
                />
              </Box>
            </Box>
          )}

          <Box sx={{ minHeight: 400 }}>
            {renderStepContent(activeStep)}
          </Box>

          <Stack 
            direction={{ xs: 'column-reverse', md: 'row' }} 
            spacing={2} 
            justifyContent="space-between" 
            sx={{ mt: 5, pt: 3, borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}
          >
            <Button
              variant="outlined"
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBackIcon />}
              sx={{ 
                borderRadius: '12px', 
                px: 4, 
                py: 1.5,
                fontWeight: 700,
                textTransform: 'none',
                borderWidth: '2px',
                '&:hover': { borderWidth: '2px' }
              }}
              fullWidth={isMobile}
            >
              Voltar
            </Button>
            
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                sx={{ 
                  borderRadius: '12px', 
                  px: 4, 
                  py: 1.5, 
                  fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    boxShadow: '0 10px 25px rgba(16, 185, 129, 0.4)',
                  }
                }}
                fullWidth={isMobile}
              >
                {saving ? 'Salvando...' : 'Finalizar Checklist'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForwardIcon />}
                sx={{ 
                  borderRadius: '12px', 
                  px: 4, 
                  py: 1.5,
                  fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                  boxShadow: '0 8px 20px rgba(37, 99, 235, 0.3)',
                }}
                fullWidth={isMobile}
              >
                Próximo
              </Button>
            )}
          </Stack>
        </MotionPaper>
      </ResponsiveContainer>

      
    </ProtectedRoute>
  );
}

const CustomAvatar = ({ children, sx }: any) => {
  const theme = useTheme();
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      borderRadius: '12px',
      ...sx 
    }}>
      {children}
    </Box>
  );
};

export default ChecklistRecebimentoPage;
