import React, { ReactNode } from 'react';
import { Box, Stack, Avatar, Typography, Paper } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';

const MotionPaper = motion(Paper);

interface VisualPageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  headerActions?: ReactNode;
  search?: ReactNode;
  children: ReactNode;
}

export default function VisualPageLayout({
  title,
  subtitle,
  icon,
  headerActions,
  search,
  children
}: VisualPageLayoutProps) {
  const theme = useTheme();

  return (
    <Box>
      <MotionPaper
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        sx={{
          p: 3,
          mb: 3,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          borderRadius: 2,
          backdropFilter: 'blur(8px)',
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={2}>
          <Avatar
            sx={{
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
              boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.25)}`
            }}
          >
            {icon ?? null}
          </Avatar>

          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold" color="primary.main" gutterBottom>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="body1" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>

          {headerActions && <Stack direction="row" spacing={2}>{headerActions}</Stack>}
        </Stack>
      </MotionPaper>

      {search && (
        <MotionPaper
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          sx={{
            p: 2,
            mb: 3,
            background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)} 0%, ${alpha(theme.palette.background.paper, 0.75)} 100%)`,
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            borderRadius: 2,
            backdropFilter: 'blur(6px)'
          }}
        >
          {search}
        </MotionPaper>
      )}

      <MotionPaper
        elevation={0}
        sx={{
          p: { xs: 2, md: 3 },
          mb: 4,
          borderRadius: '16px',
          border: '1px solid',
          borderColor: alpha(theme.palette.divider, 0.12),
          bgcolor: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(8px)',
          // Esconder títulos h4 das páginas para evitar títulos duplicados
          '& .MuiTypography-root.MuiTypography-h4, & h1, & h2, & h3, & h4': {
            display: 'none'
          }
        }}
      >
        {children}
      </MotionPaper>
    </Box>
  );
}