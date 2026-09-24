import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import { analyzeBarcode } from '@/lib/barcode-validation';
import { formatProductAdm } from '@/lib/product-label';
import { LabelType, ProdutoEtiqueta } from '@/types/labels';

interface LabelPreviewProps {
  produto: ProdutoEtiqueta;
  quantidade: number;
  labelType?: LabelType;
}

function ProductVerticalPreview({
  produto,
  selectedBarcode,
  compact = false,
  large = false,
}: {
  produto: ProdutoEtiqueta;
  selectedBarcode: string | null;
  compact?: boolean;
  large?: boolean;
}) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: compact ? 420 : 720,
        mx: 'auto',
        aspectRatio: large ? '135 / 190' : compact ? '80 / 140' : '200 / 287',
        border: '2px solid #172033',
        borderRadius: 2,
        overflow: 'hidden',
        bgcolor: '#fff',
        color: '#111',
        display: 'grid',
        gridTemplateRows: compact ? '45% 40% 15%' : '38% 24% 1fr 14%',
      }}
    >
      <Box
        sx={{
          borderBottom: '2px solid #172033',
          display: 'grid',
          placeItems: 'center',
          p: compact ? 1.5 : 2,
          bgcolor: '#fff',
          position: 'relative',
        }}
      >
        <Typography sx={{ color: '#94a3b8', fontWeight: 800, fontSize: compact ? 12 : 14, zIndex: 1, userSelect: 'none' }}>SEM FOTO</Typography>
        {produto.imagemUrl && (
          <Box
            component="img"
            src={produto.imagemUrl}
            alt={produto.nome}
            sx={{
              position: 'absolute',
              inset: compact ? 10 : 14,
              width: compact ? 'calc(100% - 20px)' : 'calc(100% - 28px)',
              height: compact ? 'calc(100% - 20px)' : 'calc(100% - 28px)',
              objectFit: 'contain',
              bgcolor: '#fff',
              zIndex: 2,
            }}
          />
        )}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateRows: compact ? '16% 23% 1fr' : '30% 30% 1fr', minWidth: 0 }}>
        <Box sx={{ borderBottom: '2px solid #172033', minWidth: 0, display: 'grid', placeItems: 'center' }}>
          <Box sx={{ px: compact ? 1.3 : 2.5, width: '100%', minWidth: 0 }}>
            <Typography noWrap sx={{ color: '#07559b', fontWeight: 950, fontSize: compact ? 15 : 'clamp(20px, 3.2vw, 34px)', lineHeight: 1 }}>
              CODIGO ADM: {formatProductAdm(produto.codigoAdm)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ borderBottom: '2px solid #172033', minWidth: 0, display: 'grid', placeItems: 'center' }}>
          <Box
            sx={{
              px: compact ? 1.3 : 2.5,
              py: compact ? 0.45 : 0.7,
              width: '100%',
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: compact ? 0.2 : 0.35,
            }}
          >
            <Typography noWrap sx={{ fontSize: compact ? 10.5 : 'clamp(16px, 2.4vw, 26px)', lineHeight: 1.06 }}>
              <strong>MARCA:</strong> {produto.marca || 'SEM MARCA'}
            </Typography>
            <Typography noWrap sx={{ fontSize: compact ? 10.5 : 'clamp(16px, 2.4vw, 26px)', lineHeight: 1.06 }}>
              <strong>CODIGO ORIGINAL:</strong> {produto.codigoOriginal || '-'}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ minWidth: 0, overflow: 'hidden' }}>
          <Box sx={{ px: compact ? 1.3 : 2.5, py: compact ? 0.6 : 1.2, width: '100%', minWidth: 0 }}>
            <Typography sx={{ fontSize: compact ? 10.5 : 'clamp(16px, 2.4vw, 26px)', lineHeight: 1.15 }}>
              <strong>DESCRICAO:</strong> {produto.nome}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ borderTop: '2px solid #172033', display: 'grid', placeItems: 'center', px: compact ? '8%' : '10%', py: compact ? 0.45 : 1 }}>
        <Box sx={{ width: '100%' }}>
          <Box sx={{ height: compact ? 34 : 56, backgroundImage: 'repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 6px, #000 6px 9px, transparent 9px 13px)' }} />
          <Typography textAlign="center" fontWeight={800} letterSpacing={0} fontSize={compact ? 14 : 24} sx={{ fontFamily: 'Arial, sans-serif' }}>
            {selectedBarcode || 'Sem codigo'}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export function LabelPreview({ produto, quantidade, labelType = 'UNITARIA' }: LabelPreviewProps) {
  const theme = useTheme();
  const isClosedBox = labelType === 'CAIXA_FECHADA';
  const isA4Product = labelType === 'A4_PRODUTO';
  const isA4ProductLandscape = labelType === 'A4_PRODUTO_LANDSCAPE';
  const isA4ProductVertical = labelType === 'A4_PRODUTO_VERTICAL';
  const isA4ProductVerticalDouble = labelType === 'A4_PRODUTO_VERTICAL_DUPLA';
  const isA4ProductVerticalLargeDouble = labelType === 'A4_PRODUTO_VERTICAL_GRANDE_DUPLA';
  const selectedBarcode = isClosedBox ? produto.codigoBarrasCaixaFechada : produto.codigoBarras;
  const barcode = analyzeBarcode(selectedBarcode);
  const total = Math.max(1, quantidade);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        Previa aproximada de {total} etiqueta{total > 1 ? 's' : ''} ({barcode.type})
        {isA4Product
          ? ' - 2 por folha A4'
          : isA4ProductLandscape
            ? ' - 1 por folha A4 paisagem'
            : isA4ProductVertical
              ? ' - 1 por folha A4'
              : isA4ProductVerticalDouble
                ? ' - 3 por folha A4 paisagem'
                : isA4ProductVerticalLargeDouble
                  ? ' - 2 por folha A4 paisagem'
                : ''}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: isA4Product || isA4ProductLandscape || isA4ProductVertical || isA4ProductVerticalDouble || isA4ProductVerticalLargeDouble
            ? '1fr'
            : isClosedBox
              ? { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
              : { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {Array.from({ length: total }).map((_, index) => (
          isA4Product || isA4ProductLandscape ? (
            <Box
              key={index}
              sx={{
                width: '100%',
                maxWidth: isA4ProductLandscape ? 1280 : 720,
                mx: 'auto',
                aspectRatio: isA4ProductLandscape ? '287 / 200' : '180 / 110',
                border: '2px solid #172033',
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: '#fff',
                color: '#111',
                display: 'grid',
                gridTemplateRows: isA4ProductLandscape ? '135fr 65fr' : '74fr 36fr',
              }}
            >
              <Box sx={{ display: 'grid', gridTemplateColumns: '31% minmax(0, 69%)', width: '100%', minWidth: 0, minHeight: 0 }}>
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
                  <Typography sx={{ color: '#94a3b8', fontWeight: 800, fontSize: 12, zIndex: 1, userSelect: 'none' }}>SEM FOTO</Typography>
                  {produto.imagemUrl && (
                    <Box
                      component="img"
                      src={produto.imagemUrl}
                      alt={produto.nome}
                      sx={{ position: 'absolute', inset: 10, width: 'calc(100% - 20px)', height: 'calc(100% - 20px)', objectFit: 'contain', bgcolor: '#fff', zIndex: 2 }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'grid', gridTemplateRows: isA4ProductLandscape ? '36fr 48fr 51fr' : '19fr 25fr 30fr', width: '100%', minWidth: 0, boxSizing: 'border-box' }}>
                  <Box sx={{ width: '100%', minWidth: 0, px: 1.4, display: 'flex', alignItems: 'center', borderBottom: '2px solid #172033' }}>
                    <Typography sx={{ color: '#07559b', fontWeight: 950, fontSize: isA4ProductLandscape ? 'clamp(24px, 4vw, 42px)' : 'clamp(17px, 3.2vw, 28px)', lineHeight: 1 }}>
                      CODIGO ADM: {formatProductAdm(produto.codigoAdm)}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', minWidth: 0, px: 1.4, py: 0.25, display: 'flex', flexDirection: 'column', justifyContent: 'center', borderBottom: '2px solid #172033', gap: 0.15 }}>
                      <Typography noWrap sx={{ fontSize: isA4ProductLandscape ? 'clamp(18px, 3vw, 30px)' : 'clamp(14px, 2.3vw, 22px)', lineHeight: 1.05 }}>
                      <strong>MARCA:</strong> {produto.marca || 'SEM MARCA'}
                    </Typography>
                      <Typography noWrap sx={{ fontSize: isA4ProductLandscape ? 'clamp(18px, 3vw, 30px)' : 'clamp(14px, 2.3vw, 22px)', lineHeight: 1.05 }}>
                      <strong>CODIGO ORIGINAL:</strong> {produto.codigoOriginal || '-'}
                    </Typography>
                  </Box>
                  <Box sx={{ width: '100%', minWidth: 0, px: 1.4, py: 0.25, overflow: 'hidden' }}>
                    <Typography sx={{ fontSize: isA4ProductLandscape ? 'clamp(18px, 3vw, 30px)' : 'clamp(14px, 2.3vw, 22px)', lineHeight: 1.1 }}>
                      <strong>DESCRICAO:</strong> {produto.nome}
                    </Typography>
                  </Box>
                </Box>
              </Box>
              <Box sx={{ borderTop: '2px solid #172033', display: 'grid', placeItems: 'center', px: isA4ProductLandscape ? '19%' : '12%', py: 0.35 }}>
                <Box sx={{ width: '100%' }}>
                  <Box sx={{ height: isA4ProductLandscape ? 64 : 44, backgroundImage: 'repeating-linear-gradient(90deg, #000 0 3px, transparent 3px 6px, #000 6px 8px, transparent 8px 11px)' }} />
                  <Typography textAlign="center" fontWeight={800} letterSpacing={0} fontSize={isA4ProductLandscape ? 30 : 20} sx={{ fontFamily: 'Arial, sans-serif' }}>
                    {selectedBarcode || 'Sem codigo'}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : isA4ProductVertical ? (
            <ProductVerticalPreview key={index} produto={produto} selectedBarcode={selectedBarcode} />
          ) : isA4ProductVerticalDouble || isA4ProductVerticalLargeDouble ? (
            <Box
              key={index}
              sx={{
                width: '100%',
                maxWidth: 1280,
                mx: 'auto',
                p: 2,
                border: '2px dashed #cbd5e1',
                borderRadius: 2,
                bgcolor: '#f8fafc',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', md: `repeat(${isA4ProductVerticalDouble ? 3 : 2}, minmax(0, 1fr))` },
                  gap: 2.5,
                }}
              >
                {Array.from({ length: isA4ProductVerticalDouble ? 3 : 2 }).map((_, previewIndex) => (
                  <ProductVerticalPreview key={previewIndex} produto={produto} selectedBarcode={selectedBarcode} compact large={isA4ProductVerticalLargeDouble} />
                ))}
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
