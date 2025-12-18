import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, AlertCircle, Flashlight, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

/**
 * Pro Barcode Scanner Component using Html5Qrcode (Pro Class)
 * 
 * Supports:
 * - EAN-13 (standard supermarket barcodes)
 * - EAN-8 (small packages)
 * - CODE-128 (logistics/warehouse)
 * - UPC-A (US products)
 * - QR Codes (backup)
 * 
 * Features:
 * - Full control over camera stream (torch support)
 * - Explicit Start/Stop for battery efficiency
 * - React StrictMode safe with proper cleanup
 * - Mobile optimized for Kenya retail
 */
export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string>('');
  const [scanned, setScanned] = useState<string>('');

  // Barcode formats configuration
  const formatsToSupport = [
    Html5QrcodeSupportedFormats.EAN_13,    // Standard Kenya Supermarket
    Html5QrcodeSupportedFormats.EAN_8,     // Small packages
    Html5QrcodeSupportedFormats.CODE_128,  // Logistics/warehouse codes
    Html5QrcodeSupportedFormats.UPC_A,     // US products
    Html5QrcodeSupportedFormats.QR_CODE,   // Still keep QR enabled as fallback
  ];

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🛑 Cleanup: Stopping scanner...');
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch((err) => {
          console.error('⚠️ Error stopping scanner:', err);
        });
      }
    };
  }, [isScanning]);

  // Start camera and scanning
  const startScanning = async () => {
    setError('');
    setScanned('');
    console.log('🎥 Starting barcode scanner...');

    try {
      const html5QrCode = new Html5Qrcode('barcode-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' }, // Force back camera
        {
          fps: 10,
          qrbox: { width: 300, height: 150 }, // Wide box for rectangular barcodes
          aspectRatio: 1.0,
          formatsToSupport: formatsToSupport
        },
        (decodedText: string) => {
          // SUCCESS - Barcode detected
          console.log('📦 Barcode detected:', decodedText);
          setScanned(decodedText);
          onDetected(decodedText);
          // Don't stop automatically - let user scan multiple items or close manually
        },
        () => {
          // Scanning in progress - ignore errors
        }
      );

      setIsScanning(true);
      console.log('✅ Scanner started - ready for barcodes');
    } catch (err: any) {
      console.error('❌ Scanner start error:', err);
      let friendlyError = 'Camera failed to start: ';

      if (err.name === 'NotAllowedError') {
        friendlyError = 'Permission denied. Grant camera access in browser settings.';
      } else if (err.name === 'NotFoundError') {
        friendlyError = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        friendlyError = 'Camera is in use by another app.';
      } else if (err.message) {
        friendlyError += err.message;
      }

      setError(friendlyError);
    }
  };

  // Stop camera
  const stopScanning = async () => {
    console.log('🛑 Stopping scanner...');
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
        setTorchOn(false);
        console.log('✅ Scanner stopped');
      } catch (err: any) {
        console.error('⚠️ Error stopping scanner:', err);
      }
    }
  };

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!scannerRef.current) return;

    try {
      const newTorchState = !torchOn;
      console.log('💡 Toggling torch:', newTorchState ? 'ON' : 'OFF');

      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newTorchState }]
      });

      setTorchOn(newTorchState);
    } catch (err: any) {
      console.error('❌ Torch error:', err);
      setError('Torch not supported on this device.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl border border-slate-800 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 shrink-0">
              📷
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Barcode Scanner</h2>
              <p className="text-slate-400 text-xs sm:text-sm">EAN-13 • UPC • Code128</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white shrink-0"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-3 sm:p-6">
          {/* Camera Viewport */}
          <div
            id="barcode-reader"
            className="flex-1 rounded-lg overflow-hidden bg-black border-2 border-yellow-500 mb-4 flex items-center justify-center"
          >
            {!isScanning && !error && (
              <div className="text-center">
                <Camera className="w-12 h-12 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Click "Start Camera" to begin</p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Barcode Detected */}
          {scanned && (
            <div className="flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4 animate-pulse">
              <div className="text-green-400 text-lg">✓</div>
              <div className="flex-1 min-w-0">
                <p className="text-green-200 font-semibold text-sm">Barcode Detected!</p>
                <p className="text-green-300 text-sm font-mono break-all">{scanned}</p>
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2 mb-4">
            {!isScanning ? (
              <button
                onClick={startScanning}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Start Camera
              </button>
            ) : (
              <>
                <button
                  onClick={stopScanning}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                >
                  Stop Camera
                </button>
                <button
                  onClick={toggleTorch}
                  className={`py-3 px-4 rounded-lg font-semibold transition flex items-center gap-2 ${
                    torchOn
                      ? 'bg-yellow-500/30 text-yellow-400 hover:bg-yellow-500/40 border border-yellow-500/50'
                      : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  }`}
                  title="Toggle flashlight"
                >
                  <Flashlight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Scanning Tips */}
          {isScanning && (
            <div className="text-xs text-slate-300 space-y-1 p-3 bg-slate-800/50 rounded-lg">
              <p className="font-semibold text-slate-200">📸 Scanning Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use flashlight if lighting is poor</li>
                <li>Hold phone level (horizontal)</li>
                <li>Keep barcode in the box</li>
                <li>Move slowly if scanning fails</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
