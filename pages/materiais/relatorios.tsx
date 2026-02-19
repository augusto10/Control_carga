import { useState } from 'react';
import {
  Box,
  Button,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  alpha,
  Stack,
  Container,
  Avatar,
  useTheme,
  Tooltip,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon,
  Group as GroupIcon,
  Inventory as InventoryIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
 
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { useSnackbar } from 'notistack';
import api from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import ProtectedRoute from '@/components/ProtectedRoute';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

interface TotalPorMaterial {
  materialId: string;
  materialNome: string;
  unidadeMedida: string;
  quantidadeTotal: number;
  quantidadeSolicitacoes: number;
}

interface TotalPorSolicitante {
  solicitanteId: string;
  solicitanteNome: string;
  quantidadeSolicitacoes: number;
  quantidadeMateriaisDistintos: number;
}

interface Resumo {
  totalSolicitacoes: number;
  totalMateriais: number;
  totalSolicitantes: number;
}

interface RelatorioData {
  totaisPorMaterial: TotalPorMaterial[];
  totaisPorSolicitante: TotalPorSolicitante[];
  resumo: Resumo;
}

export default function RelatoriosMateriais() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState(
    format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
  );
  const [dataFim, setDataFim] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [relatorio, setRelatorio] = useState<RelatorioData | null>(null);

  const handleBuscar = async () => {
    if (!dataInicio || !dataFim) {
      enqueueSnackbar('Informe o período', { variant: 'warning' });
      return;
    }

    try {
      setLoading(true);
      const response = await api.get('/api/relatorios/materiais', {
        params: { dataInicio, dataFim }
      });
      setRelatorio(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Erro ao gerar relatório', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = () => {
    if (!relatorio) return;

    // Gerar CSV
    let csv = 'RELATÓRIO DE MATERIAIS\n\n';
    csv += `Período: ${format(new Date(dataInicio), 'dd/MM/yyyy', { locale: ptBR })} a ${format(new Date(dataFim), 'dd/MM/yyyy', { locale: ptBR })}\n\n`;
    
    csv += 'RESUMO\n';
    csv += `Total de Solicitações:,${relatorio.resumo.totalSolicitacoes}\n`;
    csv += `Total de Materiais:,${relatorio.resumo.totalMateriais}\n`;
    csv += `Total de Solicitantes:,${relatorio.resumo.totalSolicitantes}\n\n`;

    csv += 'CONSUMO POR MATERIAL\n';
    csv += 'Material,Unidade,Quantidade Total,Nº Solicitações\n';
    relatorio.totaisPorMaterial.forEach(item => {
      csv += `${item.materialNome},${item.unidadeMedida},${item.quantidadeTotal},${item.quantidadeSolicitacoes}\n`;
    });

    csv += '\nCONSUMO POR FUNCIONÁRIO\n';
    csv += 'Funcionário,Nº Solicitações,Materiais Distintos\n';
    relatorio.totaisPorSolicitante.forEach(item => {
      csv += `${item.solicitanteNome},${item.quantidadeSolicitacoes},${item.quantidadeMateriaisDistintos}\n`;
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_materiais_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    link.click();

    enqueueSnackbar('Relatório exportado com sucesso!', { variant: 'success' });
  };

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Materiais', path: '/materiais' },
          { label: 'Relatórios' }
        ]}
      >
        <MotionBox
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{ mb: 4 }}
        >
            <Stack 
              direction={{ xs: 'column', md: 'row' }} 
              justifyContent="space-between" 
              alignItems={{ xs: 'flex-start', md: 'center' }}
              spacing={2}
            >
              <Stack direction="row" alignItems="center" spacing={2}>
                <Avatar sx={{ 
                  bgcolor: 'primary.main', 
                  width: 56, 
                  height: 56, 
                  boxShadow: '0 8px 16px rgba(37, 99, 235, 0.2)',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
                }}>
                  <AssessmentIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="800" color="#1e293b" sx={{ fontSize: { xs: '1.5rem', md: '2.125rem' } }}>
                    Relatórios de Materiais
                  </Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight="500">
                    Analise o consumo e distribuição de materiais
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </MotionBox>

          {/* Filtros */}
          <MotionPaper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              mb: 4,
              borderRadius: '24px',
              border: '1px solid',
              borderColor: alpha('#e2e8f0', 0.6),
              bgcolor: 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
            }}
          >
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data Início"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="date"
                  label="Data Fim"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                  onClick={handleBuscar}
                  disabled={loading}
                  size="large"
                  sx={{ 
                    height: 56, 
                    borderRadius: '12px', 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                  }}
                >
                  {loading ? 'Gerando...' : 'Gerar Relatório'}
                </Button>
              </Grid>
            </Grid>
          </MotionPaper>

          {/* Resultados */}
          <AnimatePresence>
            {relatorio && (
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                {/* Resumo */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} md={4}>
                    <MotionPaper
                      whileHover={{ y: -5 }}
                      sx={{ 
                        p: 3, 
                        borderRadius: '24px', 
                        border: '1px solid', 
                        borderColor: alpha('#e2e8f0', 0.6),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', width: 56, height: 56 }}>
                        <AssignmentIcon />
                      </Avatar>
                      <Box>
                        <Typography color="text.secondary" variant="body2" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                          Solicitações
                        </Typography>
                        <Typography variant="h4" fontWeight="800" color="#1e293b">
                          {relatorio.resumo.totalSolicitacoes}
                        </Typography>
                      </Box>
                    </MotionPaper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <MotionPaper
                      whileHover={{ y: -5 }}
                      sx={{ 
                        p: 3, 
                        borderRadius: '24px', 
                        border: '1px solid', 
                        borderColor: alpha('#e2e8f0', 0.6),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: 'success.main', width: 56, height: 56 }}>
                        <InventoryIcon />
                      </Avatar>
                      <Box>
                        <Typography color="text.secondary" variant="body2" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                          Materiais Diferentes
                        </Typography>
                        <Typography variant="h4" fontWeight="800" color="#1e293b">
                          {relatorio.resumo.totalMateriais}
                        </Typography>
                      </Box>
                    </MotionPaper>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <MotionPaper
                      whileHover={{ y: -5 }}
                      sx={{ 
                        p: 3, 
                        borderRadius: '24px', 
                        border: '1px solid', 
                        borderColor: alpha('#e2e8f0', 0.6),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2
                      }}
                    >
                      <Avatar sx={{ bgcolor: alpha(theme.palette.warning.main, 0.1), color: 'warning.main', width: 56, height: 56 }}>
                        <GroupIcon />
                      </Avatar>
                      <Box>
                        <Typography color="text.secondary" variant="body2" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                          Funcionários
                        </Typography>
                        <Typography variant="h4" fontWeight="800" color="#1e293b">
                          {relatorio.resumo.totalSolicitantes}
                        </Typography>
                      </Box>
                    </MotionPaper>
                  </Grid>
                </Grid>

                {/* Botão Exportar */}
                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={handleExportar}
                    sx={{ 
                      borderRadius: '12px', 
                      fontWeight: 700,
                      px: 3,
                      borderWidth: 2,
                      '&:hover': { borderWidth: 2 }
                    }}
                  >
                    Exportar CSV
                  </Button>
                </Box>

                <Grid container spacing={3}>
                  {/* Consumo por Material */}
                  <Grid item xs={12} lg={7}>
                    <MotionPaper
                      sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: '24px',
                        border: '1px solid',
                        borderColor: alpha('#e2e8f0', 0.6),
                        height: '100%'
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                        <InventoryIcon color="primary" />
                        <Typography variant="h6" fontWeight="800" color="#1e293b">
                          Consumo por Material
                        </Typography>
                      </Stack>
                      
                      {relatorio.totaisPorMaterial.length === 0 ? (
                        <Alert 
                          severity="info" 
                          variant="standard"
                          sx={{ 
                            borderRadius: '16px',
                            backdropFilter: 'blur(12px)',
                            backgroundColor: alpha(theme.palette.info.main, 0.15),
                            color: theme.palette.info.dark,
                            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                            '& .MuiAlert-icon': {
                              color: theme.palette.info.main,
                            },
                            fontWeight: 600,
                          }}
                        >
                          Nenhum material consumido no período
                        </Alert>
                      ) : (
                        <TableContainer sx={{ border: '1px solid', borderColor: alpha('#e2e8f0', 0.6), borderRadius: '16px' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: alpha('#f8fafc', 0.8) }}>
                                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Material</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Unidade</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Quantidade</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Solicit.</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {relatorio.totaisPorMaterial
                                .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal)
                                .map((item, index) => (
                                  <MotionTableRow 
                                    key={item.materialId}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    hover
                                  >
                                    <TableCell sx={{ fontWeight: 600 }}>{item.materialNome}</TableCell>
                                    <TableCell align="center">
                                      <Typography variant="caption" fontWeight="700" sx={{ px: 1, py: 0.5, bgcolor: alpha('#e2e8f0', 0.5), borderRadius: '6px' }}>
                                        {item.unidadeMedida}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography variant="body2" fontWeight="800" color="primary.main">
                                        {item.quantidadeTotal}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography variant="body2" fontWeight="600" color="text.secondary">
                                        {item.quantidadeSolicitacoes}
                                      </Typography>
                                    </TableCell>
                                  </MotionTableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </MotionPaper>
                  </Grid>

                  {/* Consumo por Funcionário */}
                  <Grid item xs={12} lg={5}>
                    <MotionPaper
                      sx={{
                        p: { xs: 2, md: 3 },
                        borderRadius: '24px',
                        border: '1px solid',
                        borderColor: alpha('#e2e8f0', 0.6),
                        height: '100%'
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1} mb={3}>
                        <GroupIcon color="primary" />
                        <Typography variant="h6" fontWeight="800" color="#1e293b">
                          Consumo por Funcionário
                        </Typography>
                      </Stack>
                      
                      {relatorio.totaisPorSolicitante.length === 0 ? (
                        <Alert 
                          severity="info" 
                          variant="standard"
                          sx={{ 
                            borderRadius: '16px',
                            backdropFilter: 'blur(12px)',
                            backgroundColor: alpha(theme.palette.info.main, 0.15),
                            color: theme.palette.info.dark,
                            border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                            '& .MuiAlert-icon': {
                              color: theme.palette.info.main,
                            },
                            fontWeight: 600,
                          }}
                        >
                          Nenhuma solicitação no período
                        </Alert>
                      ) : (
                        <TableContainer sx={{ border: '1px solid', borderColor: alpha('#e2e8f0', 0.6), borderRadius: '16px' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={{ bgcolor: alpha('#f8fafc', 0.8) }}>
                                <TableCell sx={{ fontWeight: 700, color: '#475569' }}>Funcionário</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Solicit.</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>Itens</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {relatorio.totaisPorSolicitante
                                .sort((a, b) => b.quantidadeSolicitacoes - a.quantidadeSolicitacoes)
                                .map((item, index) => (
                                  <MotionTableRow 
                                    key={item.solicitanteId}
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    hover
                                  >
                                    <TableCell sx={{ fontWeight: 600 }}>{item.solicitanteNome}</TableCell>
                                    <TableCell align="center">
                                      <Typography variant="body2" fontWeight="800" color="primary.main">
                                        {item.quantidadeSolicitacoes}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                      <Typography variant="body2" fontWeight="600" color="text.secondary">
                                        {item.quantidadeMateriaisDistintos}
                                      </Typography>
                                    </TableCell>
                                  </MotionTableRow>
                                ))}
                            </TableBody>
                          </Table>
                        </TableContainer>
                      )}
                    </MotionPaper>
                  </Grid>
                </Grid>
              </MotionBox>
            )}
          </AnimatePresence>
      </ResponsiveContainer>
    </ProtectedRoute>
  );
}
