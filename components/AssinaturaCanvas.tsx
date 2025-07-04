import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Box, Button, Stack } from '@mui/material';

interface AssinaturaCanvasProps {
  onSalvar: (dataUrl: string) => void;
  onCancelar: () => void;
}

const AssinaturaCanvas: React.FC<AssinaturaCanvasProps> = ({ onSalvar, onCancelar }) => {
  const sigCanvas = useRef<any>(null);

  const handleClear = () => {
    sigCanvas.current?.clear();
  };

  const handleSalvar = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
      onSalvar(dataUrl);
    }
  };

  return (
    <Box>
      <SignatureCanvas
        ref={sigCanvas}
        penColor="black"
        backgroundColor="#fff"
        canvasProps={{ width: 320, height: 180, style: { border: '1px solid #ccc', borderRadius: 8 } }}
      />
      <Stack direction="row" spacing={1} mt={1} justifyContent="center">
        <Button variant="outlined" size="small" onClick={handleClear} sx={{ minWidth: 56, px: 1, py: 0.5, fontSize: 12, lineHeight: 1 }}>
          Limpar
        </Button>
        <Button variant="contained" size="small" onClick={handleSalvar} sx={{ minWidth: 56, px: 1, py: 0.5, fontSize: 12, lineHeight: 1 }}>
          Salvar
        </Button>
        <Button variant="text" size="small" color="error" onClick={onCancelar} sx={{ minWidth: 56, px: 1, py: 0.5, fontSize: 12, lineHeight: 1 }}>
          Cancelar
        </Button>
      </Stack>
    </Box>
  );
};

export default AssinaturaCanvas;
