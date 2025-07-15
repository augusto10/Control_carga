import { DataGrid } from '@mui/x-data-grid';

import { useTheme } from '@mui/material/styles';

import { GridColDef, DataGridProps } from '@mui/x-data-grid';

interface ModernDataGridProps extends Omit<DataGridProps, 'rows' | 'columns'> {
  rows: any[];
  columns: GridColDef[];
}

const ModernDataGrid = ({ rows, columns, ...props }: ModernDataGridProps) => {
  const theme = useTheme();
  
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      autoHeight
      pageSizeOptions={[5]}
      initialState={{
        pagination: { paginationModel: { pageSize: 5, page: 0 } }
      }}
      disableRowSelectionOnClick
      sx={{
        '& .MuiDataGrid-columnHeaders': {
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.common.white,
          fontSize: '1rem',
        },
        '& .MuiDataGrid-cell': {
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
        borderRadius: '16px',
        boxShadow: theme.shadows[1],
      }}
      {...props}
    />
  );
};

export default ModernDataGrid;
