import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  MenuItem,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Divider,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  alpha,
  useTheme
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Factory as FactoryIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  TrendingDown as TrendingDownIcon,
  ExpandMore as ExpandMoreIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { format, differenceInDays, differenceInMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ProtectedRoute from '../../components/ProtectedRoute';

interface RelatorioItem {
  id: string;
  dataCriacao: string;
  dataRecebimento: string;
  nomeConferente: string;
  nomeFabricante: string;
  descricaoProduto: string;
  numeroLote: string;
  dataFabricacao: string;
  dataValidade: string;
  alertaValidadeAutorizado: boolean;
  nomeAutorizadorLider?: string;
  produtosComAlertaValidade?: string;
  mesesParaVencimento: number;
  diasParaVencimento: number;
  statusVencimento: 'VENCIDO' | 'CRITICO' | 'ALERTA' | 'OK';
}

interface FabricanteOcorrencia {
  fabricante: string;
  totalProdutos: number;
  produtosComAlerta: number;
  percentualAlerta: number;
  ultimaOcorrencia: string;
}

interface ConferenteEstatistica {
  conferente: string;
  totalChecklists: number;
  checklistsComAlerta: number;
  percentualAlerta: number;
}

const RelatoriosAvancados = () => {
  const theme = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  
  // Estados para dados
  const [relatorios, setRelatorios] = useState<RelatorioItem[]>([]);
  const [fabricantesOcorrencias, setFabricantesOcorrencias] = useState<FabricanteOcorrencia[]>([]);
  const [conferentesEstatisticas, setConferentesEstatisticas] = useState<ConferenteEstatistica[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    conferente: '',
    fabricante: '',
    statusVencimento: '',
    apenasComAlerta: false
  });
  
  // Estados para listas de filtros
  const [conferentes, setConferentes] = useState<string[]>([]);
  const [fabricantes, setFabricantes] = useState<string[]>([]);
  
  // Estados para estatísticas
  const [estatisticas, setEstatisticas] = useState({
    totalProdutos: 0,
    produtosVencidos: 0,
    produtosCriticos: 0,
    produtosAlerta: 0,
    produtosOk: 0,
    percentualComProblemas: 0
  });

  // Função para calcular status de vencimento
  const calcularStatusVencimento = (dataValidade: string): { status: string; meses: number; dias: number } => {
    const hoje = new Date();
    const vencimento = parseISO(dataValidade);
    const diasRestantes = differenceInDays(vencimento, hoje);
    const mesesRestantes = differenceInMonths(vencimento, hoje);
    
    let status = 'OK';
    if (diasRestantes < 0) {
      status = 'VENCIDO';
    } else if (mesesRestantes < 2) {
      status = 'CRITICO';
    } else if (mesesRestantes < 8) {
      status = 'ALERTA';
    }
    
    return { status, meses: mesesRestantes, dias: diasRestantes };
  };

  // Função para buscar relatórios
  const buscarRelatorios = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
      if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
      if (filtros.conferente) params.append('conferente', filtros.conferente);
      if (filtros.fabricante) params.append('fabricante', filtros.fabricante);
      if (filtros.apenasComAlerta) params.append('alertaValidade', 'true');
      
      const response = await fetch(`/api/checklist-recebimento?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        // Processar dados com informações de vencimento
        const relatoriossProcessados = data.checklists.map((item: any) => {
          const { status, meses, dias } = calcularStatusVencimento(item.dataValidade);
          return {
            ...item,
            mesesParaVencimento: meses,
            diasParaVencimento: dias,
            statusVencimento: status
          };
        });
        
        setRelatorios(relatoriossProcessados);
        calcularEstatisticas(relatoriossProcessados);
        processarFabricantesOcorrencias(relatoriossProcessados);
        processarConferentesEstatisticas(relatoriossProcessados);
      }
    } catch (error) {
      console.error('Erro ao buscar relatórios:', error);
    } finally {
      setLoading(false);
    }
  };

  // Função para calcular estatísticas gerais
  const calcularEstatisticas = (dados: RelatorioItem[]) => {
    const total = dados.length;
    const vencidos = dados.filter(item => item.statusVencimento === 'VENCIDO').length;
    const criticos = dados.filter(item => item.statusVencimento === 'CRITICO').length;
    const alerta = dados.filter(item => item.statusVencimento === 'ALERTA').length;
    const ok = dados.filter(item => item.statusVencimento === 'OK').length;
    
    setEstatisticas({
      totalProdutos: total,
      produtosVencidos: vencidos,
      produtosCriticos: criticos,
      produtosAlerta: alerta,
      produtosOk: ok,
      percentualComProblemas: total > 0 ? Math.round(((vencidos + criticos + alerta) / total) * 100) : 0
    });
  };

  // Função para processar ocorrências por fabricante
  const processarFabricantesOcorrencias = (dados: RelatorioItem[]) => {
    const fabricantesMap = new Map<string, any>();
    
    dados.forEach(item => {
      const fabricante = item.nomeFabricante;
      if (!fabricantesMap.has(fabricante)) {
        fabricantesMap.set(fabricante, {
          fabricante,
          totalProdutos: 0,
          produtosComAlerta: 0,
          ultimaOcorrencia: item.dataCriacao
        });
      }
      
      const fab = fabricantesMap.get(fabricante);
      fab.totalProdutos++;
      
      if (item.statusVencimento !== 'OK' || item.alertaValidadeAutorizado) {
        fab.produtosComAlerta++;
      }
      
      // Atualizar última ocorrência
      if (new Date(item.dataCriacao) > new Date(fab.ultimaOcorrencia)) {
        fab.ultimaOcorrencia = item.dataCriacao;
      }
    });
    
    const fabricantesArray = Array.from(fabricantesMap.values()).map(fab => ({
      ...fab,
      percentualAlerta: fab.totalProdutos > 0 ? Math.round((fab.produtosComAlerta / fab.totalProdutos) * 100) : 0
    }));
    
    // Ordenar por percentual de alerta (maior primeiro)
    fabricantesArray.sort((a, b) => b.percentualAlerta - a.percentualAlerta);
    
    setFabricantesOcorrencias(fabricantesArray);
  };

  // Função para processar estatísticas por conferente
  const processarConferentesEstatisticas = (dados: RelatorioItem[]) => {
    const conferentesMap = new Map<string, any>();
    
    dados.forEach(item => {
      const conferente = item.nomeConferente;
      if (!conferentesMap.has(conferente)) {
        conferentesMap.set(conferente, {
          conferente,
          totalChecklists: 0,
          checklistsComAlerta: 0
        });
      }
      
      const conf = conferentesMap.get(conferente);
      conf.totalChecklists++;
      
      if (item.statusVencimento !== 'OK' || item.alertaValidadeAutorizado) {
        conf.checklistsComAlerta++;
      }
    });
    
    const conferentesArray = Array.from(conferentesMap.values()).map(conf => ({
      ...conf,
      percentualAlerta: conf.totalChecklists > 0 ? Math.round((conf.checklistsComAlerta / conf.totalChecklists) * 100) : 0
    }));
    
    setConferentesEstatisticas(conferentesArray);
  };

  // Função para limpar filtros
  const handleClearFilters = () => {
    setFiltros({
      dataInicio: '',
      dataFim: '',
      conferente: '',
      fabricante: '',
      statusVencimento: '',
      apenasComAlerta: false
    });
  };

  // Função para buscar listas para filtros
  const buscarListasFiltros = async () => {
    try {
      const response = await fetch('/api/checklist-recebimento?getFilters=true');
      const data = await response.json();
      
      if (data.success) {
        setConferentes(data.conferentes || []);
        setFabricantes(data.fabricantes || []);
      }
    } catch (error) {
      console.error('Erro ao buscar listas de filtros:', error);
    }
  };

  // Função para exportar relatório
  const exportarRelatorio = () => {
    const csvContent = [
      ['Produto', 'Fabricante', 'Lote', 'Data Validade', 'Meses para Vencer', 'Status', 'Conferente', 'Data Recebimento'].join(','),
      ...relatorios.map(item => [
        item.descricaoProduto,
        item.nomeFabricante,
        item.numeroLote,
        format(parseISO(item.dataValidade), 'dd/MM/yyyy'),
        item.mesesParaVencimento,
        item.statusVencimento,
        item.nomeConferente,
        format(parseISO(item.dataRecebimento), 'dd/MM/yyyy')
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-validade-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  // Função para obter cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'VENCIDO': return 'error';
      case 'CRITICO': return 'warning';
      case 'ALERTA': return 'info';
      case 'OK': return 'success';
      default: return 'default';
    }
  };

  // Função para obter texto do status
  const getStatusText = (status: string) => {
    switch (status) {
      case 'VENCIDO': return 'Vencido';
      case 'CRITICO': return 'Crítico (<2 meses)';
      case 'ALERTA': return 'Alerta (<8 meses)';
      case 'OK': return 'OK (>8 meses)';
      default: return status;
    }
  };

  useEffect(() => {
    buscarListasFiltros();
    buscarRelatorios();
  }, []);

  // Aplicar filtros automaticamente com debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      buscarRelatorios();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [filtros]);

  return (
    <ProtectedRoute>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700, color: 'primary.main' }}>
            <AssessmentIcon sx={{ mr: 2, fontSize: 40 }} />
            Relatórios Avançados de Validade
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Análise completa de produtos próximos ao vencimento e ocorrências por fabricante
          </Typography>
        </Box>

        {/* Filtros */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterIcon sx={{ mr: 1 }} />
            Filtros de Pesquisa
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Conferente</InputLabel>
                <Select
                  value={filtros.conferente}
                  label="Conferente"
                  onChange={(e) => setFiltros({ ...filtros, conferente: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {conferentes.map(conferente => (
                    <MenuItem key={conferente} value={conferente}>{conferente}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Fabricante</InputLabel>
                <Select
                  value={filtros.fabricante}
                  label="Fabricante"
                  onChange={(e) => setFiltros({ ...filtros, fabricante: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {fabricantes.map(fabricante => (
                    <MenuItem key={fabricante} value={fabricante}>{fabricante}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status Vencimento</InputLabel>
                <Select
                  value={filtros.statusVencimento}
                  label="Status Vencimento"
                  onChange={(e) => setFiltros({ ...filtros, statusVencimento: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="VENCIDO">Vencidos</MenuItem>
                  <MenuItem value="CRITICO">Críticos (&lt;2 meses)</MenuItem>
                  <MenuItem value="ALERTA">Alerta (&lt;8 meses)</MenuItem>
                  <MenuItem value="OK">OK (&gt;8 meses)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={buscarRelatorios}
                disabled={loading}
                sx={{ height: 56 }}
              >
                {loading ? 'Carregando...' : 'Buscar'}
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportarRelatorio}
                disabled={relatorios.length === 0}
                sx={{ height: 56 }}
              >
                Exportar CSV
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                fullWidth
                variant="text"
                onClick={handleClearFilters}
                sx={{ height: 56 }}
              >
                Limpar Filtros
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Cards de Estatísticas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AssessmentIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {estatisticas.totalProdutos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total de Produtos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ErrorIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                  {estatisticas.produtosVencidos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Vencidos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <WarningIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  {estatisticas.produtosCriticos}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Críticos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ScheduleIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {estatisticas.produtosAlerta}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Em Alerta
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {estatisticas.produtosOk}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  OK
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Alertas de Resumo */}
        {estatisticas.percentualComProblemas > 0 && (
          <Alert 
            severity={estatisticas.percentualComProblemas > 50 ? 'error' : 'warning'} 
            variant="standard"
            sx={{ 
              mb: 4,
              borderRadius: '16px',
              backdropFilter: 'blur(12px)',
              backgroundColor: alpha(theme.palette[estatisticas.percentualComProblemas > 50 ? 'error' : 'warning'].main, 0.15),
              color: theme.palette[estatisticas.percentualComProblemas > 50 ? 'error' : 'warning'].dark,
              border: `1px solid ${alpha(theme.palette[estatisticas.percentualComProblemas > 50 ? 'error' : 'warning'].main, 0.3)}`,
              '& .MuiAlert-icon': {
                color: theme.palette[estatisticas.percentualComProblemas > 50 ? 'error' : 'warning'].main,
              },
              boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
              fontWeight: 600,
            }}
          >
            <Typography variant="h6" fontWeight="800">
              Atenção: {estatisticas.percentualComProblemas}% dos produtos têm problemas de validade
            </Typography>
            <Typography variant="body2" fontWeight="500">
              {estatisticas.produtosVencidos > 0 && `${estatisticas.produtosVencidos} produtos vencidos, `}
              {estatisticas.produtosCriticos > 0 && `${estatisticas.produtosCriticos} produtos críticos, `}
              {estatisticas.produtosAlerta > 0 && `${estatisticas.produtosAlerta} produtos em alerta`}
            </Typography>
          </Alert>
        )}

        {/* Accordions com Relatórios */}
        <Grid container spacing={3}>
          {/* Produtos Próximos ao Vencimento */}
          <Grid item xs={12}>
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <ScheduleIcon sx={{ mr: 1 }} />
                  Produtos Próximos ao Vencimento
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Produto</TableCell>
                        <TableCell>Fabricante</TableCell>
                        <TableCell>Lote</TableCell>
                        <TableCell>Data Validade</TableCell>
                        <TableCell>Tempo Restante</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Conferente</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {relatorios
                        .filter(item => item.statusVencimento !== 'OK')
                        .slice(0, 10)
                        .map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.descricaoProduto}</TableCell>
                          <TableCell>{item.nomeFabricante}</TableCell>
                          <TableCell>{item.numeroLote}</TableCell>
                          <TableCell>
                            {format(parseISO(item.dataValidade), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>
                            {item.diasParaVencimento < 0 
                              ? `Vencido há ${Math.abs(item.diasParaVencimento)} dias`
                              : item.mesesParaVencimento < 1
                                ? `${item.diasParaVencimento} dias`
                                : `${item.mesesParaVencimento} meses`
                            }
                          </TableCell>
                          <TableCell>
                            <Chip 
                              label={getStatusText(item.statusVencimento)} 
                              color={getStatusColor(item.statusVencimento) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{item.nomeConferente}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Fabricantes com Ocorrências */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <FactoryIcon sx={{ mr: 1 }} />
                  Fabricantes com Ocorrências
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Fabricante</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell align="center">Com Alerta</TableCell>
                        <TableCell align="center">%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {fabricantesOcorrencias.slice(0, 10).map((fab) => (
                        <TableRow key={fab.fabricante}>
                          <TableCell>{fab.fabricante}</TableCell>
                          <TableCell align="center">{fab.totalProdutos}</TableCell>
                          <TableCell align="center">{fab.produtosComAlerta}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${fab.percentualAlerta}%`}
                              color={fab.percentualAlerta > 50 ? 'error' : fab.percentualAlerta > 20 ? 'warning' : 'success'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Grid>

          {/* Estatísticas por Conferente */}
          <Grid item xs={12} md={6}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 1 }} />
                  Estatísticas por Conferente
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Conferente</TableCell>
                        <TableCell align="center">Total</TableCell>
                        <TableCell align="center">Com Alerta</TableCell>
                        <TableCell align="center">%</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {conferentesEstatisticas.map((conf) => (
                        <TableRow key={conf.conferente}>
                          <TableCell>{conf.conferente}</TableCell>
                          <TableCell align="center">{conf.totalChecklists}</TableCell>
                          <TableCell align="center">{conf.checklistsComAlerta}</TableCell>
                          <TableCell align="center">
                            <Chip 
                              label={`${conf.percentualAlerta}%`}
                              color={conf.percentualAlerta > 30 ? 'warning' : 'success'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          </Grid>
        </Grid>
      </Box>
    </ProtectedRoute>
  );
};

export default RelatoriosAvancados;
