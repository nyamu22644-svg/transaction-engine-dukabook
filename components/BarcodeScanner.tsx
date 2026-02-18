import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { X, Flashlight, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
  inline?: boolean; // render inside parent instead of modal overlay
  autoStart?: boolean; // auto-start camera when rendered inline
}

/**
 * Barcode Scanner with "Black Box" DOM Strategy
 * 
 * CRITICAL: The scanner div (id="reader-box") is EMPTY.
 * React never touches it. Html5Qrcode owns it completely.
 * All UI overlays are absolutely positioned ON TOP.
 */
export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onDetected, onClose, inline = false, autoStart = false }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRunningRef = useRef(false); // Safety lock for race conditions
  const readerIdRef = useRef<string>(`reader-box-${Math.random().toString(36).slice(2,9)}`);
  const [isScanning, setIsScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [error, setError] = useState<string>('');
  const [scanned, setScanned] = useState<string>('');
  const [mode, setMode] = useState<'camera' | 'usb'>('camera'); // Default to camera

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🛑 Unmounting - cleaning up scanner');
      if (scannerRef.current && isRunningRef.current) {
        scannerRef.current
          .stop()
          .then(() => scannerRef.current?.clear())
          .catch(() => {})
          .finally(() => {
            scannerRef.current = null;
            isRunningRef.current = false;
          });
      }
    };
  }, []);

  // USB Scanner mode
  useEffect(() => {
    if (mode !== 'usb' || !isScanning) return;

    const handleBarcodeScan = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && inputRef.current?.value) {
        const barcode = inputRef.current.value.trim();
        if (barcode) {
          console.log('📦 USB Barcode detected:', barcode);
          setScanned(barcode);
          onDetected(barcode);
          inputRef.current.value = '';
        }
      }
    };

    window.addEventListener('keydown', handleBarcodeScan);
    inputRef.current?.focus();

    return () => {
      window.removeEventListener('keydown', handleBarcodeScan);
    };
  }, [mode, isScanning, onDetected]);

  // Start camera
  const startScanning = async () => {
    if (isRunningRef.current) return; // Prevent double start
    
    setError('');
    setScanned('');
    console.log('🎥 Starting camera...');

    try {
      const readerId = readerIdRef.current || 'reader-box';
      const html5QrCode = new Html5Qrcode(readerId);
      scannerRef.current = html5QrCode;
      isRunningRef.current = true; // Mark BEFORE await

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          aspectRatio: 1.0,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.QR_CODE,
          ]
        } as any,
        (decodedText: string) => {
          console.log('📦 Barcode detected:', decodedText);
          setScanned(decodedText);
          onDetected(decodedText);
          
          // CRITICAL: Send barcode to focused input field
          // Find the POS scan input or any focused input
          const focusedInput = document.activeElement as HTMLInputElement;
          if (focusedInput && (focusedInput.tagName === 'INPUT' || focusedInput.tagName === 'TEXTAREA')) {
            // Set the barcode value
            focusedInput.value = decodedText;
            
            // Trigger input event for React state update
            focusedInput.dispatchEvent(new Event('input', { bubbles: true }));
            focusedInput.dispatchEvent(new Event('change', { bubbles: true }));
            
            // Simulate Enter keypress
            const enterEvent = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
              cancelable: true,
            });
            focusedInput.dispatchEvent(enterEvent);
            
            console.log('✅ Barcode sent to input field with Enter key');
          } else {
            // Fallback: Try to find POS scan input specifically
            const posInput = document.querySelector('input[placeholder*="Scan"]') as HTMLInputElement;
            if (posInput) {
              posInput.value = decodedText;
              posInput.dispatchEvent(new Event('input', { bubbles: true }));
              posInput.dispatchEvent(new Event('change', { bubbles: true }));
              
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true,
              });
              posInput.dispatchEvent(enterEvent);
              posInput.focus();
              console.log('✅ Barcode sent to POS scan input');
            } else {
              console.warn('⚠️ No input field found for barcode');
            }
          }
          
          // Vibrate feedback
          if (navigator.vibrate) navigator.vibrate(200);
        },
        () => {
          // Ignore parse errors
        }
      );

      setIsScanning(true);
      console.log('✅ Camera started');
    } catch (err: any) {
      console.error('❌ Camera error:', err);
      isRunningRef.current = false;
      
      let msg = 'Camera failed: ';
      if (err.name === 'NotAllowedError') {
        msg = '❌ Permission denied. Please allow camera access in browser settings.';
      } else if (err.name === 'NotFoundError') {
        msg = '❌ No camera found on this device.';
      } else if (err.name === 'NotReadableError') {
        msg = '❌ Camera is in use by another app. Close it and try again.';
      } else if (err.message?.includes('https')) {
        msg = '⚠️ HTTPS required. Use http://localhost:3000 or production URL.';
      } else if (err.message) {
        msg = `Camera error: ${err.message}`;
      } else {
        msg = 'Camera error. Check browser permissions and try USB scanner mode instead.';
      }
      
      setError(msg);
      setIsScanning(false);
    }
  };

  // Stop camera
  const stopScanning = async () => {
    if (!isRunningRef.current || !scannerRef.current) return;

    console.log('🛑 Stopping camera...');
    isRunningRef.current = false;

    try {
      await scannerRef.current.stop();
      await scannerRef.current.clear();
      scannerRef.current = null;
      setIsScanning(false);
      setTorchOn(false);
      console.log('✅ Camera stopped cleanly');
    } catch (err: any) {
      console.error('⚠️ Stop error:', err?.message);
    }
  };

  // Auto-start when inline + autoStart requested
  useEffect(() => {
    if (inline && autoStart && mode === 'camera' && !isRunningRef.current) {
      startScanning().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inline, autoStart, mode]);

  // Toggle torch
  const toggleTorch = async () => {
    if (!scannerRef.current || !isRunningRef.current) return;

    try {
      const newTorchState = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: newTorchState } as any]
      });
      setTorchOn(newTorchState);
      console.log('💡 Torch:', newTorchState ? 'ON' : 'OFF');
    } catch (err: any) {
      console.warn('Torch not supported:', err?.message);
      setError('Torch not supported on this device.');
    }
  };

  const outerClass = inline
    ? 'w-full flex flex-col'
    : 'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4';

  const innerClass = inline
    ? 'bg-slate-900 rounded-2xl shadow-2xl w-full border border-slate-800 overflow-hidden flex flex-col'
    : 'bg-slate-900 rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-2xl border border-slate-800 overflow-hidden flex flex-col';

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        {/* Header */}
        <div className="p-3 sm:p-6 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-900 to-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 shrink-0">
              📷
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-2xl font-bold text-white truncate">Barcode Scanner</h2>
              <p className="text-slate-400 text-xs sm:text-sm">{mode === 'camera' ? 'EAN-13 • UPC • Code128' : 'USB Scanner'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Mode Selector */}
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => { 
                  if (isScanning) stopScanning();
                  setMode('usb'); 
                  setError(''); 
                  setScanned(''); 
                }}
                className={`px-2 py-1 text-xs font-semibold rounded transition ${
                  mode === 'usb'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🖨️ USB
              </button>
              <button
                onClick={() => { 
                  if (isScanning) stopScanning();
                  setMode('camera'); 
                  setError(''); 
                  setScanned(''); 
                }}
                className={`px-2 py-1 text-xs font-semibold rounded transition ${
                  mode === 'camera'
                    ? 'bg-slate-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📱 Camera
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col p-3 sm:p-6">
          {/* USB Mode */}
          {mode === 'usb' && (
            <>
              <div className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-200 text-sm mb-3">
                  🖨️ <strong>USB Scanner Mode</strong> - Connect a USB barcode scanner.
                </p>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Scanner will type here (hidden)"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 text-sm opacity-50 pointer-events-none"
                  autoFocus
                />
              </div>
            </>
          )}

          {/* Camera Mode - CRITICAL: reader-box is EMPTY, no React components inside */}
          {mode === 'camera' && (
            <div className="relative flex-1 rounded-lg overflow-hidden bg-black border-2 border-yellow-500 mb-4">
              {/* The Scanner's Black Box - React NEVER touches this div */}
              <div id={readerIdRef.current} className="w-full h-full" />

              {/* Overlays - positioned OUTSIDE the black box, using absolute positioning */}
              {!isScanning && !error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
                  <div className="text-center">
                    <Camera className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                    <p className="text-slate-300 text-sm">Click "Start Camera" to begin</p>
                  </div>
                </div>
              )}

              {isScanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative h-3 w-3">
                    <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4">
              <div className="text-red-400 text-lg shrink-0">⚠️</div>
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
            {mode === 'camera' ? (
              <>
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
              </>
            ) : (
              <>
                {!isScanning ? (
                  <button
                    onClick={() => {
                      setIsScanning(true);
                      inputRef.current?.focus();
                    }}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                  >
                    🖨️ Start Scanning
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsScanning(false);
                      setScanned('');
                      if (inputRef.current) inputRef.current.value = '';
                    }}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition"
                  >
                    Stop Scanning
                  </button>
                )}
              </>
            )}
          </div>

          {/* Tips */}
          {isScanning && mode === 'camera' && (
            <div className="text-xs text-slate-300 space-y-1 p-3 bg-slate-800/50 rounded-lg">
              <p className="font-semibold text-slate-200">📸 Camera Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use flashlight if lighting is poor</li>
                <li>Hold phone level (horizontal)</li>
                <li>Keep barcode in the yellow box</li>
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
