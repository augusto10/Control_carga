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
  SelectChangeEvent
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Add as AddIcon } from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

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
    <Container maxWidth="md">
      {/* Header */}
      <AppBar 
        position="static" 
        sx={{ 
          mb: 3, 
          background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
          borderRadius: 2
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleVoltar}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="img"
              src="/logo-icon.png"
              alt="Logo"
              sx={{ height: 32, width: 32 }}
            />
            <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
              CONFIRMAR AUDITORIA
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>

      {carregando ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      ) : (
        <Card sx={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', borderRadius: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3}>
              {/* Seleção de Pedido */}
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Selecionar Pedido *</InputLabel>
                  <Select
                    value={pedidoSelecionado}
                    label="Selecionar Pedido *"
                    onChange={handlePedidoChange}
                    disabled={salvando}
                  >
                    {pedidos.map((pedido) => (
                      <MenuItem key={pedido.id} value={pedido.id}>
                        <Box>
                          <Typography variant="body1">
                            Pedido: {pedido.numeroPedido}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Manifesto: {pedido.controle?.numeroManifesto || 'N/A'} | 
                            Motorista: {pedido.controle?.motorista || 'N/A'}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Informações do Pedido Selecionado */}
              {pedidoAtual && (
                <Grid item xs={12}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Informações do Pedido
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Número:</strong> {pedidoAtual.numeroPedido}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Manifesto:</strong> {pedidoAtual.controle?.numeroManifesto || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Motorista:</strong> {pedidoAtual.controle?.motorista || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Transportadora:</strong> {pedidoAtual.controle?.transportadora || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Separador:</strong> {pedidoAtual.controle?.separador?.nome || 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">
                          <strong>Responsável:</strong> {pedidoAtual.controle?.responsavel || 'N/A'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              )}

              {/* Formulário de Auditoria */}
              {pedidoSelecionado && (
                <>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>PEDIDO 100% *</InputLabel>
                      <Select
                        value={formData.pedido100}
                        label="PEDIDO 100% *"
                        onChange={(e) => handleInputChange('pedido100', e.target.value)}
                        disabled={salvando}
                      >
                        <MenuItem value="sim">Sim</MenuItem>
                        <MenuItem value="nao">Não</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel>INCONSISTÊNCIA *</InputLabel>
                      <Select
                        value={formData.inconsistencia}
                        label="INCONSISTÊNCIA *"
                        onChange={(e) => handleInputChange('inconsistencia', e.target.value)}
                        disabled={salvando}
                      >
                        <MenuItem value="sim">Sim</MenuItem>
                        <MenuItem value="nao">Não</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {formData.inconsistencia === 'sim' && (
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>MOTIVO INCONSISTÊNCIA *</InputLabel>
                        <Select
                          value={formData.motivoInconsistencia}
                          label="MOTIVO INCONSISTÊNCIA *"
                          onChange={(e) => handleInputChange('motivoInconsistencia', e.target.value)}
                          disabled={salvando}
                        >
                          {MOTIVOS_INCONSISTENCIA.map((motivo) => (
                            <MenuItem key={motivo} value={motivo}>
                              {motivo}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  )}

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Observações"
                      value={formData.observacoes}
                      onChange={(e) => handleInputChange('observacoes', e.target.value)}
                      disabled={salvando}
                      placeholder="Digite observações adicionais sobre a auditoria..."
                      InputProps={{
                        endAdornment: (
                          <IconButton size="small" disabled>
                            <AddIcon />
                          </IconButton>
                        )
                      }}
                    />
                  </Grid>
                </>
              )}
            </Grid>

            {/* Botões de Ação */}
            <Box sx={{ display: 'flex', gap: 2, mt: 4, justifyContent: 'center' }}>
              <Button
                variant="outlined"
                onClick={handleVoltar}
                disabled={salvando}
                sx={{ minWidth: 120 }}
              >
                Cancelar
              </Button>
              <Button
                variant="contained"
                onClick={handleSalvar}
                disabled={salvando || !pedidoSelecionado}
                sx={{ 
                  minWidth: 120,
                  background: 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)'
                }}
              >
                {salvando ? <CircularProgress size={24} /> : 'Salvar'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Notificações */}
      <Snackbar
        open={!!erro}
        autoHideDuration={6000}
        onClose={handleFecharNotificacao}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleFecharNotificacao} severity="error" sx={{ width: '100%' }}>
          {erro}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!sucesso}
        autoHideDuration={4000}
        onClose={handleFecharNotificacao}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleFecharNotificacao} severity="success" sx={{ width: '100%' }}>
          {sucesso}
        </Alert>
      </Snackbar>
    </Container>
  );
}

export default ConfirmarAuditoria;
