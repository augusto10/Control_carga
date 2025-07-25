import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  useMediaQuery,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Assessment as ReportIcon,
  LocalShipping as TruckIcon,
  Receipt as ReceiptIcon,
  Visibility as ViewIcon,
  GetApp as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`painel-tabpanel-${index}`}
      aria-labelledby={`painel-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const PainelGerencial: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [funcionarios, setFuncionarios] = useState([]);
  const [controles, setControles] = useState([]);
  
  /**
   * DOMÍNIO DE PEDIDOS - EXPLICAÇÃO DETALHADA
   * 
   * O domínio de PEDIDOS é completamente separado e distinto do domínio de NOTAS FISCAIS.
   * São dois processos logísticos diferentes:
   * 
   * 1. NOTAS FISCAIS (Controle de Carga):
   *    - Documentos fiscais que acompanham mercadorias
   *    - Usadas para controle de transporte e entrega
   *    - Vinculadas a controles de carga para motoristas
   *    - Processo: Criação → Vinculação ao Controle → Transporte → Assinatura → Finalização
   * 
   * 2. PEDIDOS (Separação e Conferência):
   *    - Solicitações internas de produtos para separação no estoque
   *    - Processo de picking/separação de itens
   *    - Conferência/auditoria dos itens separados
   *    - Processo: Criação do Pedido → Separação → Conferência → Auditoria → Finalização
   * 
   * IMPORTANTE: Pedidos NÃO são notas fiscais. São fluxos operacionais distintos
   * que podem ou não gerar notas fiscais posteriormente.
   */
  const [pedidos, setPedidos] = useState([]);
  const [estatisticas, setEstatisticas] = useState({
    totalControles: 0,
    controlesPendentes: 0,
    controlesFinalizados: 0,
    totalPedidos: 0,
    pedidosSeparados: 0,
    pedidosConferidos: 0,
    funcionariosAtivos: 0
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar funcionários logados (simulação - implementar API real)
      const funcionariosResponse = await fetch('/api/admin/usuarios');
      if (funcionariosResponse.ok) {
        const funcionariosData = await funcionariosResponse.json();
        setFuncionarios(funcionariosData.filter((f: any) => f.ativo));
      }

      // Carregar controles
      const controlesResponse = await fetch('/api/controles');
      if (controlesResponse.ok) {
        const controlesData = await controlesResponse.json();
        setControles(controlesData);
      }

      // Carregar pedidos (simulação - implementar API real se necessário)
      // const pedidosResponse = await fetch('/api/pedidos');
      // if (pedidosResponse.ok) {
      //   const pedidosData = await pedidosResponse.json();
      //   setPedidos(pedidosData);
      // }

      // Calcular estatísticas
      calcularEstatisticas();
      
    } catch (error) {
      console.error('Erro ao carregar dados do painel:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = () => {
    // Implementar cálculo real das estatísticas baseado nos dados carregados
    setEstatisticas({
      totalControles: controles.length,
      controlesPendentes: controles.filter((c: any) => !c.finalizado).length,
      controlesFinalizados: controles.filter((c: any) => c.finalizado).length,
      totalPedidos: pedidos.length,
      pedidosSeparados: pedidos.filter((p: any) => p.separado).length,
      pedidosConferidos: pedidos.filter((p: any) => p.conferido).length,
      funcionariosAtivos: funcionarios.length
    });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'finalizado':
        return 'success';
      case 'pendente':
        return 'warning';
      case 'em_andamento':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatarData = (data: string) => {
    try {
      return format(new Date(data), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    } catch {
      return 'Data inválida';
    }
  };

  if (!user || (user.tipo !== 'ADMIN' && user.tipo !== 'GERENTE')) {
    return (
      <Layout>
        <Alert severity="error">
          Acesso negado. Apenas administradores e gerentes podem acessar este painel.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ 
          fontWeight: 600,
          color: theme.palette.primary.main,
          mb: 3
        }}>
          <DashboardIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Painel Gerencial
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Cards de Estatísticas */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                          {estatisticas.totalControles}
                        </Typography>
                        <Typography variant="body2">
                          Total de Controles
                        </Typography>
                      </Box>
                      <TruckIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  color: 'white'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                          {estatisticas.controlesPendentes}
                        </Typography>
                        <Typography variant="body2">
                          Controles Pendentes
                        </Typography>
                      </Box>
                      <ScheduleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  color: 'white'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                          {estatisticas.funcionariosAtivos}
                        </Typography>
                        <Typography variant="body2">
                          Funcionários Ativos
                        </Typography>
                      </Box>
                      <PeopleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card sx={{ 
                  background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  color: 'white'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                          {estatisticas.controlesFinalizados}
                        </Typography>
                        <Typography variant="body2">
                          Controles Finalizados
                        </Typography>
                      </Box>
                      <CheckCircleIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Abas do Painel */}
            <Card>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                  value={tabValue} 
                  onChange={handleTabChange}
                  variant={isMobile ? "scrollable" : "standard"}
                  scrollButtons="auto"
                >
                  <Tab 
                    label="Funcionários Logados" 
                    icon={<PeopleIcon />}
                    iconPosition="start"
                  />
                  <Tab 
                    label="Relatório de Controles" 
                    icon={<TruckIcon />}
                    iconPosition="start"
                  />
                  <Tab 
                    label="Relatório de Pedidos" 
                    icon={<ReceiptIcon />}
                    iconPosition="start"
                  />
                  <Tab 
                    label="Análises e Gráficos" 
                    icon={<ReportIcon />}
                    iconPosition="start"
                  />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <Typography variant="h6" gutterBottom>
                  Funcionários Ativos no Sistema
                </Typography>
                
                <List>
                  {funcionarios.map((funcionario: any, index) => (
                    <React.Fragment key={funcionario.id}>
                      <ListItem>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: theme.palette.primary.main,
                            fontWeight: 'bold'
                          }}>
                            {funcionario.nome?.charAt(0).toUpperCase()}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={funcionario.nome}
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {funcionario.email}
                              </Typography>
                              <Chip 
                                label={funcionario.tipo} 
                                size="small" 
                                color="primary" 
                                sx={{ mt: 0.5 }}
                              />
                            </Box>
                          }
                        />
                        <Typography variant="caption" color="text.secondary">
                          Último acesso: {formatarData(funcionario.updatedAt || funcionario.createdAt)}
                        </Typography>
                      </ListItem>
                      {index < funcionarios.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    Relatório de Controles de Carga
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<DownloadIcon />}
                    onClick={() => {
                      // Implementar exportação de relatório
                      console.log('Exportar relatório de controles');
                    }}
                  >
                    Exportar
                  </Button>
                </Box>

                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Manifesto</TableCell>
                        <TableCell>Transportadora</TableCell>
                        <TableCell>Motorista</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Data Criação</TableCell>
                        <TableCell>Ações</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {controles.map((controle: any) => (
                        <TableRow key={controle.id}>
                          <TableCell>{controle.numeroManifesto}</TableCell>
                          <TableCell>{controle.transportadora}</TableCell>
                          <TableCell>{controle.motorista || 'PENDENTE'}</TableCell>
                          <TableCell>
                            <Chip 
                              label={controle.finalizado ? 'Finalizado' : 'Pendente'}
                              color={getStatusColor(controle.finalizado ? 'finalizado' : 'pendente')}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{formatarData(controle.dataCriacao)}</TableCell>
                          <TableCell>
                            <IconButton 
                              size="small"
                              onClick={() => {
                                // Implementar visualização detalhada
                                console.log('Ver detalhes do controle:', controle.id);
                              }}
                            >
                              <ViewIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Typography variant="h6" gutterBottom>
                  Relatório de Pedidos de Separação
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  {/* Domínio de Pedidos: Esta funcionalidade é específica para separação e conferência de pedidos. Não confundir com notas fiscais - são processos totalmente distintos. */}
                  Esta seção mostra dados específicos do processo de separação e conferência de pedidos.
                </Alert>

                <Typography variant="body1" color="text.secondary">
                  Relatório de pedidos em desenvolvimento. 
                  Esta funcionalidade será implementada conforme a necessidade do sistema de separação.
                </Typography>
              </TabPanel>

              <TabPanel value={tabValue} index={3}>
                <Typography variant="h6" gutterBottom>
                  Análises e Gráficos
                </Typography>
                
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="Controles por Status" />
                      <CardContent>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography>Finalizados</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <TrendingUpIcon color="success" />
                              <Typography variant="h6" color="success.main">
                                {estatisticas.controlesFinalizados}
                              </Typography>
                            </Box>
                          </Box>
                          
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography>Pendentes</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <WarningIcon color="warning" />
                              <Typography variant="h6" color="warning.main">
                                {estatisticas.controlesPendentes}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Card>
                      <CardHeader title="Resumo Geral" />
                      <CardContent>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Dados atualizados em tempo real
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ mb: 1 }}>
                          {((estatisticas.controlesFinalizados / estatisticas.totalControles) * 100 || 0).toFixed(1)}%
                        </Typography>
                        <Typography variant="body2">
                          Taxa de conclusão de controles
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </TabPanel>
            </Card>
          </>
        )}
      </Box>
    </Layout>
  );
};

export default PainelGerencial;
