import React, { useEffect, useState } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  CircularProgress, 
  Alert,
  Chip
} from '@mui/material';
import api from '../../services/api'; // Ajuste o caminho se necessário
import { format } from 'date-fns';

// Tipagem para os dados do relatório
interface Pedido {
  id: string;
  numeroPedido: string;
}

interface Usuario {
  nome: string;
}

interface Conferencia {
  id: string;
  dataConferencia: string;
  pedido100: boolean;
  inconsistencia: boolean;
  pedidos: Pedido[]; // Correção: a API retorna uma lista de pedidos
  separador: Usuario | null;
  auditor: Usuario | null;
  conferente: Usuario | null;
}

const RelatorioConferencias = () => {
  const [conferencias, setConferencias] = useState<Conferencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConferencias = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/relatorios/conferencias');
        setConferencias(response.data);
        setError(null);
      } catch (err) {
        setError('Falha ao carregar o relatório. Tente novamente mais tarde.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchConferencias();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
        Relatório de Conferências
      </Typography>
      {loading ? (
        <CircularProgress />
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper} sx={{ boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', borderRadius: '10px' }}>
          <Table sx={{ minWidth: 650 }} aria-label="simple table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nº Pedido</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Data Conferência</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Separador</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Auditor</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Conferente</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Pedido 100%</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Inconsistência</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conferencias.map((conf) => (
                <TableRow key={conf.id}>
                  <TableCell>{conf.pedidos && conf.pedidos.length > 0 ? conf.pedidos[0].numeroPedido : 'N/A'}</TableCell>
                  <TableCell>{format(new Date(conf.dataConferencia), 'dd/MM/yyyy HH:mm')}</TableCell>
                  <TableCell>{conf.separador?.nome || 'N/A'}</TableCell>
                  <TableCell>{conf.auditor?.nome || 'N/A'}</TableCell>
                  <TableCell>{conf.conferente?.nome || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={conf.pedido100 ? 'Sim' : 'Não'} 
                      color={conf.pedido100 ? 'success' : 'default'} 
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={conf.inconsistencia ? 'Sim' : 'Não'} 
                      color={conf.inconsistencia ? 'error' : 'default'} 
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Container>
  );
};

export default RelatorioConferencias;

