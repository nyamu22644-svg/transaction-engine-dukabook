import React, { useEffect, useRef, useState } from 'react';
import Quagga from '@ericblade/quagga2';
import { X, AlertCircle } from 'lucide-react';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose }) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string>('');
  const [scanned, setScanned] = useState<string>('');

  useEffect(() => {
    if (!scannerRef.current) return;

    console.log('🎥 BarcodeScanner: Requesting camera access...');
    console.log('📍 Current URL:', window.location.origin);
    console.log('🔒 Protocol:', window.location.protocol);

    // Request camera permissions - works on localhost (HTTP) and HTTPS
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        console.log('✅ Camera permission granted, stream acquired');
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        // Permissions granted, start Quagga
        initializeQuagga();
      })
      .catch((permissionError) => {
        console.error('❌ Camera permission error:', permissionError);
        console.error('Error name:', permissionError.name);
        console.error('Error message:', permissionError.message);
        
        let friendlyError = 'Camera access failed: ';
        
        if (permissionError.name === 'NotAllowedError') {
          friendlyError += 'Permission denied. Check browser settings and grant camera access.';
        } else if (permissionError.name === 'NotFoundError') {
          friendlyError += 'No camera device found. Ensure device has a camera.';
        } else if (permissionError.name === 'NotReadableError') {
          friendlyError += 'Camera is in use by another app. Close other apps using camera.';
        } else if (permissionError.name === 'SecurityError') {
          friendlyError += 'Security error. Ensure you\'re using HTTPS (Vercel) or localhost.';
        } else {
          friendlyError += permissionError.message || 'Unknown error.';
        }
        
        setError(friendlyError);
      });

    const initializeQuagga = () => {
      console.log('🚀 Initializing Quagga2 for barcode detection...');
      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              width: 640,  // 🚀 Keep resolution low for speed (480p/VGA is standard)
              height: 480,
              facingMode: 'environment', // Rear Camera
              aspectRatio: { min: 1, max: 2 },
              // 🚀 FOCUS HACK: Attempt to force continuous focus
              advanced: [{ focusMode: 'continuous' }] as any, 
            },
          },
          locator: {
            patchSize: 'medium', // 'x-small' for very small barcodes, 'medium' is standard
            halfSample: true,    // 🚀 SPEED HACK: Processes half the pixels. Much faster.
          },
          numOfWorkers: 4,       // Use 4 cores if available
          decoder: {
            // Only enable what you need! Disabling others speeds it up 3x.
            readers: [
              'ean_reader',        // Standard Kenya Retail (Simba Cement, Soda)
              'ean_8_reader',      // Small packages
              'code_128_reader',   // Logistics/Wholesale
              'upc_reader',        // Imported goods
            ],
          },
          locate: true, // Try to find the barcode box before reading
        } as any,
        (err) => {
          if (err) {
            console.error('❌ Error initializing Quagga:', err);
            setError(`Barcode scanner initialization failed: ${err.message || 'Unknown error. Please ensure camera is available.'}`);
            return;
          }
          console.log('✅ Quagga initialized successfully');
          try {
            console.log('▶️ Starting Quagga video stream...');
            Quagga.start();
            console.log('✅ Quagga stream started');
          } catch (startErr) {
            console.error('❌ Error starting Quagga stream:', startErr);
            setError('Failed to start camera stream. Try closing other apps using camera.');
          }
        }
      );

      // The Listener
      Quagga.onDetected((data) => {
        // 🚀 ACCURACY CHECK: Quagga can hallucinate. 
        // Only accept if code is valid (length > 3)
        if (data.codeResult.code && data.codeResult.code.length > 3) {
          const code = data.codeResult.code;
          console.log('📦 Barcode detected:', code);
          setScanned(code);
          onDetected(code);
          Quagga.stop(); // Stop scanning once found
        }
      });
    };

    return () => {
      try {
        Quagga.stop();
      } catch (err) {
        console.error('Error stopping Quagga:', err);
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

      {/* The Camera Window */}
      <div 
        ref={scannerRef} 
        className="relative w-full max-w-md h-96 bg-black overflow-hidden border-2 border-yellow-500 rounded-lg shadow-lg"
      >
        {/* The Red "Laser" Line (CSS Overlay) - Target for user alignment */}
        <div className="absolute top-1/2 left-4 right-4 h-1 bg-red-500 shadow-[0_0_12px_rgba(255,0,0,0.9)] z-10 transform -translate-y-1/2" />
        
        {/* Corner markers for framing */}
        <div className="absolute top-8 left-8 w-8 h-8 border-l-4 border-t-4 border-yellow-400" />
        <div className="absolute top-8 right-8 w-8 h-8 border-r-4 border-t-4 border-yellow-400" />
        <div className="absolute bottom-8 left-8 w-8 h-8 border-l-4 border-b-4 border-yellow-400" />
        <div className="absolute bottom-8 right-8 w-8 h-8 border-r-4 border-b-4 border-yellow-400" />
        
        {/* Helper Text */}
        <p className="absolute bottom-4 w-full text-center text-white text-sm bg-black/60 py-2 font-medium">
          Align barcode with <span className="text-red-400">red line</span>
        </p>
      </div>

      {/* Focus Instructions */}
      <div className="mt-6 px-6 py-4 bg-blue-900/30 border border-blue-500/50 rounded-lg max-w-sm text-center">
        <p className="text-white text-sm">
          <strong>Camera Tips:</strong> Ensure camera permission is granted. If blurry, pull phone back then move closer slowly to force autofocus.
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
