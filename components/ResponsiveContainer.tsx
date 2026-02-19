import React from 'react';
import {
  Container,
  Box,
  useTheme,
  useMediaQuery,
  Typography,
  Breadcrumbs,
  Link,
  Paper
} from '@mui/material';
import { motion } from 'framer-motion';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | false;
  disablePadding?: boolean;
  showPaper?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs,
  maxWidth = 'lg',
  disablePadding = false,
  showPaper = true
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const containerPadding = isMobile ? 1 : isTablet ? 2 : 3;

  return (
    <Container 
      maxWidth={maxWidth} 
      sx={{ 
        py: containerPadding,
        px: isMobile ? 1 : 2,
        minHeight: 'calc(100vh - 64px)',
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header Section */}
        {(title || breadcrumbs) && (
          <Box sx={{ mb: 3 }}>
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                sx={{ 
                  mb: 1,
                  '& .MuiBreadcrumbs-separator': {
                    color: theme.palette.primary.main,
                  }
                }}
              >
                {breadcrumbs.map((crumb, index) => (
                  <Link
                    key={index}
                    color={index === breadcrumbs.length - 1 ? 'text.primary' : 'primary'}
                    href={crumb.href}
                    underline="hover"
                    sx={{
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      fontWeight: index === breadcrumbs.length - 1 ? 600 : 400,
                    }}
                  >
                    {crumb.label}
                  </Link>
                ))}
              </Breadcrumbs>
            )}

            {/* Title */}
            {title && (
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                component="h1"
                sx={{
                  fontWeight: 700,
                  color: 'text.primary',
                  mb: subtitle ? 1 : 0,
                  lineHeight: 1.2,
                }}
              >
                {title}
              </Typography>
            )}

            {/* Subtitle */}
            {subtitle && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  fontSize: isMobile ? '0.9rem' : '1rem',
                  lineHeight: 1.5,
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>
        )}

        {/* Content Section */}
        {showPaper ? (
          <Paper
            elevation={isMobile ? 1 : 2}
            sx={{
              borderRadius: isMobile ? 2 : 3,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Box
              sx={{
                p: disablePadding ? 0 : isMobile ? 2 : 3,
              }}
            >
              {children}
            </Box>
          </Paper>
        ) : (
          <Box
            sx={{
              p: disablePadding ? 0 : isMobile ? 1 : 2,
            }}
          >
            {children}
          </Box>
        )}
      </motion.div>
    </Container>
  );
};

export default ResponsiveContainer;
