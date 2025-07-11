import { DataGrid, ptBR } from '@mui/x-data-grid';
import { useTheme } from '@mui/material/styles';

const ModernDataGrid = ({ rows, columns, ...props }) => {
  const theme = useTheme();
  
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      autoHeight
      pageSize={5}
      rowsPerPageOptions={[5]}
      disableSelectionOnClick
      localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
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
