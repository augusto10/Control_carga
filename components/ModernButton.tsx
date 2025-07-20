import { Button, CircularProgress, ButtonProps } from '@mui/material';
import { motion } from 'framer-motion';
import React from 'react';

interface ModernButtonProps extends Omit<ButtonProps, 'loading'> {
  children: React.ReactNode;
  loading?: boolean;
}

const ModernButton: React.FC<ModernButtonProps> = ({ children, loading, ...props }) => {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <Button
        variant="contained"
        size="large"
        disabled={loading}
        sx={{
          borderRadius: 3,
          fontWeight: 600,
          boxShadow: '0 4px 14px rgba(0, 118, 255, 0.2)',
        }}
        {...props}
      >
        {loading ? (
          <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
        ) : null}
        {children}
      </Button>
    </motion.div>
  );
};

export default ModernButton;
