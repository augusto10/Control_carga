import { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Stack,
  alpha,
  useTheme,
  Paper,
  Avatar,
  Divider,
  CircularProgress,
  useMediaQuery
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  LocalShipping as TruckIcon,
  Description as DescriptionIcon,
  BarChart as BarChartIcon,
  History as HistoryIcon,
  GetApp as DownloadIcon,
  TrendingUp as TrendingUpIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import ProtectedRoute from '../components/ProtectedRoute';

const MotionPaper = motion.create(Paper);
const MotionCard = motion.create(Card);

export default function Relatorios() {
  const theme = useTheme();
  const [relatorios, setRelatorios] = useState([]);

  useEffect(() => {
    // Implementar busca se necessário
  }, []);

  const RelatorioCard = ({ title, description, icon, href, color, delay }: any) => (
    <MotionCard
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -5 }}
      sx={{
        height: '100%',
        borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ p: 3, flexGrow: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Avatar sx={{ bgcolor: alpha(theme.palette[color].main, 0.1), color: `${color}.main`, borderRadius: 2 }}>
            {icon}
          </Avatar>
          <Typography variant="h6" fontWeight="bold" color="#1e293b">
            {title}
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={3}>
          {description}
        </Typography>
      </CardContent>
      <Divider sx={{ opacity: 0.5 }} />
      <Box p={2} sx={{ bgcolor: alpha(theme.palette[color].main, 0.02) }}>
        <Button 
          variant="text" 
          fullWidth 
          href={href}
          endIcon={<ArrowForwardIcon />}
          sx={{ 
            justifyContent: 'space-between', 
            fontWeight: 'bold', 
            color: `${color}.main`,
            '&:hover': { bgcolor: alpha(theme.palette[color].main, 0.05) }
          }}
        >
          Acessar Relatório
        </Button>
      </Box>
    </MotionCard>
  );

  return (
    <ProtectedRoute>
      <AppLayout
        title="Relatórios"
        subtitle="Consulte e gere documentos detalhados sobre as operações do sistema"
        breadcrumb={[
          { label: 'Dashboard', path: '/' },
          { label: 'Relatórios' }
        ]}
      >
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <RelatorioCard 
              title="Pallets por Motorista" 
              description="Totais de pallets levados, devolvidos e diferença, agrupados por motorista e período."
              icon={<TruckIcon />}
              href="/relatorios/pallets"
              color="primary"
              delay={0.1}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <RelatorioCard 
              title="Controles de Carga" 
              description="Resumo completo de todos os controles de carga realizados no período selecionado."
              icon={<AssignmentIcon />}
              href="/relatorios/controles-carga"
              color="info"
              delay={0.2}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <RelatorioCard 
              title="Conferências de Pedidos" 
              description="Detalhamento das conferências e auditorias realizadas pelos usuários."
              icon={<BarChartIcon />}
              href="/relatorios/conferencias"
              color="success"
              delay={0.3}
            />
          </Grid>
          
          {/* Section for Future Reports */}
          <Grid item xs={12}>
            <MotionPaper
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              sx={{
                p: 4,
                borderRadius: 4,
                textAlign: 'center',
                background: alpha(theme.palette.primary.main, 0.02),
                border: `1px dashed ${alpha(theme.palette.primary.main, 0.2)}`
              }}
            >
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" color="text.secondary" fontWeight="bold">
                Mais relatórios em desenvolvimento
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1, maxWidth: 600, mx: 'auto' }}>
                Estamos trabalhando em novos módulos de análise, incluindo produtividade de separação, 
                relatórios de divergências de notas fiscais e indicadores de gamificação.
              </Typography>
            </MotionPaper>
          </Grid>
        </Grid>
      </AppLayout>
    </ProtectedRoute>
  );
}

(Relatorios as any).usesAppLayout = true;
