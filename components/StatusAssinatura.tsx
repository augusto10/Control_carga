import { Box, Chip, Tooltip } from '@mui/material';
import { Check, Pending, Error } from '@mui/icons-material';

interface StatusAssinaturaProps {
  assinaturas: {
    motorista: 'PENDENTE' | 'ASSINADO' | null;
    responsavel: 'PENDENTE' | 'ASSINADO' | null;
  };
}

export default function StatusAssinatura({ assinaturas }: StatusAssinaturaProps) {
  const getStatusColor = (status: 'PENDENTE' | 'ASSINADO' | null) => {
    switch (status) {
      case 'ASSINADO':
        return 'success';
      case 'PENDENTE':
        return 'warning';
      default:
        return 'error';
    }
  };

  const getStatusIcon = (status: 'PENDENTE' | 'ASSINADO' | null) => {
    switch (status) {
      case 'ASSINADO':
        return <Check />;
      case 'PENDENTE':
        return <Pending />;
      default:
        return <Error />;
    }
  };

  const getStatusText = (status: 'PENDENTE' | 'ASSINADO' | null) => {
    switch (status) {
      case 'ASSINADO':
        return 'Assinado';
      case 'PENDENTE':
        return 'Pendente';
      default:
        return 'Não iniciado';
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Tooltip title={`Motorista: ${getStatusText(assinaturas.motorista)}`}>
        <Chip
          icon={getStatusIcon(assinaturas.motorista)}
          label="M"
          color={getStatusColor(assinaturas.motorista)}
          size="small"
        />
      </Tooltip>
      <Tooltip title={`Responsável: ${getStatusText(assinaturas.responsavel)}`}>
        <Chip
          icon={getStatusIcon(assinaturas.responsavel)}
          label="R"
          color={getStatusColor(assinaturas.responsavel)}
          size="small"
        />
      </Tooltip>
    </Box>
  );
}
