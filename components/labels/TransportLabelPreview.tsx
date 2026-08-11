import { useEffect, useRef } from 'react';
import { Box, Stack, Typography, alpha, useTheme } from '@mui/material';
import JsBarcode from 'jsbarcode';
import { formatarNomeTransportadora } from '@/lib/etiquetas-transporte';
import { EtiquetaLoteData, EtiquetaVolumeData } from '@/types/labels';

interface TransportLabelPreviewProps {
  lote: EtiquetaLoteData;
}

const OFFICIAL_LOGO_SRC = '/templates/logo%20oficial.png';

function formatDataAtual(): string {
  return new Date().toLocaleDateString('pt-BR');
}

function TransportLabelCard({
  lote,
  volume,
}: {
  lote: EtiquetaLoteData;
  volume: EtiquetaVolumeData;
}) {
  const theme = useTheme();
  const barcodeRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!barcodeRef.current) return;

    barcodeRef.current.innerHTML = '';
    try {
      JsBarcode(barcodeRef.current, volume.codigoVolume, {
        format: 'CODE128',
        displayValue: false,
        width: 1.5,
        height: 48,
        margin: 0,
        background: '#ffffff',
        lineColor: '#000000',
      });
    } catch {
      // Deixa a area em branco se o codigo for invalido.
    }
  }, [volume.codigoVolume]);

  const data = formatDataAtual();
  const cliente = lote.cliente || 'SEM CLIENTE';
  const cnpj = lote.cnpj || '';
  const transportadora =
    lote.transportadora && lote.transportadora !== 'RETIRA_CLIENTE'
      ? formatarNomeTransportadora(lote.transportadora)
      : '';

  return (
    <Box
      sx={{
        borderRadius: 2,
        overflow: 'hidden',
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        boxShadow: '0 8px 24px rgba(15,23,42,0.10)',
        aspectRatio: '4 / 3',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box sx={{ position: 'absolute', inset: 0, bgcolor: alpha(theme.palette.grey[300], 0.25), zIndex: 0 }} />

      <Box sx={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', mb: 0.5, columnGap: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 0.5, fontSize: { xs: '0.6rem', sm: '0.7rem' } }}>
            PEDIDO
          </Typography>
          <Box
            component="img"
            src={OFFICIAL_LOGO_SRC}
            alt="Esplendor"
            sx={{
              height: { xs: 14, sm: 16 },
              width: 'auto',
              objectFit: 'contain',
              opacity: 0.75,
              justifySelf: 'center',
            }}
          />
          <Typography
            variant="caption"
            sx={{
              color: '#111827',
              fontSize: { xs: '0.55rem', sm: '0.65rem' },
              fontWeight: 600,
              justifySelf: 'end',
            }}
          >
            Expedicao: {data}
          </Typography>
        </Box>

        <Typography
          component="p"
          sx={{
            fontWeight: 900,
            fontSize: { xs: '2.7rem', sm: '3.3rem', md: '3.8rem' },
            lineHeight: 1,
            textAlign: 'center',
            my: { xs: 0.5, sm: 1 },
            letterSpacing: -1,
          }}
        >
          {lote.numeroPedido}
        </Typography>

        <Box sx={{ px: 0.5, my: 0.5 }}>
          <Box component="svg" ref={barcodeRef} sx={{ display: 'block', width: '100%', height: 44, bgcolor: '#ffffff', borderRadius: 1, px: 0.5 }} />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mt: 0.5 }}>
          {transportadora && (
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '1rem', sm: '1.2rem' }, lineHeight: 1.1, maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {transportadora}
            </Typography>
          )}
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" sx={{ fontSize: '0.55rem', color: '#111827', fontWeight: 700, letterSpacing: 0.5 }}>
              VOLUMES
            </Typography>
            <Typography sx={{ fontWeight: 900, fontSize: { xs: '1.3rem', sm: '1.6rem' }, lineHeight: 1 }}>
              {volume.indiceVolume} <span style={{ fontWeight: 400, fontSize: '0.8em' }}>/{volume.totalVolumes}</span>
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mt: 'auto', pt: 0.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.65rem', sm: '0.8rem' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            CLIENTE: {cliente}
          </Typography>
          {cnpj && (
            <Typography sx={{ fontWeight: 700, fontSize: { xs: '0.6rem', sm: '0.72rem' }, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              CNPJ: {cnpj}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

export function TransportLabelPreview({ lote }: TransportLabelPreviewProps) {
  const total = Math.max(1, lote.volumes);

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">
        Previa aproximada de {total} etiqueta{total > 1 ? 's' : ''} - pedido {lote.numeroPedido} (CODE128)
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
          gap: 2,
        }}
      >
        {lote.volumesEtiquetas.map((volume) => (
          <TransportLabelCard key={volume.id} lote={lote} volume={volume} />
        ))}
      </Box>
    </Stack>
  );
}
