import { 
  Container, 
  Typography, 
  Box, 
  Stack, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Button, 
  alpha, 
  Chip, 
  IconButton, 
  Tooltip,
  CircularProgress
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Assessment as RelatoriosIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  AssignmentTurnedIn as AuditorIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Pending as PendingIcon
} from '@mui/icons-material';
import { useRouter } from 'next/router';

const MotionBox = motion.create(Box);
const MotionPaper = motion.create(Paper);
const MotionTableRow = motion.create(TableRow);

interface NotaFiscal {
  id: string;
  codigo: string;
  numeroNota: string;
  controle: {
    id: string;
    dataConferencia: string | null;
    auditoriaRealizada: boolean;
    auditoriaComErro: boolean | null;
  } | null;
}

export default function RelatoriosPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [notasConferidas, setNotasConferidas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const glassStyles = {
    background: alpha('#ffffff', 0.7),
    backdropFilter: 'blur(12px)',
    border: `1px solid ${alpha('#ffffff', 0.3)}`,
    boxShadow: `0 8px 32px 0 ${alpha('#1e293b', 0.1)}`,
  };

  const fetchNotasConferidas = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notas?conferidas=true');
      if (!response.ok) {
        throw new Error('Falha ao buscar notas conferidas');
      }
      const data: NotaFiscal[] = await response.json();
      setNotasConferidas(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotasConferidas();
  }, []);

  const handleAuditar = (notaId: string) => {
    router.push(`/separacao-conferencia/confirmar-auditoria?notaId=${notaId}`);
  };

  if (authLoading) {
    return (
      <Box sx={{ 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        pt: { xs: 2, md: 4 },
        pb: { xs: 4, md: 6 }
      }}>
        <Container maxWidth="xl">
          <MotionBox
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            sx={{ 
              mb: 4,
              p: 3,
              borderRadius: 4,
              ...glassStyles,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: 2
            }}
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
                <RelatoriosIcon sx={{ fontSize: 32, color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="h4" fontWeight="800" color="text.primary" sx={{ letterSpacing: '-0.02em' }}>
                  Relatórios
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight="500">
                  Acompanhamento de pedidos conferidos e auditorias
                </Typography>
              </Box>
            </Stack>

            <Button 
              variant="text" 
              startIcon={<RefreshIcon />}
              onClick={fetchNotasConferidas}
              sx={{ 
                borderRadius: '12px', 
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: alpha('#3b82f6', 0.05) }
              }}
            >
              Atualizar Dados
            </Button>
          </MotionBox>

          <MotionPaper
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            elevation={0}
            sx={{ 
              width: '100%', 
              overflow: 'hidden', 
              borderRadius: '24px',
              ...glassStyles
            }}
          >
            <TableContainer>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Nº Pedido</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Nº Nota Fiscal</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }}>Data Conferência</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }} align="center">Status Auditoria</TableCell>
                    <TableCell sx={{ fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', bgcolor: 'transparent' }} align="right">Ações</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <MotionTableRow
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                          <CircularProgress size={40} thickness={4} />
                          <Typography variant="body2" sx={{ mt: 2, fontWeight: 600, color: 'text.secondary' }}>
                            Carregando registros...
                          </Typography>
                        </TableCell>
                      </MotionTableRow>
                    ) : notasConferidas.length === 0 ? (
                      <MotionTableRow
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                          <Stack spacing={2} alignItems="center">
                            <Box sx={{ 
                              width: 64, 
                              height: 64, 
                              borderRadius: '50%', 
                              bgcolor: alpha('#94a3b8', 0.1), 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center'
                            }}>
                              <HistoryIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                            </Box>
                            <Typography variant="h6" fontWeight="800">Nenhum pedido conferido</Typography>
                            <Typography variant="body2" color="text.secondary">Os pedidos aparecerão aqui após a conferência.</Typography>
                          </Stack>
                        </TableCell>
                      </MotionTableRow>
                    ) : (
                      notasConferidas.map((nota, index) => (
                        <MotionTableRow 
                          key={nota.id} 
                          hover
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          sx={{ '&:hover': { bgcolor: alpha('#f1f5f9', 0.5) } }}
                        >
                          <TableCell>
                            <Chip 
                              label={nota.codigo} 
                              size="small" 
                              sx={{ fontWeight: 800, borderRadius: '6px', bgcolor: alpha('#3b82f6', 0.1), color: '#2563eb' }} 
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="600" color="text.primary">
                              {nota.numeroNota}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="500" color="text.secondary">
                              {nota.controle?.dataConferencia ? new Date(nota.controle.dataConferencia).toLocaleDateString('pt-BR') : '-'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            {nota.controle?.auditoriaRealizada ? (
                              <Chip 
                                icon={nota.controle?.auditoriaComErro ? <ErrorIcon /> : <CheckCircleIcon />}
                                label={nota.controle?.auditoriaComErro ? 'Com Erro' : 'OK'} 
                                size="small"
                                sx={{ 
                                  fontWeight: 800,
                                  borderRadius: '8px',
                                  bgcolor: alpha(nota.controle?.auditoriaComErro ? '#ef4444' : '#10b981', 0.1),
                                  color: nota.controle?.auditoriaComErro ? '#dc2626' : '#059669',
                                  '& .MuiChip-icon': { color: 'inherit' }
                                }}
                              />
                            ) : (
                              <Chip 
                                icon={<PendingIcon />}
                                label="Pendente" 
                                size="small"
                                sx={{ 
                                  fontWeight: 800,
                                  borderRadius: '8px',
                                  bgcolor: alpha('#64748b', 0.1),
                                  color: '#475569',
                                  '& .MuiChip-icon': { color: 'inherit' }
                                }}
                              />
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {user?.tipo === 'AUDITOR' && !nota.controle?.auditoriaRealizada && (
                              <Button 
                                variant="contained" 
                                size="small" 
                                startIcon={<AuditorIcon />}
                                onClick={() => handleAuditar(nota.id)}
                                sx={{ 
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                                  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                }}
                              >
                                Auditar
                              </Button>
                            )}
                          </TableCell>
                        </MotionTableRow>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          </MotionPaper>
        </Container>
      </Box>
    
  );
}
