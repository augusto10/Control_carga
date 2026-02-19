import { useEffect, useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Stack,
  TextField,
  Button,
  Grid,
  alpha,
  useTheme,
  Avatar,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  LocalShipping as TruckIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Search as SearchIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Badge as BadgeIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import ResponsiveContainer from '../../components/ResponsiveContainer';
import ProtectedRoute from '../../components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';

const MotionBox = motion(Box);
const MotionPaper = motion(Paper);
const MotionTableRow = motion(TableRow);

type Row = {
  motorista: string;
  cpfMotorista: string | null;
  qtdPalletsLevados: number;
  qtdPalletsDevolvidos: number;
  diferenca: number;
  totalControles: number;
};

type ApiResponse = {
  period: { start: string | null; end: string | null };
  totalMotoristas: number;
  data: Row[];
};

export default function RelatorioPalletsPorMotorista() {
  const theme = useTheme();
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  const totalLevados = useMemo(() => data.reduce((acc, r) => acc + r.qtdPalletsLevados, 0), [data]);
  const totalDevolvidos = useMemo(() => data.reduce((acc, r) => acc + r.qtdPalletsDevolvidos, 0), [data]);
  const totalDiferenca = useMemo(() => data.reduce((acc, r) => acc + r.diferenca, 0), [data]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const res = await fetch(`/api/relatorios/pallets-por-motorista?${params.toString()}`);
      if (!res.ok) throw new Error('Falha ao buscar relatório');
      const body: ApiResponse = await res.json();
      setData(body.data || []);
    } catch (e) {
      console.error(e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const StatBox = ({ label, value, icon, color, delay }: any) => (
    <MotionPaper
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      sx={{
        p: 2.5,
        borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
        flexGrow: 1,
        minWidth: 200
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar sx={{ bgcolor: alpha(theme.palette[color].main, 0.1), color: `${color}.main`, borderRadius: 2 }}>
          {icon}
        </Avatar>
        <Box>
          <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {label}
          </Typography>
          <Typography variant="h5" fontWeight="800" color="#1e293b">
            {value}
          </Typography>
        </Box>
      </Stack>
    </MotionPaper>
  );

  return (
    <ProtectedRoute>
      <ResponsiveContainer
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Relatórios', path: '/relatorios' },
          { label: 'Pallets por Motorista' }
        ]}
      >
        {/* Header */}
        <Box mb={4}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
            <Box>
              <Typography variant="h4" fontWeight="800" color="#1e293b" gutterBottom>
                Pallets por Motorista
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Análise de movimentação de pallets por motorista e período.
              </Typography>
            </Box>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />}
              onClick={fetchData}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 'bold' }}
            >
              Atualizar
            </Button>
          </Stack>
        </Box>

        {/* Filters */}
        <MotionPaper
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          sx={{
            p: 3,
            mb: 4,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
          }}
        >
          <Grid container spacing={3} alignItems="flex-end">
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                fullWidth
                label="Data Início"
                type="date"
                value={start}
                onChange={e => setStart(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={3}>
              <TextField
                fullWidth
                label="Data Fim"
                type="date"
                value={end}
                onChange={e => setEnd(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4} md={6}>
              <Stack direction="row" spacing={2}>
                <Button 
                  variant="contained" 
                  startIcon={<FilterIcon />}
                  onClick={fetchData}
                  disabled={loading}
                  sx={{ borderRadius: 3, px: 4, fontWeight: 'bold' }}
                >
                  {loading ? <CircularProgress size={24} /> : 'Aplicar Filtros'}
                </Button>
                <Button 
                  variant="outlined" 
                  startIcon={<ClearIcon />}
                  onClick={() => { setStart(''); setEnd(''); fetchData(); }}
                  sx={{ borderRadius: 3, fontWeight: 'bold' }}
                >
                  Limpar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </MotionPaper>

        {/* Stats Summary */}
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} mb={4}>
          <StatBox label="Total Motoristas" value={data.length} icon={<TruckIcon />} color="primary" delay={0.1} />
          <StatBox label="Pallets Levados" value={totalLevados} icon={<TrendingUpIcon />} color="info" delay={0.2} />
          <StatBox label="Pallets Devolvidos" value={totalDevolvidos} icon={<TrendingDownIcon />} color="success" delay={0.3} />
          <StatBox 
            label="Diferença" 
            value={`${totalDiferenca > 0 ? '+' : ''}${totalDiferenca}`} 
            icon={<AssignmentIcon />} 
            color={totalDiferenca >= 0 ? 'success' : 'error'} 
            delay={0.4} 
          />
        </Stack>

        {/* Table */}
        <MotionPaper
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
          }}
        >
          <TableContainer>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 'bold' }}>Motorista</TableCell>
                  <TableCell sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 'bold' }}>Documento</TableCell>
                  <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 'bold' }}>Levados</TableCell>
                  <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 'bold' }}>Devolvidos</TableCell>
                  <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 'bold' }}>Diferença</TableCell>
                  <TableCell align="right" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.05), fontWeight: 'bold' }}>Controles</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {data.map((row, index) => (
                    <MotionTableRow
                      key={`${row.motorista}-${row.cpfMotorista}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) } }}
                    >
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 32, height: 32, fontSize: '0.875rem', bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main', fontWeight: 'bold' }}>
                            {row.motorista.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography variant="body2" fontWeight="700">{row.motorista}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} alignItems="center">
                          <BadgeIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">{row.cpfMotorista || '-'}</Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="600">{row.qtdPalletsLevados}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="600">{row.qtdPalletsDevolvidos}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${row.diferenca > 0 ? '+' : ''}${row.diferenca}`}
                          size="small"
                          sx={{ 
                            fontWeight: 'bold',
                            bgcolor: alpha(theme.palette[row.diferenca >= 0 ? 'success' : 'error'].main, 0.1),
                            color: `${row.diferenca >= 0 ? 'success' : 'error'}.main`,
                            borderRadius: 1.5
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">{row.totalControles}</Typography>
                      </TableCell>
                    </MotionTableRow>
                  ))}
                </AnimatePresence>
                {!loading && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8 }}>
                      <Box sx={{ opacity: 0.3 }}>
                        <SearchIcon sx={{ fontSize: 48, mb: 1 }} />
                        <Typography>Nenhum dado encontrado</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </MotionPaper>
      </ResponsiveContainer>
    </ProtectedRoute>
  );
}
