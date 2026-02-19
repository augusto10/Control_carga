import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { obterRanking } from '../services/gamificacaoService';
import { RankingResponse } from '../services/gamificacaoService';

interface RankingComponentProps {
  currentUserId?: string;
  compact?: boolean;
}

const RankingComponent: React.FC<RankingComponentProps> = ({ 
  currentUserId, 
  compact = false 
}) => {
  const [ranking, setRanking] = useState<RankingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    carregarRanking();
  }, []);

  const carregarRanking = async () => {
    try {
      setLoading(true);
      const dadosRanking = await obterRanking();
      setRanking(dadosRanking);
    } catch (err) {
      setError('Erro ao carregar ranking');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPosicaoCor = (posicao: number) => {
    switch (posicao) {
      case 1: return '#FFD700'; // Ouro
      case 2: return '#C0C0C0'; // Prata
      case 3: return '#CD7F32'; // Bronze
      default: return '#f5f5f5';
    }
  };

  const getPosicaoIcon = (posicao: number) => {
    switch (posicao) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${posicao}`;
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (compact) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Top 5 Ranking
        </Typography>
        <List dense>
          {ranking.slice(0, 5).map((item) => (
            <ListItem key={item.usuario.id} sx={{ 
              bgcolor: item.usuario.id === currentUserId ? 'primary.light' : 'transparent',
              borderRadius: 1,
              mb: 0.5
            }}>
              <ListItemAvatar>
                <Avatar 
                  src={item.usuario?.foto || undefined}
                  sx={{ width: 32, height: 32 }}
                >
                  {(item.usuario?.nome?.charAt(0)?.toUpperCase() ?? '?')}
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Typography variant="body2" fontWeight="medium">
                      {item.usuario?.nome ?? '-'}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body2" color="primary">
                        {item.pontuacaoTotal} pts
                      </Typography>
                      <Chip 
                        label={getPosicaoIcon(item.posicao)} 
                        size="small"
                        sx={{ 
                          bgcolor: getPosicaoCor(item.posicao),
                          color: item.posicao <= 3 ? 'white' : 'text.primary',
                          fontWeight: 'bold'
                        }}
                      />
                    </Box>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom display="flex" alignItems="center">
        <EmojiEventsIcon sx={{ mr: 1, color: '#FFD700' }} />
        Ranking de Pontuação
      </Typography>
      
      <Grid container spacing={2}>
        {ranking.slice(0, 10).map((item) => (
          <Grid item xs={12} key={item.usuario.id}>
            <Card
              sx={{
                bgcolor: item.usuario.id === currentUserId ? 'primary.light' : 'background.paper',
                border: item.usuario.id === currentUserId ? '2px solid' : 'none',
                borderColor: 'primary.main',
              }}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: getPosicaoCor(item.posicao),
                        color: item.posicao <= 3 ? 'white' : 'text.primary',
                        fontWeight: 'bold',
                        fontSize: '1.2rem',
                      }}
                    >
                      {getPosicaoIcon(item.posicao)}
                    </Box>
                    
                    <Avatar 
                      src={item.usuario?.foto || undefined}
                      sx={{ width: 50, height: 50 }}
                    >
                      {(item.usuario?.nome?.charAt(0)?.toUpperCase() ?? '?')}
                    </Avatar>
                    
                    <Box>
                      <Typography variant="h6" component="div">
                        {item.usuario?.nome ?? '-'}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box textAlign="right">
                    <Typography variant="h4" color="primary">
                      {item.pontuacaoTotal}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      pontos
                    </Typography>
                    <Box display="flex" gap={1} mt={1}>
                      <Chip 
                        label={`✓ ${item.pedidosCorretos}`} 
                        size="small" 
                        color="success" 
                        variant="outlined"
                      />
                      <Chip 
                        label={`✗ ${item.pedidosIncorretos}`} 
                        size="small" 
                        color="error" 
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default RankingComponent;
