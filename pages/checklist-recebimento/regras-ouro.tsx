import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Typography,
  Paper,
  Button,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  alpha,
  useTheme
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import ProtectedRoute from '../../components/ProtectedRoute';

const RegrasOuroPage = () => {
  const theme = useTheme();
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleContinuar = () => {
    if (aceitouTermos) {
      // Marcar que o usuário aceitou as regras
      sessionStorage.setItem('aceitouRegrasOuro', 'true');
      router.push('/checklist-recebimento');
    }
  };

  const regrasOuro = [
    "Não receber produtos avariados",
    "Mantenha a área de conferência organizada",
    "Utilize pallets no processo de conferência, não colocar produtos no chão",
    "A utilização do Pocket é obrigatória, qualquer exceção deve ser informada ao líder de logística e compras",
    "Itens com vencimentos devem ser totalmente batidos e conferidos item a item que pertencerem ao mesmo lote e vencimento",
    "É obrigatório o preenchimento dos vencimentos e Lotes no pocket",
    "Não receber produtos com vencimento menor que 8 meses a contar da data do recebimento em nosso armazém",
    "Toda e qualquer divergência deve ser primeiramente apontada ao Líder da Logística e posteriormente informada ao time de compras",
    "Em hipótese alguma os entregadores devem ficar sozinhos com as mercadorias no momento do recebimento",
    "Atenção aos riscos de subtração e furto aos produtos que estão sendo conferidos fora do armazém",
    "Sempre utilizar áreas que estão sendo monitoradas por câmeras para realização de conferências, evitar áreas onde o veículo do entregador impossibilite a visão das câmeras",
    "Ao término da conferência os produtos devem ser direcionados para dentro do Armazém evitando exposições desnecessárias",
    "Proibido manter produtos em recebimento fora do armazém juntamente com os veículos que estão realizando os embarques/coleta"
  ];

  return (
    <ProtectedRoute>
      <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          {/* Cabeçalho */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <SecurityIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            <Typography variant="h3" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Regras de Ouro
            </Typography>
            <Typography variant="h6" color="text.secondary">
              Orientações de Conferência - Recebimento de Produtos
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Alerta de importância */}
          <Alert 
            severity="warning" 
            variant="standard"
            sx={{ 
              mb: 3,
              borderRadius: '16px',
              backdropFilter: 'blur(12px)',
              backgroundColor: alpha(theme.palette.warning.main, 0.15),
              color: theme.palette.warning.dark,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
              '& .MuiAlert-icon': {
                color: theme.palette.warning.main,
              },
              boxShadow: `0 8px 32px 0 ${alpha(theme.palette.common.black, 0.1)}`,
              fontWeight: 600,
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              ⚠️ ATENÇÃO: É obrigatório ler e aceitar todas as regras antes de prosseguir com o checklist de recebimento.
            </Typography>
          </Alert>

          {/* Lista de regras */}
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <AssignmentIcon color="primary" />
            Regras Obrigatórias de Conferência
          </Typography>

          <List>
            {regrasOuro.map((regra, index) => (
              <ListItem key={index} sx={{ mb: 1 }}>
                <ListItemIcon>
                  <CheckCircleIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {regra}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>

          <Divider sx={{ my: 3 }} />

          {/* Seção de destaque para regras críticas */}
          <Paper elevation={1} sx={{ p: 3, bgcolor: 'error.light', color: 'error.contrastText', mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WarningIcon />
              Regras Críticas de Segurança
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              • <strong>Vencimento mínimo:</strong> 8 meses a partir da data de recebimento
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              • <strong>Uso obrigatório do Pocket</strong> para todos os recebimentos
            </Typography>
            <Typography variant="body1">
              • <strong>Supervisão constante:</strong> Entregadores nunca devem ficar sozinhos com mercadorias
            </Typography>
          </Paper>

          {/* Checkbox de aceitação */}
          <Box sx={{ mt: 4, p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={aceitouTermos}
                  onChange={(e) => setAceitouTermos(e.target.checked)}
                  color="primary"
                  size="large"
                />
              }
              label={
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Li, compreendi e aceito todas as Regras de Ouro para Conferência de Recebimento
                </Typography>
              }
            />
          </Box>

          {/* Botões de ação */}
          <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => router.back()}
              size="large"
            >
              Voltar
            </Button>

            <Button
              variant="contained"
              onClick={handleContinuar}
              disabled={!aceitouTermos}
              size="large"
              sx={{ minWidth: 200 }}
            >
              Li e Aceito - Continuar
            </Button>
          </Box>

          {/* Informações do usuário */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Usuário: {user?.nome} | Data: {new Date().toLocaleDateString('pt-BR')}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </ProtectedRoute>
  );
};

export default RegrasOuroPage;
