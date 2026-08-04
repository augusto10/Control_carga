import { Alert, Box, Button, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import { QzStatus } from '@/types/labels';
import { isZplCompatiblePrinter } from '@/services/qz-print';

interface PrinterSelectorProps {
  printers: string[];
  printer: string;
  onChange: (value: string) => void;
  status: QzStatus;
  onInstall: () => void;
  onRetry: () => void;
}

export function PrinterSelector({
  printers,
  printer,
  onChange,
  status,
  onInstall,
  onRetry,
}: PrinterSelectorProps) {
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="subtitle1" fontWeight={800}>
          Impressora para etiquetas
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Impressoras Zebra/ZDesigner usam impressao direta em ZPL pelo QZ Tray. As demais impressoras usam a janela de impressao do navegador.
        </Typography>
      </Box>

      {status.code !== 'connected' && (
        <Alert
          severity={status.code === 'authorization_required' ? 'info' : 'warning'}
          action={(
            <Stack direction="row" spacing={1}>
              {status.code === 'not_installed' && (
                <Button color="inherit" size="small" onClick={onInstall} sx={{ borderRadius: 1, fontWeight: 500, minHeight: 28, py: 0.25 }}>
                  Baixar
                </Button>
              )}
              <Button color="inherit" size="small" onClick={onRetry} sx={{ borderRadius: 1, fontWeight: 500, minHeight: 28, py: 0.25 }}>
                Testar
              </Button>
            </Stack>
          )}
        >
          {status.message}
        </Alert>
      )}

      {status.code === 'connected' && printers.length === 0 && (
        <Alert
          severity="warning"
          action={(
            <Button color="inherit" size="small" onClick={onRetry} sx={{ borderRadius: 1, fontWeight: 500, minHeight: 28, py: 0.25 }}>
              Atualizar
            </Button>
          )}
        >
          QZ Tray conectado, mas nenhuma impressora local foi encontrada.
        </Alert>
      )}

      <FormControl fullWidth>
        <InputLabel id="printer-select-label">Impressora</InputLabel>
        <Select
          labelId="printer-select-label"
          value={printer}
          label="Impressora"
          onChange={(event) => onChange(event.target.value)}
        >
          {printers.map((item) => (
            <MenuItem key={item} value={item}>
              {item}{isZplCompatiblePrinter(item) ? ' (recomendada)' : ' (pode nao imprimir ZPL)'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="caption" color="text.secondary">
        Fluxo assistido: baixar o QZ Tray, instalar no Windows, abrir o aplicativo, autorizar este site e manter a Zebra como impressora principal quando disponivel.
      </Typography>
    </Stack>
  );
}
