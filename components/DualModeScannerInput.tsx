import React, { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import { Camera, Wifi, X, AlertCircle, CheckCircle2, Settings } from 'lucide-react';

interface DualModeScannerInputProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

type ScannerMode = 'usb' | 'camera';

/**
 * Dual Mode Barcode Scanner Component
 * 
 * Supports two input methods:
 * 1. USB Scanner Mode - Physical barcode scanner connected to USB (default)
 *    - Buffers keystrokes from scanner
 *    - Triggers on Enter key
 *    - Smart detection: ignores input if user is typing in text field
 * 
 * 2. Camera Mode - Mobile/webcam barcode scanning
 *    - Real-time barcode detection from camera
 *    - Quagga2 library handles all barcode formats
 *    - Auto-triggers on detection
 */
export const DualModeScannerInput: React.FC<DualModeScannerInputProps> = ({
  onScan,
  onError,
  placeholder = 'Scan barcode or tap to switch mode...',
  disabled = false,
}) => {
  // Scanner state
  const [scannerMode, setScannerMode] = useState<ScannerMode>('usb');
  const [showSettings, setShowSettings] = useState(false);
  const [manualInput, setManualInput] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // USB Scanner state
  const [scanBuffer, setScanBuffer] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLDivElement>(null);
  const isTypingInFormRef = useRef(false);

  // ============================================================================
  // USB SCANNER MODE (Keydown Listener)
  // ============================================================================

  /**
   * Detect if user is actively typing in a form field (avoid false triggers)
   * Returns true if focus is on input/textarea other than our scan input
   */
  const isTypingInFormField = (): boolean => {
    const activeElement = document.activeElement as HTMLElement;
    if (!activeElement) return false;

    const isOtherInput =
      (activeElement.tagName === 'INPUT' && activeElement !== inputRef.current) ||
      activeElement.tagName === 'TEXTAREA';

    return isOtherInput;
  };

  /**
   * USB Scanner: Global keydown listener
   * Buffer keystrokes, trigger on Enter
   * 
   * Physical barcode scanners:
   * - Type the barcode digits very quickly
   * - Send 'Enter' key at the end
   * - This allows us to detect scanner vs manual typing
   */
  const handleGlobalKeydown = (e: KeyboardEvent) => {
    if (scannerMode !== 'usb' || disabled) return;

    // Check if user is typing in a different form field
    if (isTypingInFormField()) {
      isTypingInFormRef.current = true;
      return;
    }

    isTypingInFormRef.current = false;

    // Enter key: submit scan
    if (e.key === 'Enter') {
      e.preventDefault();

      // Only process if we have a buffer (not from manual form submission)
      if (scanBuffer.trim()) {
        processUSBScan(scanBuffer.trim());
        setScanBuffer('');
      }
      return;
    }

    // Printable characters: add to buffer
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      setScanBuffer((prev) => prev + e.key);
      setSuccess(''); // Clear previous success message
      setError(''); // Clear previous error
    }

    // Backspace: remove from buffer
    if (e.key === 'Backspace') {
      setScanBuffer((prev) => prev.slice(0, -1));
    }
  };

  /**
   * Process USB scan result
   */
  const processUSBScan = (barcode: string) => {
    setLastScanned(barcode);
    setSuccess(`✓ Scanned: ${barcode}`);
    onScan(barcode);

    // Clear success after 2 seconds
    setTimeout(() => setSuccess(''), 2000);
  };

  /**
   * Manual input submit (fallback for USB mode)
   */
  const handleManualSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    e.preventDefault();
    const barcode = manualInput.trim();

    if (!barcode) {
      setError('Empty barcode');
      return;
    }

    processUSBScan(barcode);
    setManualInput('');
  };

  // ============================================================================
  // CAMERA MODE (Quagga2 Scanner)
  // ============================================================================

  /**
   * Initialize Quagga2 camera scanner
   */
  const initializeCameraScanner = async () => {
    if (!cameraRef.current) {
      console.warn('Camera ref not available yet, retrying...');
      return;
    }

    try {
      setScanning(true);
      setError('');

      // Request camera permissions explicitly first
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).catch((permErr) => {
        throw new Error(`Camera permission denied: ${permErr.message}`);
      });

      // Small delay to ensure video element is mounted in DOM
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use Promise wrapper to ensure init completes before start
      return new Promise<void>((resolve) => {
        Quagga.init(
          {
            inputStream: {
              type: 'LiveStream',
              target: cameraRef.current,
              constraints: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'environment', // Rear camera
              },
            },
            locator: {
              patchSize: 'medium',
              halfSample: true,
            },
            numOfWorkers: 2,
            decoder: {
              readers: [
                'ean_reader',
                'ean_8_reader',
                'code_128_reader',
                'upc_reader',
                'upc_e_reader',
              ],
            },
            locate: true,
          } as any,
          (err) => {
            if (err) {
              console.error('Quagga init error:', err);
              setError('Camera access failed. Try USB scanner or deploy with HTTPS.');
              setScanning(false);
              resolve();
              return;
            }

            try {
              Quagga.start();

              Quagga.onDetected((result) => {
                const code = result.codeResult.code;
                if (code) {
                  processCameraScan(code);
                }
              });

              setScanning(true);
            } catch (startErr) {
              console.error('Error starting Quagga:', startErr);
              setError('Failed to start camera. Use USB mode instead.');
              setScanning(false);
            }

            resolve();
          }
        );
      });
    } catch (err) {
      console.error('Camera scanner error:', err);
      const errMsg = err instanceof Error ? err.message : 'Camera not available. Switch to USB mode.';
      setError(errMsg);
      setScanning(false);
    }
  };

  /**
   * Stop Quagga2 scanner
   */
  const stopCameraScanner = () => {
    try {
      Quagga.stop();
      Quagga.offDetected();
      setScanning(false);
    } catch (err) {
      console.error('Error stopping camera:', err);
    }
  };

  /**
   * Process camera scan result
   */
  const processCameraScan = (barcode: string) => {
    console.log('📷 Camera scan detected:', barcode);
    setLastScanned(barcode);
    setSuccess(`✓ Detected: ${barcode}`);
    onScan(barcode);

    // Auto-clear success after 3 seconds
    setTimeout(() => setSuccess(''), 3000);
  };

  // ============================================================================
  // LIFECYCLE HOOKS
  // ============================================================================

  // Setup USB scanner listener
  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [scannerMode, scanBuffer, disabled]);

  // Switch scanner mode
  useEffect(() => {
    if (scannerMode === 'camera') {
      initializeCameraScanner();
    } else {
      stopCameraScanner();
    }

    return () => {
      if (scannerMode === 'camera') {
        stopCameraScanner();
      }
    };
  }, [scannerMode]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Scanner Mode Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {scannerMode === 'usb' ? (
            <Wifi className="w-5 h-5 text-blue-500" />
          ) : (
            <Camera className="w-5 h-5 text-green-500" />
          )}
          <span className="font-semibold text-slate-700 capitalize">
            {scannerMode === 'usb' ? 'USB Scanner' : 'Camera Scanner'}
          </span>
        </div>

        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 hover:bg-slate-200 rounded-lg transition text-slate-500 hover:text-slate-700"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-700">
              Scanner Input Method
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setScannerMode('usb')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  scannerMode === 'usb'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <Wifi className="w-4 h-4 inline mr-1" />
                USB Scanner
              </button>
              <button
                onClick={() => setScannerMode('camera')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                  scannerMode === 'camera'
                    ? 'bg-green-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                <Camera className="w-4 h-4 inline mr-1" />
                Camera
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-600">
            {scannerMode === 'usb'
              ? '💡 USB: Connect a physical barcode scanner. It will auto-detect when you scan.'
              : '💡 Camera: Use your device camera to scan barcodes in real-time.'}
          </p>
        </div>
      )}

      {/* USB Mode: Manual Input */}
      {scannerMode === 'usb' && (
        <div className="space-y-2">
          <input
            ref={inputRef}
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            onKeyDown={handleManualSubmit}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-slate-500">
            Scan buffer: <span className="font-mono">{scanBuffer || '(empty)'}</span>
          </p>
        </div>
      )}

      {/* Camera Mode: Video Container */}
      {scannerMode === 'camera' && (
        <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ minHeight: '400px' }}>
          {/* Video element for Quagga2 - required for camera access */}
          <video
            ref={cameraRef as any}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />

          <div className="absolute inset-0 flex items-center justify-center">
            {!scanning && (
              <div className="text-center">
                <Camera className="w-12 h-12 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-400">Initializing camera...</p>
              </div>
            )}
          </div>

          {/* Scan reticle */}
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="border-2 border-green-500 rounded-lg" style={{ width: '300px', height: '200px' }}>
                <div className="absolute inset-0 bg-green-500/5" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Status Messages */}
      {error && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {lastScanned && (
        <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg">
          <p className="text-xs text-slate-600">Last scanned:</p>
          <p className="font-mono text-lg font-semibold text-slate-900">{lastScanned}</p>
        </div>
      )}
    </div>
  );
};

export default DualModeScannerInput;
