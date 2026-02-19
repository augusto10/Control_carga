import { useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

interface DeviceInfo {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  hasCamera: boolean;
  hasScanner: boolean;
}

export function useDeviceDetect(): DeviceInfo {
  const theme = useTheme();
  const isMobileView = useMediaQuery(theme.breakpoints.down('md'));
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isAndroid: false,
    isIOS: false,
    hasCamera: false,
    hasScanner: false
  });

  useEffect(() => {
    const detectDevice = async () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isAndroid = /android/.test(userAgent);
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isMobile = isAndroid || isIOS || isMobileView;
      
      // Verificar se tem câmera
      let hasCamera = false;
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        hasCamera = devices.some(device => device.kind === 'videoinput');
      } catch (error) {
        console.warn('Erro ao detectar câmera:', error);
      }

      // Verificar scanner (Movfast/Ranger)
      const hasScanner = isAndroid && (
        /movfast|ranger/i.test(userAgent) ||
        typeof (window as any).Android?.scanBarcode === 'function'
      );

      setDeviceInfo({
        isMobile,
        isAndroid,
        isIOS,
        hasCamera,
        hasScanner
      });
    };

    detectDevice();
  }, [isMobileView]);

  return deviceInfo;
}