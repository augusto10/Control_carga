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
  Checkbox,
  ListItemText,
  OutlinedInput,
  SelectChangeEvent,
  TextField,
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api';

const motivosInconsistencia = [
  'AVARIA',
  'QUANTIDADE',
  'PRODUTO TROCADO',
  'EMBALAGEM',
  'PRODUTO SUJO',
  'PRODUTO VENCIDO',
  'ETIQUETAGEM',
  'LOTE',
  'SEM INCONSISTÊNCIA',
  'Produto faltando'
];

interface Usuario {
  id: string;
  nome: string;
}

interface Pedido {
  id: string;
  numeroPedido: string;
  controle: {
    id: string;
    numeroManifesto: string | null;
    motorista: string;
    responsavel: string;
    conferenciaRealizada: boolean;
    separador: Usuario | null;
    auditor: Usuario | null;
  } | null;
}

interface ControleCarga {
  id: string;
  numeroManifesto: string;
  motorista: string;
  responsavel: string;
  transportadora: string;
  qtdPallets: number;
  observacao: string | null;
  separador: Usuario | null;
  auditor: Usuario | null;
}

export default function PaginaConfirmarSeparacao() {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pedidoId, setPedidoId] = useState('');
  const [selectedControle, setSelectedControle] = useState<ControleCarga | null>(null);
  const [pedido100, setPedido100] = useState('');
  const [inconsistencia, setInconsistencia] = useState('');
  const [motivos, setMotivos] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPedidos() {
      try {
        const response = await api.get('/api/pedidos');
        setPedidos(response.data);
      } catch (error) {
        console.error(error);
      }
    }
    fetchPedidos();
  }, []);

  useEffect(() => {
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (pedido && pedido.controle) {
      const controle: ControleCarga = {
        id: pedido.controle.id,
        numeroManifesto: pedido.controle.numeroManifesto || '',
        motorista: pedido.controle.motorista,
        responsavel: pedido.controle.responsavel,
        transportadora: '', 
        qtdPallets: 0, 
        observacao: null, 
        separador: pedido.controle.separador,
        auditor: pedido.controle.auditor,
      };
      setSelectedControle(controle);
    } else {
      setSelectedControle(null);
    }
  }, [pedidoId, pedidos]);

  const handleSave = async () => {
    if (!pedidoId || !user) {
      alert('Por favor, selecione um pedido e certifique-se de que está logado.');
      return;
    }

    try {
      const response = await api.post('/api/controles/conferencia', {
        pedidoId: pedidoId,
        conferenteId: user.id,
        pedido100,
        inconsistencia,
        motivosInconsistencia: motivos,
      });

      if (response.status < 200 || response.status >= 300) {
        throw new Error('Falha ao salvar conferência');
      }

      alert('Conferência salva com sucesso!');
      setPedidos(pedidos.filter(p => p.id !== pedidoId));
      setPedidoId('');
      setSelectedControle(null);
      setPedido100('');
      setInconsistencia('');
      setMotivos([]);
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar a conferência. Tente novamente.');
    }
  };

  const handleMotivoChange = (event: SelectChangeEvent<typeof motivos>) => {
    const {
      target: { value },
    } = event;
    setMotivos(typeof value === 'string' ? value.split(',') : value);
  };

  const handleCancel = () => {
    setPedidoId('');
    setSelectedControle(null);
    setPedido100('');
    setInconsistencia('');
    setMotivos([]);
  };

  return (
    <Container maxWidth="sm">
      <Card sx={{ mt: 4, p: 2, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', borderRadius: '10px' }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
            CONFIRMAR SEPARAÇÃO
          </Typography>
          <Box component="form" noValidate autoComplete="off" sx={{ mt: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel id="pedido-select-label">Nº DO PEDIDO</InputLabel>
                  <Select
                    labelId="pedido-select-label"
                    value={pedidoId}
                    label="Nº DO PEDIDO"
                    onChange={(e) => setPedidoId(e.target.value)}
                  >
                    {pedidos.map((pedido) => (
                      <MenuItem key={pedido.id} value={pedido.id}>
                        {pedido.numeroPedido}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {selectedControle && (
                <>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Separador"
                      value={selectedControle.separador?.nome || 'Não definido'}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Auditor"
                      value={selectedControle.auditor?.nome || 'Não definido'}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Conferente"
                      value={user?.nome || ''}
                      InputProps={{ readOnly: true }}
                      variant="filled"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="pedido100-select-label">PEDIDO 100% *</InputLabel>
                      <Select
                        labelId="pedido100-select-label"
                        value={pedido100}
                        label="PEDIDO 100% *"
                        onChange={(e) => setPedido100(e.target.value)}
                      >
                        <MenuItem value={'sim'}>Sim</MenuItem>
                        <MenuItem value={'nao'}>Não</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth>
                      <InputLabel id="inconsistencia-select-label">INCONSISTÊNCIA *</InputLabel>
                      <Select
                        labelId="inconsistencia-select-label"
                        value={inconsistencia}
                        label="INCONSISTÊNCIA *"
                        onChange={(e) => setInconsistencia(e.target.value)}
                      >
                        <MenuItem value={'sim'}>Sim</MenuItem>
                        <MenuItem value={'nao'}>Não</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth disabled={inconsistencia !== 'sim'}>
                      <InputLabel id="motivo-inconsistencia-label">MOTIVO INCONSISTÊNCIA *</InputLabel>
                      <Select
                        labelId="motivo-inconsistencia-label"
                        multiple
                        value={motivos}
                        onChange={handleMotivoChange}
                        input={<OutlinedInput label="MOTIVO INCONSISTÊNCIA *" />}
                        renderValue={(selected) => selected.join(', ')}
                      >
                        {motivosInconsistencia.map((motivo) => (
                          <MenuItem key={motivo} value={motivo}>
                            <Checkbox checked={motivos.indexOf(motivo) > -1} />
                            <ListItemText primary={motivo} />
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2 }}>
                    <Button variant="text" onClick={handleCancel}>Cancelar</Button>
                    <Button variant="contained" color="primary" onClick={handleSave}>Salvar</Button>
                  </Grid>
                </>
              )}
            </Grid>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}
