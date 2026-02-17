import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/Button';
import CheckInSuccessModal from './CheckInSuccessModal';
import CameraModal from './CameraModal';

interface QRScannerProps {
  weddingId: number;
  onCheckInSuccess: (guestName: string, isDuplicate?: boolean) => void;
  onCheckInError?: (errorMessage: string) => void;
}

interface CheckInResponse {
  success: boolean;
  message: string;
  guest_name: string;
  checked_in_at: string;
  is_duplicate: boolean;
}

const QRScanner: React.FC<QRScannerProps> = ({ weddingId, onCheckInSuccess, onCheckInError }) => {
  const [error, setError] = useState<string | null>(null);
  const [manualQRCode, setManualQRCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    guestName: string;
    isDuplicate: boolean;
    checkedInAt: string;
  } | null>(null);

  const handleQRCodeDetected = (qrCode: string) => {
    processQRCode(qrCode);
  };

  const openCameraModal = () => {
    setShowCameraModal(true);
  };

  const processQRCode = async (qrCode: string) => {
    if (isProcessing || !qrCode.trim()) return;
    
    setIsProcessing(true);
    setError(null);

    try {
      const staffToken = localStorage.getItem('access_token');
      if (!staffToken) {
        throw new Error('Staff session expired. Please log in again.');
      }

      const response = await fetch('/api/v1/checkin/scan-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${staffToken}`
        },
        body: JSON.stringify({ qr_code: qrCode.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Check for specific "not invited" error
        if (errorData.message === 'Not invited to this wedding') {
          throw new Error('Not invited to this wedding');
        }
        throw new Error(errorData.message || errorData.detail || 'Check-in failed');
      }

      const result: CheckInResponse = await response.json();
      
      if (result.success) {
        // Show the big success modal
        setSuccessData({
          guestName: result.guest_name,
          isDuplicate: result.is_duplicate,
          checkedInAt: result.checked_in_at
        });
        setShowSuccessModal(true);
        
        // Also call the parent callback for the small notification
        onCheckInSuccess(result.guest_name, result.is_duplicate);
        setManualQRCode(''); // Clear manual input
      } else {
        setError(result.message || 'Check-in failed');
        if (onCheckInError) {
          onCheckInError(result.message || 'Check-in failed');
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Check-in failed';
      setError(errorMsg);
      if (onCheckInError) {
        onCheckInError(errorMsg);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processQRCode(manualQRCode);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessData(null);
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      // No cleanup needed for modal approach
    };
  }, []);

  return (
    <>
      <div className="space-y-4 md:space-y-6">
        <div className="text-center">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-2">
            QR Code Scanner
          </h3>
          <p className="text-sm md:text-base text-gray-600 dark:text-slate-400">
            Scan guest QR codes or enter manually
          </p>
        </div>

        {/* Camera Scanner */}
        <div className="space-y-4">
          <div className="text-center">
            <Button
              onClick={openCameraModal}
              className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 md:px-8 py-2.5 md:py-3 text-sm md:text-lg"
              disabled={isProcessing}
            >
              📷 Open Camera Scanner
            </Button>
            <p className="text-xs md:text-sm text-gray-500 dark:text-slate-500">
              Click to open camera in a popup window for QR code scanning
            </p>
          </div>
        </div>

        {/* Manual QR Code Entry */}
        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 md:pt-6">
          <h4 className="font-medium text-sm md:text-base text-gray-900 dark:text-white mb-4">Manual QR Code Entry</h4>
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={manualQRCode}
                onChange={(e) => setManualQRCode(e.target.value)}
                placeholder="Enter QR code manually"
                className="w-full px-3 py-2 md:py-2.5 text-sm md:text-base border border-gray-300 dark:border-slate-600 rounded-md shadow-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isProcessing}
              />
            </div>
            <Button
              type="submit"
              disabled={!manualQRCode.trim() || isProcessing}
              className="w-full text-sm md:text-base py-2 md:py-2.5"
            >
              {isProcessing ? 'Processing...' : 'Check In Guest'}
            </Button>
          </form>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3 md:p-4">
          <h4 className="font-medium text-sm md:text-base text-blue-900 dark:text-blue-200 mb-2">Instructions:</h4>
          <ul className="text-xs md:text-sm text-blue-800 dark:text-blue-300 space-y-1">
            <li>• Point camera at guest's QR code</li>
            <li>• Ensure good lighting for best results</li>
            <li>• Use manual entry if camera scanning fails</li>
            <li>• Duplicate check-ins will be detected automatically</li>
          </ul>
        </div>
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onQRCodeDetected={handleQRCodeDetected}
      />

      {/* Success Modal */}
      {successData && (
        <CheckInSuccessModal
          isOpen={showSuccessModal}
          onClose={handleCloseSuccessModal}
          guestName={successData.guestName}
          isDuplicate={successData.isDuplicate}
          checkedInAt={successData.checkedInAt}
        />
      )}
    </>
  );
};

export default QRScanner;