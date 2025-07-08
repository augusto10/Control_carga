import { Card, CardContent, Typography, Box } from '@mui/material';
import { motion } from 'framer-motion';

interface ModernCardProps {
  title: string;
  content: string;
  icon: React.ReactNode;
  color?: string;
}

const ModernCard: React.FC<ModernCardProps> = ({ title, content, icon, color = '#F6A623' }) => {
  // Layout moderno e responsivo
  return (
    <motion.div whileHover={{ scale: 1.04, boxShadow: '0 8px 32px rgba(0,0,0,0.10)' }} style={{ height: '100%' }}>
      <Card
        sx={{
          height: { xs: 160, sm: 180, md: 200, lg: 220 },
          minWidth: { xs: 220, sm: 240, md: 260, lg: 280 },
          maxWidth: { xs: 320, sm: 340, md: 360, lg: 380 },
          borderRadius: 4,
          boxShadow: '0 4px 18px rgba(0,0,0,0.10)',
          transition: 'box-shadow 0.2s',
          background: '#fff',
          p: 0,
          mx: 'auto',
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: { xs: 3, sm: 4, md: 5 } }}>
          <Box
            sx={{
              mx: 'auto',
              mb: { xs: 2, md: 3 },
              width: { xs: 72, sm: 90, md: 110 },
              height: { xs: 72, sm: 90, md: 110 },
              borderRadius: '50%',
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            }}
          >
            {icon}
          </Box>
          <Typography
            variant="h6"
            sx={{
              mt: { xs: 1, md: 2 },
              fontWeight: 700,
              color: 'text.primary',
              fontSize: { xs: 22, sm: 26, md: 30 },
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{ mt: 1, fontSize: { xs: 15, sm: 17, md: 19 } }}
          >
            {content}
          </Typography>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ModernCard;
