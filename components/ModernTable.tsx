import React, { useState } from 'react';
import {
  Box,
  Paper,
  useTheme,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Checkbox,
  TextField,
  InputAdornment,
  CircularProgress,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

interface ModernTableColumn<T> {
  accessorKey: string;
  header: string;
  size?: number;
  Cell?: ({ cell }: { cell: { getValue: () => any } }) => React.ReactNode;
}

interface ModernTableProps<T extends object> {
  columns: ModernTableColumn<T>[];
  data: T[];
  title?: string;
  isLoading?: boolean;
  enableRowSelection?: boolean;
  onRowSelectionChange?: (rows: T[]) => void;
  initialState?: object;
}

function ModernTable<T extends object>({
  columns,
  data,
  title,
  isLoading = false,
  enableRowSelection = false,
  onRowSelectionChange,
  initialState,
}: ModernTableProps<T>) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Garantia de arrays válidos para evitar erros de runtime
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  // Filtrar dados baseado na busca
  const filteredData = safeData.filter((row: any) =>
    safeColumns.some(column =>
      String(row[column.accessorKey] || '')
        .toLowerCase()
        .includes(searchTerm.toLowerCase())
    )
  );

  // Paginar dados
  const paginatedData = filteredData.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSelectRow = (index: number) => {
    const newSelectedRows = new Set(selectedRows);
    if (newSelectedRows.has(index)) {
      newSelectedRows.delete(index);
    } else {
      newSelectedRows.add(index);
    }
    setSelectedRows(newSelectedRows);
    
    if (onRowSelectionChange) {
      const selectedData = Array.from(newSelectedRows).map(i => filteredData[i]);
      onRowSelectionChange(selectedData);
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.size === filteredData.length) {
      setSelectedRows(new Set());
      onRowSelectionChange?.([]);
    } else {
      const allIndices = new Set(filteredData.map((_, index) => index));
      setSelectedRows(allIndices);
      onRowSelectionChange?.(filteredData);
    }
  };

  return (
    <Paper elevation={3} sx={{ borderRadius: 3, mt: 2 }}>
      {title && (
        <Box px={3} pt={3} pb={1}>
          <Typography variant="h5" fontWeight={700} color={theme.palette.primary.main}>
            {title}
          </Typography>
        </Box>
      )}
      
      <Box px={3} pb={2}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Buscar..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: theme.palette.primary.light,
                '& .MuiTableCell-head': {
                  color: theme.palette.primary.contrastText,
                  fontWeight: 700,
                  fontSize: 16
                }
              }}
            >
              {enableRowSelection && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedRows.size > 0 && selectedRows.size < filteredData.length}
                    checked={filteredData.length > 0 && selectedRows.size === filteredData.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
              )}
              {safeColumns.map((column) => (
                <TableCell key={column.accessorKey} sx={{ width: column.size }}>
                  {column.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={safeColumns.length + (enableRowSelection ? 1 : 0)} align="center">
                  <Box py={4}>
                    <CircularProgress />
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row: any, index) => (
                <TableRow
                  key={index}
                  hover
                  selected={selectedRows.has(index)}
                  sx={{
                    transition: 'background 0.2s',
                    '& .MuiTableCell-body': {
                      fontSize: 15
                    }
                  }}
                >
                  {enableRowSelection && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedRows.has(index)}
                        onChange={() => handleSelectRow(index)}
                      />
                    </TableCell>
                  )}
                  {safeColumns.map((column) => (
                    <TableCell key={column.accessorKey}>
                      {column.Cell ? (
                        column.Cell({ cell: { getValue: () => row[column.accessorKey] } })
                      ) : (
                        row[column.accessorKey]
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={filteredData.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        rowsPerPageOptions={[5, 10, 25, 50]}
        labelRowsPerPage="Linhas por página:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
      />
    </Paper>
  );
}

export default ModernTable;
