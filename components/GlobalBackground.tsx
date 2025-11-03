import { Box } from '@mui/material';
import { ReactNode } from 'react';

interface GlobalBackgroundProps {
  children: ReactNode;
}

export default function GlobalBackground({ children }: GlobalBackgroundProps) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `
          linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%),
          radial-gradient(circle at 20% 80%, rgba(25, 118, 210, 0.05) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 107, 53, 0.05) 0%, transparent 50%)
        `,
        backgroundAttachment: 'fixed',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e2e8f0' fill-opacity='0.3'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")
          `,
          opacity: 0.4,
          pointerEvents: 'none',
          zIndex: -1,
        },
        '&::after': {
          content: '""',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'linear-gradient(45deg, transparent 49%, rgba(255,255,255,0.02) 50%, transparent 51%)',
          pointerEvents: 'none',
          zIndex: -1,
        }
      }}
    >
      {children}
    </Box>
  );
}
