import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { analyzeBarcode } from '@/lib/barcode-validation';
import { LabelType, ProdutoEtiqueta } from '@/types/labels';

interface LabelPreviewProps {
  produto: ProdutoEtiqueta;
  quantidade: number;
  labelType?: LabelType;
}

export function LabelPreview({ produto, quantidade, labelType = 'UNITARIA' }: LabelPreviewProps) {
  const theme = useTheme();
  const isClosedBox = labelType === 'CAIXA_FECHADA';
  const selectedBarcode = isClosedBox ? produto.codigoBarrasCaixaFechada : produto.codigoBarras;
  const barcode = analyzeBarcode(selectedBarcode);
  const total = Math.max(1, quantidade);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        Previa aproximada de {total} etiqueta{total > 1 ? 's' : ''} ({barcode.type})
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isClosedBox
            ? { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
            : { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {Array.from({ length: total }).map((_, index) => (
          <Box
            key={index}
            sx={{
              aspectRatio: isClosedBox ? '100 / 60' : '33 / 22',
              borderRadius: 2,
              p: 1.5,
              background: `linear-gradient(180deg, ${alpha('#ffffff', 0.95)} 0%, ${alpha(theme.palette.grey[100], 0.95)} 100%)`,
              border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box>
              <Typography variant="caption" display="block" textAlign="center" fontWeight={800}>
                {produto.nome}
              </Typography>
              <Typography variant="caption" display="block" textAlign="center" color="text.secondary">
                {produto.marca || 'Sem marca'}
              </Typography>
              {isClosedBox && (
                <Typography variant="caption" display="block" textAlign="center" fontWeight={900}>
                  CAIXA FECHADA - {produto.quantidadeCaixaFechada || '-'} UN
                </Typography>
              )}
            </Box>
            <Box sx={{ px: 1 }}>
              <Box
                sx={{
                  height: isClosedBox ? 64 : 38,
                  borderRadius: 1,
                  backgroundImage:
                    'repeating-linear-gradient(90deg, #000000 0 2px, transparent 2px 4px, #000000 4px 5px, transparent 5px 7px)',
                  backgroundSize: '100% 100%',
                }}
              />
              <Typography variant="caption" display="block" textAlign="center" fontWeight={900} letterSpacing={1}>
                {selectedBarcode || 'Sem codigo'}
              </Typography>
            </Box>
            <Typography variant="caption" display="block" textAlign="center" color="text.secondary">
              ADM {produto.codigoAdm}
            </Typography>
          </Box>
        ))}
      </Box>
    </Stack>
  );
}
