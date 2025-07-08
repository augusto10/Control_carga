import LoadingButton from '@mui/lab/LoadingButton';
import { motion } from 'framer-motion';

const ModernButton = ({ children, ...props }) => {
  return (
    <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
      <LoadingButton
        variant="contained"
        size="large"
        sx={{
          borderRadius: 3,
          fontWeight: 600,
          boxShadow: '0 4px 14px rgba(0, 118, 255, 0.2)',
        }}
        {...props}
      >
        {children}
      </LoadingButton>
    </motion.div>
  );
};

export default ModernButton;
