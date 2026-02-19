import React from 'react';
import { MaterialReactTable, MRT_ColumnDef } from 'material-react-table';
import { Box, Paper, useTheme } from '@mui/material';

interface ModernTableProps<T extends object> {
  // @ts-ignore: Tipagem ignorada devido à ausência de tipos do material-react-table
  columns: any[];
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

  // Garantia de arrays válidos para evitar erros de runtime
  const safeColumns = Array.isArray(columns) ? columns : [];
  const safeData = Array.isArray(data) ? data : [];

  return (
    <Paper elevation={3} sx={{ borderRadius: 3, mt: 2 }}>
      {title && (
        <Box px={3} pt={3} pb={1}>
          <Box component="h2" fontWeight={700} fontSize={22} color={theme.palette.primary.main}>
            {title}
          </Box>
        </Box>
      )}
      <MaterialReactTable
        columns={safeColumns}
        data={safeData}
        state={{ isLoading, ...initialState }}
        enableRowSelection={enableRowSelection}
        onRowSelectionChange={onRowSelectionChange}
        muiTablePaperProps={{ sx: { boxShadow: 'none', borderRadius: 3 } }}
        muiTableContainerProps={{ sx: { borderRadius: 3 } }}
        muiTableHeadCellProps={{ sx: { fontWeight: 700, fontSize: 16, background: theme.palette.primary.light, color: theme.palette.primary.contrastText } }}
        muiTableBodyCellProps={{ sx: { fontSize: 15 } }}
        muiToolbarAlertBannerProps={{ sx: { borderRadius: 3 } }}
        muiTableBodyRowProps={{ hover: true, sx: { transition: 'background 0.2s' } }}
        muiTablePaginationProps={{ rowsPerPageOptions: [5, 10, 25, 50], labelRowsPerPage: 'Linhas por página' }}
        localization={{
          language: 'pt',
          actions: 'Ações',
          showHideColumns: 'Mostrar/Esconder Colunas',
          search: 'Buscar',
          // Adicione mais traduções conforme necessário
        }}
      />
    </Paper>
  );
}

export default ModernTable;
