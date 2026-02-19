import { useEffect, useState } from 'react';
import { detectDeviceCapabilities } from '../lib/deviceUtils';

export interface DevicePermissions {
  camera: boolean;
  scanner: boolean;
}

export function useDevicePermissions() {
  const [permissions, setPermissions] = useState<DevicePermissions>({
    camera: false,
    scanner: false
  });
  
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const capabilities = await detectDeviceCapabilities();
        
        // Verificar permissão da câmera
        let cameraPermission = false;
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          cameraPermission = true;
        } catch (error) {
          console.warn('🎥 [Permissions] Câmera não permitida:', error);
        }

        setPermissions({
          camera: cameraPermission,
          scanner: capabilities.hasNativeScanner
        });

      } catch (error) {
        console.error('❌ [Permissions] Erro ao verificar permissões:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkPermissions();
  }, []);

  const requestPermission = async (permission: keyof DevicePermissions) => {
    switch (permission) {
      case 'camera':
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          stream.getTracks().forEach(track => track.stop());
          setPermissions(prev => ({ ...prev, camera: true }));
          return true;
        } catch (error) {
          console.error('❌ [Permissions] Erro ao solicitar câmera:', error);
          return false;
        }
      default:
        return false;
    }
  };

  return {
    permissions,
    isChecking,
    requestPermission
  };
}