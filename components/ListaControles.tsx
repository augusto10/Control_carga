import { useState } from 'react';
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import { useAssinaturas } from '../hooks/useAssinaturas';
import StatusAssinatura from './StatusAssinatura';
import VisualizarAssinatura from './VisualizarAssinatura';

interface Controle {
  id: string;
  motorista: string;
  responsavel: string;
  cpfMotorista: string;
  numeroManifesto: string | null;
  dataCriacao: string;
  finalizado: boolean;
}

export default function ListaControles({ controles }: { controles: Controle[] }) {
  const [controleSelecionado, setControleSelecionado] = useState<Controle | null>(null);
  const [openVisualizar, setOpenVisualizar] = useState(false);

  const handleVisualizarAssinatura = (controle: Controle) => {
    setControleSelecionado(controle);
    setOpenVisualizar(true);
  };

  const handleCloseVisualizar = () => {
    setOpenVisualizar(false);
    setControleSelecionado(null);
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Manifesto</TableCell>
              <TableCell>Motorista</TableCell>
              <TableCell>Responsável</TableCell>
              <TableCell>Data</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {controles.map((controle) => (
              <TableRow key={controle.id}>
                <TableCell>{controle.numeroManifesto}</TableCell>
                <TableCell>{controle.motorista}</TableCell>
                <TableCell>{controle.responsavel}</TableCell>
                <TableCell>{new Date(controle.dataCriacao).toLocaleDateString()}</TableCell>
                <TableCell>
                  <StatusAssinatura
                    assinaturas={{
                      motorista: controle.finalizado ? 'ASSINADO' : 'PENDENTE',
                      responsavel: controle.finalizado ? 'ASSINADO' : 'PENDENTE',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Visualizar assinaturas">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleVisualizarAssinatura(controle)}
                    >
                      Assinaturas
                    </Button>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {controleSelecionado && (
        <VisualizarAssinatura
          open={openVisualizar}
          onClose={handleCloseVisualizar}
          signedFileUrl={controleSelecionado.finalizado ? 
            `http://localhost:3001/api/controles/${controleSelecionado.id}/pdf` : null}
        />
      )}
    </>
  );
}
