import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Box,
  Card,
  CardContent,
  Typography,
  useMediaQuery,
  useTheme,
  Chip,
  Stack
} from '@mui/material';

interface Column {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
  format?: (value: any) => string;
  hideOnMobile?: boolean;
  mobileLabel?: string;
}

interface ResponsiveTableProps {
  columns: Column[];
  rows: any[];
  onRowClick?: (row: any) => void;
  actions?: (row: any) => React.ReactNode;
  emptyMessage?: string;
}

const ResponsiveTable: React.FC<ResponsiveTableProps> = ({
  columns,
  rows,
  onRowClick,
  actions,
  emptyMessage = "Nenhum item encontrado"
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  if (isMobile) {
    // Renderização mobile - Cards
    return (
      <Box sx={{ width: '100%' }}>
        {rows.length === 0 ? (
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {emptyMessage}
            </Typography>
          </Card>
        ) : (
          <Stack spacing={2}>
            {rows.map((row, index) => (
              <Card
                key={index}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                  '&:hover': onRowClick ? {
                    transform: 'translateY(-2px)',
                    boxShadow: theme.shadows[4],
                  } : {},
                }}
                onClick={() => onRowClick?.(row)}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  {columns
                    .filter(col => !col.hideOnMobile)
                    .map((column) => {
                      const value = row[column.id];
                      const displayValue = column.format ? column.format(value) : value;
                      
                      return (
                        <Box key={column.id} sx={{ mb: 1.5, '&:last-child': { mb: 0 } }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ 
                              display: 'block',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              mb: 0.5
                            }}
                          >
                            {column.mobileLabel || column.label}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              color: 'text.primary',
                              wordBreak: 'break-word'
                            }}
                          >
                            {displayValue || '-'}
                          </Typography>
                        </Box>
                      );
                    })}
                  
                  {actions && (
                    <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                      {actions(row)}
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    );
  }

  // Renderização desktop - Tabela tradicional
  return (
    <TableContainer 
      component={Paper} 
      sx={{ 
        borderRadius: 2,
        boxShadow: theme.shadows[2],
        overflow: 'hidden'
      }}
    >
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ 
                  minWidth: column.minWidth,
                  fontWeight: 600,
                  backgroundColor: theme.palette.grey[50],
                  color: theme.palette.text.primary
                }}
              >
                {column.label}
              </TableCell>
            ))}
            {actions && (
              <TableCell
                align="center"
                style={{
                  minWidth: 120,
                  fontWeight: 600,
                  backgroundColor: theme.palette.grey[50],
                  color: theme.palette.text.primary
                }}
              >
                Ações
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell 
                colSpan={columns.length + (actions ? 1 : 0)} 
                align="center"
                sx={{ py: 4 }}
              >
                <Typography variant="body2" color="text.secondary">
                  {emptyMessage}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, index) => (
              <TableRow
                hover
                key={index}
                sx={{
                  cursor: onRowClick ? 'pointer' : 'default',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  }
                }}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => {
                  const value = row[column.id];
                  const displayValue = column.format ? column.format(value) : value;
                  
                  return (
                    <TableCell key={column.id} align={column.align}>
                      {displayValue || '-'}
                    </TableCell>
                  );
                })}
                {actions && (
                  <TableCell align="center">
                    {actions(row)}
                  </TableCell>
                )}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResponsiveTable;
