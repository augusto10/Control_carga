import { Container, Typography, Box, Card, CardContent, CardActionArea, Grid } from '@mui/material';
import Link from 'next/link';
import {
  Add as AddIcon,
  NoteAdd as NoteAddIcon,
  Search as SearchIcon,
  ListAlt as ListAltIcon
} from '@mui/icons-material';

type MenuCard = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
};

export default function Home() {
  const menuCards: MenuCard[] = [
    {
      title: 'Adicionar Notas',
      description: 'Adicione novas notas fiscais ao sistema',
      icon: <NoteAddIcon sx={{ fontSize: 40 }} />,
      href: '/adicionar-notas',
      color: '#1976d2',
    },
    {
      title: 'Criar Controle',
      description: 'Crie um novo controle de cargas',
      icon: <AddIcon sx={{ fontSize: 40 }} />,
      href: '/criar-controle',
      color: '#2e7d32',
    },
    {
      title: 'Consultar Notas',
      description: 'Consulte notas fiscais cadastradas',
      icon: <SearchIcon sx={{ fontSize: 40 }} />,
      href: '/listar-notas',
      color: '#ed6c02',
    },
    {
      title: 'Consultar Controles',
      description: 'Consulte os controles de cargas existentes',
      icon: <ListAltIcon sx={{ fontSize: 40 }} />,
      href: '/listar-controles',
      color: '#9c27b0',
    },
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          Controle de Cargas Esplendor
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Sistema de gerenciamento de cargas e notas fiscais
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {menuCards.map((card) => (
          <Grid item xs={12} sm={6} key={card.title}>
            <Link href={card.href} passHref style={{ textDecoration: 'none' }}>
              <Card 
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  },
                }}
              >
                <CardActionArea sx={{ p: 3, height: '100%' }}>
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      textAlign: 'center',
                      color: card.color
                    }}
                  >
                    {card.icon}
                    <Typography variant="h6" component="div" sx={{ mt: 2, color: 'text.primary' }}>
                      {card.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {card.description}
                    </Typography>
                  </Box>
                </CardActionArea>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
