import React from 'react';
import Head from 'next/head';
import { Container, Box, Grid } from '@mui/material';
import { motion } from 'framer-motion';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
  return (
    <>
      <Head>
        <title>Controle de Carga</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Container maxWidth="lg">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Box
            sx={{
              minHeight: '100vh',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              py: 4,
            }}
          >
            <Grid container spacing={3}>
              <Grid item xs={12}>
                {children}
              </Grid>
            </Grid>
            <Box component="footer" sx={{ mt: 6, textAlign: 'center', color: 'text.secondary', fontSize: 14 }}>
              &copy; {new Date().getFullYear()} Controle de Carga. Todos os direitos reservados.
            </Box>
          </Box>
        </motion.div>
      </Container>
    </>
  );
};

export default ResponsiveLayout;
