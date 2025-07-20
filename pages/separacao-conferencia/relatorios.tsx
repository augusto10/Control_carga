import { Container, Typography, Card, CardContent, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';

interface NotaFiscal {
  id: string;
  codigo: string;
  numeroNota: string;
  controle: {
    id: string;
    dataConferencia: string | null;
    auditoriaRealizada: boolean;
    auditoriaComErro: boolean | null;
  } | null;
}

export default function RelatoriosPage() {
  const { user } = useAuth();
  const [notasConferidas, setNotasConferidas] = useState<NotaFiscal[]>([]);

  useEffect(() => {
    async function fetchNotasConferidas() {
      try {
        const response = await fetch('/api/notas?conferidas=true');
        if (!response.ok) {
          throw new Error('Falha ao buscar notas conferidas');
        }
        const data: NotaFiscal[] = await response.json();
        setNotasConferidas(data);
      } catch (error) {
        console.error(error);
      }
    }

    fetchNotasConferidas();
  }, []);

  const handleAuditar = (notaId: string) => {
    // Lógica para navegar para a página de auditoria
    console.log(`Auditar nota ${notaId}`);
  };

  return (
    <Container maxWidth="lg">
      <Card sx={{ mt: 4, p: 2, boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)', borderRadius: '10px' }}>
        <CardContent>
          <Typography variant="h5" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
            RELATÓRIO DE PEDIDOS CONFERIDOS
          </Typography>
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Nº do Pedido</TableCell>
                  <TableCell>Nº da Nota Fiscal</TableCell>
                  <TableCell>Data da Conferência</TableCell>
                  <TableCell>Status Auditoria</TableCell>
                  <TableCell align="right">Ações</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {notasConferidas.map((nota) => (
                  <TableRow key={nota.id}>
                    <TableCell>{nota.codigo}</TableCell>
                    <TableCell>{nota.numeroNota}</TableCell>
                    <TableCell>{nota.controle?.dataConferencia ? new Date(nota.controle.dataConferencia).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell>
                      {nota.controle?.auditoriaRealizada ? (nota.controle?.auditoriaComErro ? 'Com Erro' : 'OK') : 'Pendente'}
                    </TableCell>
                    <TableCell align="right">
                      {(user as any)?.tipo === 'AUDITOR' && !nota.controle?.auditoriaRealizada && (
                        <Button variant="contained" size="small" onClick={() => handleAuditar(nota.id)}>
                          Auditar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Container>
  );
}
