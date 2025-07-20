import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React, { useState } from 'react';

interface ModernDataGridProps {
  rows: any[];
  columns: { field: string; headerName: string; width?: number }[];
  [key: string]: any;
}

const ModernDataGrid: React.FC<ModernDataGridProps> = ({ rows, columns, ...props }) => {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper
      sx={{
        borderRadius: '16px',
        boxShadow: theme.shadows[1],
        overflow: 'hidden'
      }}
      {...props}
    >
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: theme.palette.primary.main,
                '& .MuiTableCell-head': {
                  color: theme.palette.common.white,
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }
              }}
            >
              {columns.map((column) => (
                <TableCell key={column.field} sx={{ width: column.width }}>
                  {column.headerName}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.map((row, index) => (
              <TableRow
                key={row.id || index}
                sx={{
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover
                  },
                  '& .MuiTableCell-body': {
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.field}>
                    {row[column.field]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25]}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </Paper>
  );
};

export default ModernDataGrid;
