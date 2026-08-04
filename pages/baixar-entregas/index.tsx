import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  ArrowBack,
  AssignmentTurnedIn,
  CameraAlt,
  CheckCircle,
  Close,
  DeleteOutline,
  Inventory2,
  LocalShipping,
  Person,
  ReceiptLong,
  Search,
  Visibility,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

type Confirmacao = {
  dataConfirmacao: string | null;
  confirmadoPor: string | null;
  recebedor: string | null;
  volumesConferidos: number | null;
  fotoComprovante: string | null;
  temFoto?: boolean;
  observacao: string | null;
};

type NotaEntrega = {
  id: string;
  numeroNota: string;
  codigo: string;
  codigoCliente: string | number | null;
  vendedor: string | null;
  volumes: number;
  cliente: string;
  valor: number;
  pedidoId: number | string | null;
  numeroPedido: string | null;
  status: 'PENDENTE' | 'ENTREGUE';
  confirmacao: Confirmacao | null;
};

type ControleEntrega = {
  id: string;
  numeroManifesto: string;
  dataCriacao: string;
  motorista: string;
  transportadora: string;
  placaVeiculo: string;
  totalNotas: number;
  entregues: number;
  pendentes: number;
  notas: NotaEntrega[];
};

type ApiResponse = {
  entregas: ControleEntrega[];
  totais: { total: number; pendentes: number; entregues: number };
  motoristaLogado: string;
  podeVerTodos: boolean;
  motoristas: string[];
};

type SelectedDelivery = {
  controle: ControleEntrega;
  nota: NotaEntrega;
};

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const carrierName = (value: string) =>
  ({
    TERCEIRIZADA: 'Terceirizada',
    DETAFRA_TRANSPORTES: 'Detafra Transportes',
    EXPRESSO_GOIAS: 'Expresso Goiás',
    ZANUELO_TRANSPORTE_LOGISTICA: 'Zanuelo Transporte e Logística',
  } as Record<string, string>)[value] || value;

const parseApiResponse = async (response: Response) => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(payload?.details || payload?.message || 'Não foi possível concluir a operação');
  }
  return payload;
};

const imageFileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Selecione uma imagem válida'));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error('A foto deve ter no máximo 10 MB'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Não foi possível ler a foto'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('A foto selecionada é inválida'));
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Não foi possível preparar a foto'));
          return;
        }
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });

function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'rgba(255,255,255,0.88)',
      }}
    >
      <Stack direction="row" spacing={1.25} alignItems="center">
        <Avatar sx={{ width: 38, height: 38, bgcolor: `${color}18`, color }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight={900} lineHeight={1}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

export default function BaixarEntregasPage() {
  const theme = useTheme();
  const fullScreenDialog = useMediaQuery(theme.breakpoints.down('sm'));
  const photoInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('TODOS');
  const [motorista, setMotorista] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selected, setSelected] = useState<SelectedDelivery | null>(null);
  const [receiver, setReceiver] = useState('');
  const [checkedVolumes, setCheckedVolumes] = useState('');
  const [observation, setObservation] = useState('');
  const [photo, setPhoto] = useState('');
  const [photoLoading, setPhotoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const loadDeliveries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('busca', search.trim());
      if (status !== 'TODOS') params.set('status', status);
      if (motorista) params.set('motorista', motorista);
      if (dataInicio) params.set('dataInicio', dataInicio);
      if (dataFim) params.set('dataFim', dataFim);
      const response = await fetch(`/api/baixar-entregas?${params.toString()}`, {
        credentials: 'include',
      });
      setData(await parseApiResponse(response));
    } catch (loadError: any) {
      setError(loadError?.message || 'Erro ao carregar as entregas');
    } finally {
      setLoading(false);
    }
  }, [dataFim, dataInicio, motorista, search, status]);

  useEffect(() => {
    void loadDeliveries();
  }, [loadDeliveries]);

  const totalProgress = useMemo(() => {
    if (!data?.totais.total) return 0;
    return Math.round((data.totais.entregues / data.totais.total) * 100);
  }, [data]);

  const openDelivery = async (control: ControleEntrega, note: NotaEntrega) => {
    setSelected({ controle: control, nota: note });
    setReceiver('');
    setCheckedVolumes(String(note.volumes || ''));
    setObservation('');
    setPhoto('');
    setFormError('');

    try {
      const requests: Promise<Response>[] = [
        fetch(
          `/api/baixar-entregas/detalhes?controleId=${encodeURIComponent(control.id)}&notaId=${encodeURIComponent(note.id)}`,
          { credentials: 'include' }
        ),
      ];
      const shouldLoadPhoto =
        note.status === 'ENTREGUE' &&
        note.confirmacao?.temFoto &&
        !note.confirmacao.fotoComprovante;
      if (shouldLoadPhoto) {
        requests.push(
          fetch(
            `/api/baixar-entregas/confirmar?controleId=${encodeURIComponent(control.id)}&numeroNota=${encodeURIComponent(note.numeroNota)}`,
            { credentials: 'include' }
          )
        );
      }

      const responses = await Promise.all(requests);
      const detail = await parseApiResponse(responses[0]);
      let confirmation = note.confirmacao;
      if (shouldLoadPhoto && responses[1]) {
        const confirmations = await parseApiResponse(responses[1]);
        confirmation = Array.isArray(confirmations) ? confirmations[0] : confirmation;
      }

      setSelected((current) =>
        current?.controle.id === control.id && current.nota.id === note.id
          ? {
              ...current,
              nota: {
                ...current.nota,
                ...detail,
                status: current.nota.status,
                confirmacao: confirmation,
              },
            }
          : current
      );
    } catch {
      // Os demais dados do comprovante continuam disponíveis mesmo se a foto falhar.
    }
  };

  const handlePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setPhotoLoading(true);
    setFormError('');
    try {
      setPhoto(await imageFileToDataUrl(file));
    } catch (photoError: any) {
      setFormError(photoError?.message || 'Erro ao preparar a foto');
    } finally {
      setPhotoLoading(false);
    }
  };

  const finishDelivery = async () => {
    if (!selected) return;
    const volumes = Number(checkedVolumes);
    if (receiver.trim().length < 3) {
      setFormError('Informe o nome de quem recebeu a entrega');
      return;
    }
    if (!Number.isInteger(volumes) || volumes < 1) {
      setFormError('Confira e informe a quantidade de volumes entregues');
      return;
    }
    if (!photo) {
      setFormError('Tire uma foto para comprovar a entrega');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      const response = await fetch('/api/baixar-entregas/confirmar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          controleId: selected.controle.id,
          numeroNota: selected.nota.numeroNota,
          recebedor: receiver.trim(),
          volumesConferidos: volumes,
          fotoComprovante: photo,
          observacao: observation.trim(),
        }),
      });
      const payload = await parseApiResponse(response);
      const confirmation: Confirmacao = payload.confirmacao;

      setData((current) => {
        if (!current) return current;
        return {
          ...current,
          totais: {
            ...current.totais,
            pendentes: Math.max(0, current.totais.pendentes - 1),
            entregues: current.totais.entregues + 1,
          },
          entregas: current.entregas.map((control) => {
            if (control.id !== selected.controle.id) return control;
            return {
              ...control,
              entregues: control.entregues + 1,
              pendentes: Math.max(0, control.pendentes - 1),
              notas: control.notas.map((note) =>
                note.id === selected.nota.id
                  ? { ...note, status: 'ENTREGUE' as const, confirmacao: confirmation }
                  : note
              ),
            };
          }),
        };
      });

      setSelected((current) =>
        current
          ? {
              ...current,
              nota: { ...current.nota, status: 'ENTREGUE', confirmacao: confirmation },
            }
          : current
      );
      setSnackbar({
        open: true,
        message: 'Entrega finalizada com sucesso',
        severity: 'success',
      });
    } catch (submitError: any) {
      setFormError(submitError?.message || 'Erro ao finalizar a entrega');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute
      allowedRoles={
        ['ADMIN', 'GERENTE', 'USUARIO', 'FUNCIONARIO', 'CLIENTE', 'SEPARADOR', 'CONFERENTE', 'AUDITOR'] as any
      }
    >
      <AppLayout
        title="Minhas entregas"
        subtitle={`Pedidos atribuídos a ${data?.motoristaLogado || user?.nome || 'você'}`}
        breadcrumbs={[{ label: 'Minhas entregas' }]}
      >
        <Stack spacing={2.5} sx={{ maxWidth: 1120, mx: 'auto' }}>
          <Paper
            elevation={0}
            sx={{
              overflow: 'hidden',
              borderRadius: 4,
              color: 'white',
              background:
                'radial-gradient(circle at 85% 20%, rgba(251,191,36,.38), transparent 28%), linear-gradient(135deg, #0f766e 0%, #115e59 55%, #134e4a 100%)',
            }}
          >
            <Box sx={{ p: { xs: 2.5, sm: 3.5 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="overline" sx={{ opacity: 0.82, letterSpacing: 1.5 }}>
                    Rota de entregas
                  </Typography>
                  <Typography variant="h5" fontWeight={900}>
                    {data?.motoristaLogado || user?.nome || 'Motorista'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                    Toque em um pedido para conferir e finalizar.
                  </Typography>
                </Box>
                <LocalShipping sx={{ fontSize: { xs: 46, sm: 60 }, opacity: 0.24 }} />
              </Stack>
              <Box sx={{ mt: 3 }}>
                <Stack direction="row" justifyContent="space-between" mb={0.75}>
                  <Typography variant="caption" fontWeight={700}>
                    Progresso das entregas exibidas
                  </Typography>
                  <Typography variant="caption" fontWeight={900}>
                    {totalProgress}%
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={totalProgress}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    bgcolor: 'rgba(255,255,255,.2)',
                    '& .MuiLinearProgress-bar': { bgcolor: '#fbbf24', borderRadius: 99 },
                  }}
                />
              </Box>
            </Box>
          </Paper>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, minmax(150px, 1fr))' },
              gap: 1,
            }}
          >
            <SummaryCard label="Pedidos" value={data?.totais.total || 0} color="#0f766e" icon={<ReceiptLong />} />
            <SummaryCard label="Pendentes" value={data?.totais.pendentes || 0} color="#d97706" icon={<Inventory2 />} />
            <SummaryCard label="Entregues" value={data?.totais.entregues || 0} color="#16a34a" icon={<CheckCircle />} />
          </Box>

          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25}>
              <TextField
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void loadDeliveries()}
                placeholder="Buscar nota, pedido ou cliente"
                size="small"
                fullWidth
                InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.disabled' }} /> }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={(event) => setStatus(event.target.value)}>
                  <MenuItem value="TODOS">Todos</MenuItem>
                  <MenuItem value="PENDENTE">Pendentes</MenuItem>
                  <MenuItem value="ENTREGUE">Entregues</MenuItem>
                </Select>
              </FormControl>
              {data?.podeVerTodos && (
                <FormControl size="small" sx={{ minWidth: 210 }}>
                  <InputLabel>Motorista</InputLabel>
                  <Select
                    value={motorista}
                    label="Motorista"
                    onChange={(event) => setMotorista(event.target.value)}
                  >
                    <MenuItem value="">Todos os motoristas</MenuItem>
                    {data.motoristas.map((name) => (
                      <MenuItem key={name} value={name}>
                        {name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField
                label="Data inicial"
                type="date"
                size="small"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 155 }}
              />
              <TextField
                label="Data final"
                type="date"
                size="small"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 155 }}
              />
              <Button variant="contained" onClick={() => void loadDeliveries()} disabled={loading}>
                Atualizar
              </Button>
            </Stack>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          {loading && !data ? (
            <Stack alignItems="center" spacing={1.5} py={8}>
              <CircularProgress />
              <Typography color="text.secondary">Carregando sua rota...</Typography>
            </Stack>
          ) : data?.entregas.length === 0 ? (
            <Paper elevation={0} sx={{ p: 5, textAlign: 'center', borderRadius: 4, border: '1px dashed', borderColor: 'divider' }}>
              <CheckCircle sx={{ fontSize: 56, color: 'success.main', opacity: 0.75 }} />
              <Typography variant="h6" fontWeight={800} mt={1}>
                Nenhuma entrega encontrada
              </Typography>
              <Typography color="text.secondary">
                Não há pedidos com esse filtro ou motorista.
              </Typography>
            </Paper>
          ) : (
            <Paper
              elevation={0}
              sx={{
                borderRadius: 4,
                border: '1px solid',
                borderColor: 'divider',
                overflow: 'hidden',
                bgcolor: 'background.paper',
              }}
            >
              {data?.entregas.map((control) => {
                const progress = control.totalNotas
                  ? Math.round((control.entregues / control.totalNotas) * 100)
                  : 0;
                return (
                  <Box
                    key={control.id}
                    sx={{
                      px: { xs: 1.5, sm: 2.5 },
                      py: { xs: 1.5, sm: 2 },
                      '&:not(:last-of-type)': {
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      },
                    }}
                  >
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} justifyContent="space-between">
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                            <Typography variant="h6" fontWeight={900}>
                              Controle {control.numeroManifesto}
                            </Typography>
                            {control.pendentes === 0 && (
                              <Chip size="small" color="success" icon={<CheckCircle />} label="Rota concluída" />
                            )}
                          </Stack>
                          <Typography variant="body2" color="text.secondary">
                            {carrierName(control.transportadora)} • Placa {control.placaVeiculo} •{' '}
                            {format(new Date(control.dataCriacao), 'dd/MM/yyyy')}
                          </Typography>
                          {data.podeVerTodos && (
                            <Typography variant="caption" color="text.secondary">
                              Motorista: {control.motorista}
                            </Typography>
                          )}
                        </Box>
                        <Box sx={{ minWidth: { sm: 170 } }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={700}>
                            {control.entregues} de {control.totalNotas} entregues
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            color={progress === 100 ? 'success' : 'warning'}
                            sx={{ height: 7, borderRadius: 99, mt: 0.5 }}
                          />
                        </Box>
                      </Stack>

                      <Divider sx={{ my: 2 }} />

                    <Stack spacing={0}>
                      {control.notas.map((note) => (
                        <Box
                          key={note.id}
                          onClick={() => void openDelivery(control, note)}
                          sx={{
                            width: '100%',
                            px: { xs: 0.5, sm: 1 },
                            py: 1.25,
                            textAlign: 'left',
                            cursor: 'pointer',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            bgcolor: note.status === 'ENTREGUE' ? 'rgba(22,163,74,.035)' : 'rgba(245,158,11,.035)',
                            color: 'text.primary',
                            transition: 'background-color .18s ease',
                            '&:hover': {
                              bgcolor: note.status === 'ENTREGUE' ? 'rgba(22,163,74,.07)' : 'rgba(245,158,11,.07)',
                            },
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar
                              sx={{
                                bgcolor: note.status === 'ENTREGUE' ? 'success.main' : 'warning.main',
                                width: 36,
                                height: 36,
                                flexShrink: 0,
                              }}
                            >
                              {note.status === 'ENTREGUE' ? <CheckCircle fontSize="small" /> : <ReceiptLong fontSize="small" />}
                            </Avatar>
                            <Box flex={1} minWidth={0}>
                              <Stack
                                direction={{ xs: 'column', md: 'row' }}
                                justifyContent="space-between"
                                spacing={{ xs: 0.35, md: 1.5 }}
                              >
                                <Typography fontWeight={900} sx={{ overflowWrap: 'anywhere' }}>
                                  Pedido {note.numeroPedido || note.pedidoId || `NF ${note.numeroNota}`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" noWrap>
                                  NF {note.numeroNota} • {note.volumes} volume{note.volumes === 1 ? '' : 's'}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" color="text.secondary" noWrap display="block">
                                {note.cliente} • Código do cliente: {note.codigoCliente || 'não informado'}
                              </Typography>
                              {(note.vendedor || note.numeroPedido || note.pedidoId) && (
                                <Typography variant="caption" color="text.secondary" noWrap display="block">
                                  Pedido: {note.numeroPedido || note.pedidoId || 'não informado'} • Vendedor:{' '}
                                  {note.vendedor || 'não informado'}
                                </Typography>
                              )}
                            </Box>
                            <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                              {note.status === 'PENDENTE' ? (
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  startIcon={<AssignmentTurnedIn />}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    void openDelivery(control, note);
                                  }}
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    minWidth: 0,
                                    px: 1.2,
                                    py: 0.45,
                                    borderRadius: 2,
                                    fontSize: '0.72rem',
                                    lineHeight: 1.1,
                                    fontWeight: 800,
                                    '& .MuiButton-startIcon': {
                                      mr: 0.5,
                                    },
                                    '& .MuiSvgIcon-root': {
                                      fontSize: 16,
                                    },
                                  }}
                                >
                                  Finalizar entrega
                                </Button>
                              ) : (
                                <Button
                                  variant="contained"
                                  color="success"
                                  size="small"
                                  disabled
                                  startIcon={<CheckCircle />}
                                  sx={{
                                    whiteSpace: 'nowrap',
                                    minWidth: 0,
                                    px: 1.2,
                                    py: 0.45,
                                    borderRadius: 2,
                                    fontSize: '0.72rem',
                                    lineHeight: 1.1,
                                    fontWeight: 800,
                                    '& .MuiButton-startIcon': {
                                      mr: 0.5,
                                    },
                                    '& .MuiSvgIcon-root': {
                                      fontSize: 16,
                                    },
                                  }}
                                >
                                  Entregue
                                </Button>
                              )}
                              <Visibility fontSize="small" sx={{ color: 'text.disabled', flexShrink: 0 }} />
                            </Stack>
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                );
              })}
            </Paper>
          )}
        </Stack>
        <Dialog
          open={Boolean(selected)}
          onClose={() => setSelected(null)}
          fullScreen={fullScreenDialog}
          fullWidth
          maxWidth="md"
          PaperProps={{
            sx: {
              borderRadius: { sm: 4 },
              width: '100%',
              minHeight: { sm: '78vh' },
              maxHeight: { sm: '92vh' },
            },
          }}
        >
          {selected && (
            <>
              <DialogTitle sx={{ pr: 6 }}>
                <Stack direction="row" spacing={1.25} alignItems="center">
                  {fullScreenDialog && (
                    <IconButton edge="start" onClick={() => setSelected(null)}>
                      <ArrowBack />
                    </IconButton>
                  )}
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Detalhes do pedido
                    </Typography>
                    <Typography variant="h6" fontWeight={900}>
                      {selected.nota.numeroPedido || selected.nota.pedidoId || `NF ${selected.nota.numeroNota}`}
                    </Typography>
                  </Box>
                </Stack>
                {!fullScreenDialog && (
                  <IconButton onClick={() => setSelected(null)} sx={{ position: 'absolute', right: 12, top: 12 }}>
                    <Close />
                  </IconButton>
                )}
              </DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2}>
                  <Alert
                    severity={selected.nota.status === 'ENTREGUE' ? 'success' : 'warning'}
                    icon={selected.nota.status === 'ENTREGUE' ? <CheckCircle /> : <LocalShipping />}
                  >
                    {selected.nota.status === 'ENTREGUE'
                      ? 'Este pedido já foi entregue.'
                      : 'Pedido pendente de confirmação da entrega.'}
                  </Alert>

                  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" spacing={1.25}>
                        <ReceiptLong color="primary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Nota fiscal</Typography>
                          <Typography fontWeight={800}>{selected.nota.numeroNota}</Typography>
                        </Box>
                      </Stack>
                      <Divider />
                      <Stack direction="row" spacing={1.25}>
                        <Person color="primary" />
                        <Box minWidth={0}>
                          <Typography variant="caption" color="text.secondary">Cliente</Typography>
                          <Typography fontWeight={800}>{selected.nota.cliente}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Código da nota: {selected.nota.codigo || '-'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Código do cliente: {selected.nota.codigoCliente || 'não informado'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Pedido: {selected.nota.numeroPedido || selected.nota.pedidoId || 'não informado'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Vendedor: {selected.nota.vendedor || 'não informado'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Divider />
                      <Stack direction="row" spacing={1.25}>
                        <Inventory2 color="primary" />
                        <Box>
                          <Typography variant="caption" color="text.secondary">Volumes previstos</Typography>
                          <Typography fontWeight={800}>{selected.nota.volumes}</Typography>
                        </Box>
                      </Stack>
                      {selected.nota.valor > 0 && (
                        <>
                          <Divider />
                          <Typography fontWeight={800}>Valor: {money(selected.nota.valor)}</Typography>
                        </>
                      )}
                    </Stack>
                  </Paper>

                  {selected.nota.confirmacao && (
                    <Paper sx={{ p: 2, borderRadius: 3, bgcolor: 'success.50' }} variant="outlined">
                      <Typography fontWeight={900} color="success.dark" mb={1}>
                        Comprovante da entrega
                      </Typography>
                      <Typography variant="body2">
                        Recebido por: <strong>{selected.nota.confirmacao.recebedor}</strong>
                      </Typography>
                      <Typography variant="body2">
                        Volumes conferidos: <strong>{selected.nota.confirmacao.volumesConferidos}</strong>
                      </Typography>
                      {selected.nota.confirmacao.dataConfirmacao && (
                        <Typography variant="body2">
                          Finalizada em:{' '}
                          <strong>
                            {format(new Date(selected.nota.confirmacao.dataConfirmacao), 'dd/MM/yyyy HH:mm')}
                          </strong>
                        </Typography>
                      )}
                      {selected.nota.confirmacao.fotoComprovante && (
                        <Box
                          component="img"
                          src={selected.nota.confirmacao.fotoComprovante}
                          alt="Foto do comprovante de entrega"
                          sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 2, mt: 2 }}
                        />
                      )}
                    </Paper>
                  )}

                  {selected.nota.status === 'PENDENTE' && (
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                      <Stack spacing={2.25}>
                        <Typography fontWeight={900} color="success.main">
                          Finalizar entrega
                        </Typography>
                        <Alert severity="info">
                          Confira os volumes com o recebedor antes de finalizar. Depois de salva, a entrega ficará com check verde.
                        </Alert>
                        <TextField
                          label="Volumes entregues"
                          value={checkedVolumes}
                          onChange={(event) => setCheckedVolumes(event.target.value.replace(/\D/g, ''))}
                          type="number"
                          required
                          fullWidth
                          inputProps={{ min: 1 }}
                          helperText={`O controle informa ${selected.nota.volumes || 0} volume(s).`}
                        />
                        <TextField
                          label="Nome de quem recebeu"
                          value={receiver}
                          onChange={(event) => setReceiver(event.target.value)}
                          required
                          fullWidth
                          inputProps={{ maxLength: 120 }}
                          placeholder="Digite o nome completo"
                        />
                        <TextField
                          label="Observação (opcional)"
                          value={observation}
                          onChange={(event) => setObservation(event.target.value)}
                          multiline
                          minRows={2}
                          fullWidth
                          inputProps={{ maxLength: 500 }}
                        />

                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, textAlign: 'center' }}>
                          <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhoto}
                            style={{ display: 'none' }}
                          />
                          {photo ? (
                            <Stack spacing={1.5} alignItems="center">
                              <Box
                                component="img"
                                src={photo}
                                alt="Prévia da foto da entrega"
                                sx={{ width: '100%', maxHeight: 300, objectFit: 'cover', borderRadius: 2 }}
                              />
                              <Chip color="success" icon={<CheckCircle />} label="Foto pronta para salvar" />
                              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                <Button startIcon={<CameraAlt />} onClick={() => photoInputRef.current?.click()}>
                                  Tirar outra foto
                                </Button>
                                <Button color="error" startIcon={<DeleteOutline />} onClick={() => setPhoto('')}>
                                  Excluir foto
                                </Button>
                              </Stack>
                            </Stack>
                          ) : (
                            <Stack spacing={1.5} alignItems="center" py={2}>
                              <Avatar sx={{ width: 58, height: 58, bgcolor: 'success.50', color: 'success.main' }}>
                                <CameraAlt fontSize="large" />
                              </Avatar>
                              <Box>
                                <Typography fontWeight={900}>Foto da entrega</Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Fotografe os volumes ou o comprovante recebido.
                                </Typography>
                              </Box>
                              <Button
                                variant="outlined"
                                color="success"
                                startIcon={photoLoading ? <CircularProgress size={18} /> : <CameraAlt />}
                                onClick={() => photoInputRef.current?.click()}
                                disabled={photoLoading}
                              >
                                Tirar foto
                              </Button>
                            </Stack>
                          )}
                        </Paper>
                        {formError && <Alert severity="error">{formError}</Alert>}
                      </Stack>
                    </Paper>
                  )}
                </Stack>
              </DialogContent>
              <DialogActions sx={{ p: 2 }}>
                <Button onClick={() => setSelected(null)} color="inherit">
                  Fechar
                </Button>
                {selected.nota.status === 'PENDENTE' && (
                  <Button
                    variant="contained"
                    color="success"
                    size="large"
                    startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <AssignmentTurnedIn />}
                    onClick={() => void finishDelivery()}
                    disabled={submitting || photoLoading}
                  >
                    {submitting ? 'Salvando...' : 'Confirmar entrega'}
                  </Button>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            severity={snackbar.severity}
            variant="filled"
            onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
            sx={{ width: '100%', fontWeight: 800 }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </AppLayout>
    </ProtectedRoute>
  );
}

(BaixarEntregasPage as any).usesAppLayout = true;

