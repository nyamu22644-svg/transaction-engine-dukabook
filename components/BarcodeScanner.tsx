import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { X, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [scanned, setScanned] = useState<string>('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('🎥 BarcodeScanner: Initializing barcode scanner...');

    // Small delay to ensure DOM is fully ready
    const timer = setTimeout(() => {
      initializeQuagga();
    }, 100);

    const initializeQuagga = () => {
      if (!containerRef.current) return;

      console.log('🚀 Starting Quagga2 initialization...');

      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: containerRef.current,
            constraints: {
              width: { min: 320, ideal: 640, max: 1280 },
              height: { min: 240, ideal: 480, max: 960 },
              facingMode: 'environment',
              aspectRatio: { min: 1, max: 2 }
            }
          },
          locator: {
            patchSize: 'medium',
            halfSample: true
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          decoder: {
            readers: [
              'ean_reader',
              'ean_8_reader',
              'code_128_reader',
              'upc_reader'
            ]
          },
          locate: true
        } as any,
        (err) => {
          if (err) {
            console.error('❌ Quagga init error:', err);
            setError('Camera setup failed. Check permissions and try again.');
            return;
          }

          console.log('✅ Quagga initialized');
          try {
            Quagga.start();
            setInitialized(true);
            console.log('✅ Camera stream started - scanning ready');
          } catch (startErr) {
            console.error('❌ Quagga start error:', startErr);
            setError('Failed to start camera stream');
          }
        }
      );

      // Detect barcodes
      Quagga.onDetected((data) => {
        if (data.codeResult?.code && data.codeResult.code.length > 3) {
          const code = data.codeResult.code;
          console.log('📦 Barcode detected:', code);
          setScanned(code);
          onDetected(code);
          Quagga.stop();
        }
      });
    };

    return () => {
      clearTimeout(timer);
      try {
        Quagga.stop();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Header with Close Button */}
      <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-4 bg-gradient-to-b from-black to-transparent z-20">
        <h2 className="text-white font-semibold text-lg">Scan Barcode</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors"
        >
          <X size={24} className="text-white" />
        </button>
      </div>

      {/* The Camera Container - Quagga will render here */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-md h-96 bg-black overflow-hidden border-2 border-yellow-500 rounded-lg shadow-lg"
      >
        {/* Quagga will inject its own video/canvas here */}

        {/* The Red "Laser" Line (CSS Overlay) - Target for user alignment */}
        {initialized && (
          <div className="absolute top-1/2 left-4 right-4 h-1 bg-red-500 shadow-[0_0_12px_rgba(255,0,0,0.9)] z-10 transform -translate-y-1/2" />
        )}
        
        {/* Corner markers for framing */}
        {initialized && (
          <>
            <div className="absolute top-8 left-8 w-8 h-8 border-l-4 border-t-4 border-yellow-400 z-10" />
            <div className="absolute top-8 right-8 w-8 h-8 border-r-4 border-t-4 border-yellow-400 z-10" />
            <div className="absolute bottom-8 left-8 w-8 h-8 border-l-4 border-b-4 border-yellow-400 z-10" />
            <div className="absolute bottom-8 right-8 w-8 h-8 border-r-4 border-b-4 border-yellow-400 z-10" />
          </>
        )}
        
        {/* Helper Text */}
        {initialized && (
          <p className="absolute bottom-4 w-full text-center text-white text-sm bg-black/60 py-2 font-medium z-10">
            Align barcode with <span className="text-red-400">red line</span>
          </p>
        )}

        {/* Loading state */}
        {!initialized && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
              <p className="text-white text-sm">Initializing camera...</p>
            </div>
          </div>
        )}
      </div>

      {/* Focus Instructions */}
      <div className="mt-6 px-6 py-4 bg-blue-900/30 border border-blue-500/50 rounded-lg max-w-sm text-center">
        <p className="text-white text-sm">
          <strong>Camera Tips:</strong> Ensure camera permission is granted. Point camera at barcode and keep steady.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 px-6 py-3 bg-red-900/30 border border-red-500/50 rounded-lg flex items-center gap-2 max-w-sm">
          <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
          <p className="text-red-200 text-sm">{error}</p>
        </div>
      )}

      {/* Scanned Code Display */}
      {scanned && (
        <div className="mt-4 px-6 py-3 bg-green-900/30 border border-green-500/50 rounded-lg">
          <p className="text-green-200 text-sm">
            <strong>Scanned:</strong> {scanned}
          </p>
        </div>
      )}

      {/* Cancel Button */}
      <button 
        onClick={onClose}
        className="mt-8 px-8 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold border border-gray-500 transition-colors"
      >
        Cancel
      </button>

      {/* Info Footer */}
      <div className="absolute bottom-4 left-4 right-4 text-center text-gray-400 text-xs">
        <p>Optimized for Kenya Retail • Low-end devices supported</p>
      </div>
    </div>
  );
};

export default BarcodeScanner;
