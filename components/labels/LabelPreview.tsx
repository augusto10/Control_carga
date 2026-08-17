import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { analyzeBarcode } from '@/lib/barcode-validation';
import { formatProductAdm } from '@/lib/product-label';
import { LabelType, ProdutoEtiqueta } from '@/types/labels';

interface LabelPreviewProps {
  produto: ProdutoEtiqueta;
  quantidade: number;
  labelType?: LabelType;
}

export function LabelPreview({ produto, quantidade, labelType = 'UNITARIA' }: LabelPreviewProps) {
  const theme = useTheme();
  const isClosedBox = labelType === 'CAIXA_FECHADA';
  const isA4Product = labelType === 'A4_PRODUTO';
  const selectedBarcode = isClosedBox ? produto.codigoBarrasCaixaFechada : produto.codigoBarras;
  const barcode = analyzeBarcode(selectedBarcode);
  const total = Math.max(1, quantidade);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        Previa aproximada de {total} etiqueta{total > 1 ? 's' : ''} ({barcode.type})
        {isA4Product ? ' - 2 por folha A4' : ''}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isA4Product
            ? '1fr'
            : isClosedBox
            ? { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
            : { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {Array.from({ length: total }).map((_, index) => (
          isA4Product ? (
            <Box
              key={index}
              sx={{
                width: '100%',
                maxWidth: 720,
                mx: 'auto',
                aspectRatio: '180 / 110',
                border: '2px solid #172033',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#fff',
                color: '#111',
                display: 'grid',
                gridTemplateRows: '74fr 36fr',
              }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: '31% 69%', minHeight: 0 }}>
                <Box
                  sx={{
                    borderRight: '2px solid #172033',
                    display: 'grid',
                    placeItems: 'center',
                    p: 2,
                    bgcolor: '#fff',
                    position: 'relative',
                  }}
                >
                  <Typography sx={{ color: '#94a3b8', fontWeight: 800, fontSize: 12 }}>SEM FOTO</Typography>
                  {produto.imagemUrl && (
                    <Box
                      component="img"
                      src={produto.imagemUrl}
                      alt={produto.nome}
                      sx={{ position: 'absolute', inset: 10, width: 'calc(100% - 20px)', height: 'calc(100% - 20px)', objectFit: 'contain', bgcolor: '#fff' }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateRows: '19fr 25fr 30fr', minWidth: 0 }}>
                  <Box sx={{ px: 1.4, display: 'flex', alignItems: 'center', borderBottom: '2px solid #172033' }}>
                    <Typography sx={{ color: '#07559b', fontWeight: 950, fontSize: 'clamp(17px, 3.2vw, 28px)', lineHeight: 1 }}>
                      CÓDIGO ADM: {formatProductAdm(produto.codigoAdm)}
                    </Typography>
                  </Box>
                  <Box sx={{ px: 1.4, py: 0.25, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderBottom: '2px solid #172033', minWidth: 0, gap: 0.15 }}>
                    <Typography noWrap sx={{ fontSize: 'clamp(14px, 2.3vw, 22px)', lineHeight: 1.05 }}>
                      <strong>MARCA:</strong> {produto.marca || 'SEM MARCA'}
                    </Typography>
                    <Typography noWrap sx={{ fontSize: 'clamp(14px, 2.3vw, 22px)', lineHeight: 1.05 }}>
                      <strong>CÓDIGO ORIGINAL:</strong> {produto.codigoOriginal || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ px: 1.4, py: 0.25, overflow: 'hidden' }}>
                    <Typography sx={{ fontSize: 'clamp(14px, 2.3vw, 22px)', lineHeight: 1.1 }}>
                      <strong>DESCRICAO:</strong> {produto.nome}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ borderTop: '2px solid #172033', display: 'grid', placeItems: 'center', px: '12%', py: 0.35 }}>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ height: 44, backgroundImage: 'repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 6px, #000 6px 8px, transparent 8px 11px)' }} />
                  <Typography textAlign="center" fontWeight={800} letterSpacing={0} fontSize={20} sx={{ fontFamily: 'Arial, sans-serif' }}>
                    {selectedBarcode || 'Sem codigo'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : (
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
          )
        ))}
      </Box>
    </Stack>
  );
}
