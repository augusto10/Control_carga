import { useState, useEffect } from 'react';
import { Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import { Close, Download } from '@mui/icons-material';
import pdfjsLib from 'pdfjs-dist';
import { Document, Page } from 'react-pdf';
import 'pdfjs-dist/web/pdf_viewer.css';

interface VisualizarAssinaturaProps {
  open: boolean;
  onClose: () => void;
  signedFileUrl: string | null;
}

export default function VisualizarAssinatura({ open, onClose, signedFileUrl }: VisualizarAssinaturaProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Visualizar Assinatura
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        {signedFileUrl ? (
          <Box sx={{ position: 'relative', height: 600 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress />
              </Box>
            ) : (
              <Document
                file={signedFileUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <CircularProgress />
                  </Box>
                }
              >
                {Array.from(new Array(numPages), (el, index) => (
                  <Page key={`page_${index + 1}`} pageNumber={index + 1} />
                ))}
              </Document>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
              <Button
                startIcon={<Download />}
                variant="contained"
                onClick={() => window.open(signedFileUrl, '_blank')}
              >
                Baixar PDF
              </Button>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Typography variant="h6">Nenhuma assinatura disponível</Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
