export interface DeviceScannerInfo {
  isAndroid: boolean;
  isMovfast: boolean;
  hasNativeScanner: boolean;
  hasCameraAccess: boolean;
}

export async function detectDeviceCapabilities(): Promise<DeviceScannerInfo> {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isMovfast = /Movfast|Ranger/i.test(navigator.userAgent) || 
                   window.location.hostname.includes('movfast');
  
  let hasNativeScanner = false;
  let hasCameraAccess = false;

  // Check for native scanner
  if (isAndroid) {
    hasNativeScanner = !!(
      (window as any).Android?.scanBarcode ||
      (window as any).BarcodeScanner?.scan ||
      isMovfast
    );
  }

  // Check for camera access
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    hasCameraAccess = devices.some(device => device.kind === 'videoinput');
  } catch (error) {
    console.warn('📱 [DeviceUtils] Erro ao verificar câmera:', error);
  }

  return {
    isAndroid,
    isMovfast,
    hasNativeScanner,
    hasCameraAccess
  };
}