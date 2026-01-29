import React, { useState, useRef, useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScannerConfig, Html5QrcodeScanType } from 'html5-qrcode';
import { Button } from '../ui/Button';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQRCodeDetected: (qrCode: string) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onQRCodeDetected }) => {
  const [error, setError] = useState<string | null>(null);
  const [useNativeCamera, setUseNativeCamera] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerElementId = 'camera-modal-scanner';

  const startQRScanner = async () => {
    try {
      setError(null);
      setIsInitializing(true);

      const config: Html5QrcodeScannerConfig = {
        fps: 10,
        qrbox: { width: 300, height: 300 },
        aspectRatio: 1.0,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: { ideal: "environment" }
        }
      };

      scannerRef.current = new Html5QrcodeScanner(scannerElementId, config, false);
      
      scannerRef.current.render(
        (decodedText) => {
          console.log('QR Code detected:', decodedText);
          onQRCodeDetected(decodedText);
          cleanup();
          onClose();
        },
        (errorMessage) => {
          // Normal scanning errors - don't show to user
          if (!errorMessage.includes('No QR code found') && !errorMessage.includes('QR code parse error')) {
            console.warn('QR scan error:', errorMessage);
          }
        }
      );
      
      setIsInitializing(false);
    } catch (err) {
      console.error('QR Scanner error:', err);
      setIsInitializing(false);
      // Fallback to native camera
      setUseNativeCamera(true);
      startNativeCamera();
    }
  };

  const startNativeCamera = async () => {
    try {
      setError(null);
      setIsInitializing(true);
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsInitializing(false);
      }
    } catch (err) {
      console.error('Native camera error:', err);
      setIsInitializing(false);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      }
    }
  };

  const cleanup = () => {
    if (useNativeCamera) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    }
    setUseNativeCamera(false);
    setError(null);
    setIsInitializing(false);
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  // Initialize camera when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to ensure modal is fully rendered
      setTimeout(() => {
        startQRScanner();
      }, 300);
    } else {
      cleanup();
    }

    return () => {
      cleanup();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">📱 QR Code Scanner</h3>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-1">
            Point your camera at a QR code to scan
          </p>
        </div>

        {/* Camera Content */}
        <div className="p-4">
          {isInitializing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Initializing camera...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-sm text-red-600">{error}</p>
              <div className="mt-3 space-y-2">
                <Button
                  onClick={() => {
                    setError(null);
                    setUseNativeCamera(true);
                    startNativeCamera();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Try Simple Camera
                </Button>
              </div>
            </div>
          )}

          {!isInitializing && !error && (
            <div className="space-y-4">
              {useNativeCamera ? (
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full rounded-lg border-2 border-blue-500"
                    style={{ maxHeight: '300px' }}
                  />
                  <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-lg"></div>
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-sm text-gray-600 mb-3">
                      📷 Camera is active - use manual entry below if needed
                    </p>
                    <Button
                      onClick={() => {
                        setUseNativeCamera(false);
                        startQRScanner();
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Switch to Auto Scanner
                    </Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div id={scannerElementId} className="w-full"></div>
                  <div className="mt-3 text-center">
                    <Button
                      onClick={() => {
                        cleanup();
                        setUseNativeCamera(true);
                        startNativeCamera();
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      Switch to Simple Camera
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="font-medium text-blue-900 text-sm mb-2">📋 Instructions:</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Hold your device steady</li>
              <li>• Ensure good lighting</li>
              <li>• Point camera directly at QR code</li>
              <li>• QR code will be detected automatically</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t">
          <Button
            onClick={handleClose}
            variant="outline"
            className="w-full"
          >
            Close Camera
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CameraModal;