import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Keyboard, Search, AlertCircle, CheckCircle2, SwitchCamera } from 'lucide-react';
import { searchCatalog, ItemTemplate } from '../data/itemTemplates';
import Quagga from '@ericblade/quagga2';

interface BarcodeScannerProps {
  onScan: (barcode: string, item?: ItemTemplate) => void;
  onClose: () => void;
}

type ScanStatus = 'searching' | 'found' | 'not-found' | 'duplicate' | 'error' | null;

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [matchedItem, setMatchedItem] = useState<ItemTemplate | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [scanStatus, setScanStatus] = useState<ScanStatus>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [detectedBarcodes, setDetectedBarcodes] = useState<Set<string>>(new Set());
  const [showScanFrame, setShowScanFrame] = useState(true);

  // Initialize Quagga2 barcode scanner
  useEffect(() => {
    if (manualMode) {
      try {
        Quagga.stop?.();
      } catch (err) {
        console.error('Error stopping Quagga:', err);
      }
      setScannerReady(false);
      return;
    }

    const initScanner = async () => {
      try {
        setScanError('');
        setIsScanning(false);

        try {
          Quagga.stop?.();
        } catch (err) {
          console.error('Error stopping previous instance:', err);
        }

        // Initialize Quagga2 for barcode scanning
        await Quagga.init(
          {
            inputStream: {
              type: 'LiveStream',
              target: videoRef.current as HTMLElement,
              constraints: {
                facingMode: facingMode,
                width: { min: 320, ideal: 1280, max: 1920 },
                height: { min: 240, ideal: 720, max: 1440 }
              }
            },
            decoder: {
              readers: [
                'code_128_reader',
                'ean_reader',
                'ean_8_reader',
                'upc_reader',
                'upc_e_reader',
                'codabar_reader',
                'code_39_reader',
                'code_39_vin_reader'
              ]
            },
            locator: {
              halfSample: true,
              patchSize: 'medium'
            },
            numOfWorkers: 4,
            frequency: 10
          } as any
        );

        Quagga.start?.();
        setScannerReady(true);
        setIsScanning(true);

        // Handle detection
        Quagga.onDetected?.((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const detectedCode = result.codeResult.code;
            handleBarcodeDetected(detectedCode);
          }
        });
      } catch (err) {
        console.error('Scanner initialization error:', err);
        setScanError('Camera not available. Using manual entry instead.');
        playErrorSound();
        setTimeout(() => setManualMode(true), 2000);
      }
    };

    initScanner();

    return () => {
      try {
        Quagga.stop?.();
      } catch (err) {
        console.error('Error cleaning up Quagga:', err);
      }
    };
  }, [manualMode, facingMode]);

  // Sound feedback using Web Audio API
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Success: two high-pitched beeps
      oscillator.frequency.value = 1000; // Hz
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
      
      // Second beep
      const osc2 = audioContext.createOscillator();
      osc2.connect(gainNode);
      osc2.frequency.value = 1200; // Hz
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.25);
      
      osc2.start(audioContext.currentTime + 0.15);
      osc2.stop(audioContext.currentTime + 0.25);
    } catch (err) {
      console.error('Sound error:', err);
    }
  };

  const playErrorSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Error: low-pitched buzzer sound
      oscillator.frequency.value = 400; // Hz (lower pitch)
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.error('Sound error:', err);
    }
  };

  const handleBarcodeDetected = (barcode: string) => {
    // Prevent duplicate rapid detections
    if (detectedBarcodes.has(barcode)) {
      setScanStatus('duplicate');
      setStatusMessage('Already scanned - clearing in 1 second');
      playErrorSound();
      setTimeout(() => {
        setDetectedBarcodes(new Set());
        setScanStatus(null);
      }, 1000);
      return;
    }

    // Add to detected set and show it's being processed
    setDetectedBarcodes(prev => new Set([...prev, barcode]));
    setScanStatus('searching');
    setStatusMessage('🔍 Searching catalog...');
    
    // Give visual feedback before searching
    setTimeout(() => {
      setLastScanned(barcode);
      
      // Check if barcode exists in catalog
      const results = searchCatalog(barcode);
      const exactMatch = results.find(item => item.barcode === barcode);
      
      if (exactMatch) {
        setScanStatus('found');
        setStatusMessage(`✅ Found: ${exactMatch.item_name}`);
        setMatchedItem(exactMatch);
        playSuccessSound();
        
        // Auto-close after showing success
        setTimeout(() => {
          onScan(barcode, exactMatch);
          setDetectedBarcodes(new Set());
          setScanStatus(null);
        }, 800);
      } else {
        setScanStatus('not-found');
        setStatusMessage(`❌ Not in catalog: ${barcode}`);
        setMatchedItem(null);
        playErrorSound();
        
        // Still process it but show warning
        setTimeout(() => {
          onScan(barcode);
          setDetectedBarcodes(new Set());
          setScanStatus(null);
        }, 2000);
      }
    }, 300);
  };

  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;

    const barcode = manualBarcode.trim();
    handleBarcodeDetected(barcode);
    setManualBarcode('');
  };

  const handleQuickSearch = (query: string) => {
    setManualBarcode(query);
    if (query.length >= 3) {
      const results = searchCatalog(query);
      if (results.length === 1) {
        setMatchedItem(results[0]);
      } else {
        setMatchedItem(null);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
        <h2 className="text-white font-bold text-lg">Scan Barcode</h2>
        <button 
          onClick={onClose}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {manualMode ? (
        /* Manual Entry Mode */
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Keyboard className="w-10 h-10 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Enter Barcode Manually</h3>
              <p className="text-slate-400 text-sm">Type the barcode number or search by item name</p>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                  type="text"
                  value={manualBarcode}
                  onChange={e => handleQuickSearch(e.target.value)}
                  placeholder="Barcode or item name..."
                  autoFocus
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 pl-12 text-white text-lg font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Matched Item Preview */}
              {matchedItem && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{matchedItem.item_name}</p>
                      <p className="text-green-400 text-sm">KES {matchedItem.unit_price}</p>
                    </div>
                  </div>
                </div>
              )}

              <button 
                type="submit"
                disabled={!manualBarcode.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition"
              >
                Search / Add Item
              </button>
            </form>

            <button 
              onClick={() => setManualMode(false)}
              className="w-full mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white py-3"
            >
              <Camera className="w-5 h-5" />
              Use Camera Instead
            </button>
          </div>
        </div>
      ) : (
        /* Camera Mode */
        <>
          {/* Scanner Container */}
          <div className="flex-1 relative overflow-hidden pt-16">
            {!scannerReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Camera className="w-8 h-8 text-blue-500" />
                  </div>
                  <p className="text-white font-semibold">Initializing Camera...</p>
                  <p className="text-slate-400 text-sm mt-2">Allow camera access when prompted</p>
                </div>
              </div>
            )}

            {scanError && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
                <div className="text-center">
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                  <p className="text-white font-semibold">Camera Error</p>
                  <p className="text-slate-400 text-sm mt-2">{scanError}</p>
                </div>
              </div>
            )}

            <div ref={videoRef} className="w-full h-full" />

            {/* Scan Frame Overlay */}
            {scannerReady && showScanFrame && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Scanning Animation */}
                {isScanning && (
                  <>
                    {/* Frame corners */}
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-64 border-4 border-green-500 rounded-2xl opacity-70">
                      {/* Top-left corner */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
                      {/* Top-right corner */}
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
                      {/* Bottom-left corner */}
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
                      {/* Bottom-right corner */}
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
                    </div>

                    {/* Scanning line animation */}
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-64 flex items-center justify-center">
                      <div className="absolute w-72 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent animate-pulse" 
                           style={{ animation: 'slide 2s infinite' }}></div>
                    </div>

                    {/* Glow effect */}
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-64 border-4 border-green-400/30 rounded-2xl opacity-50 blur-sm"></div>
                  </>
                )}

                {/* Status Display */}
                {scanStatus && (
                  <div className="absolute top-8 left-1/2 -translate-x-1/2 w-full px-6">
                    <div className={`
                      p-4 rounded-2xl text-white font-bold text-lg text-center
                      ${scanStatus === 'searching' ? 'bg-blue-600/80 animate-pulse' : ''}
                      ${scanStatus === 'found' ? 'bg-green-600/90' : ''}
                      ${scanStatus === 'not-found' ? 'bg-red-600/90' : ''}
                      ${scanStatus === 'duplicate' ? 'bg-yellow-600/90' : ''}
                      ${scanStatus === 'error' ? 'bg-red-700/90' : ''}
                    `}>
                      {statusMessage}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scanner Instructions and Last Scanned */}
          <div className="p-6 bg-gradient-to-t from-black via-black/50 to-transparent">
            {lastScanned && (
              <div className="mb-4 bg-green-500/90 text-white p-4 rounded-xl animate-in">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <div>
                    <p className="font-mono text-lg">{lastScanned}</p>
                    {matchedItem && (
                      <p className="text-sm opacity-90">{matchedItem.item_name} - KES {matchedItem.unit_price}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center mb-6">
              <p className="text-white/80 font-semibold">Position barcode within the frame</p>
              <p className="text-white/50 text-sm mt-1">
                {isScanning ? '📷 Camera is actively scanning...' : 'Initializing...'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-6">
              <button 
                onClick={switchCamera}
                className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
                title={facingMode === 'environment' ? 'Switch to Front Camera' : 'Switch to Rear Camera'}
              >
                <SwitchCamera className="w-6 h-6 text-white" />
              </button>

              <button 
                onClick={() => setShowScanFrame(!showScanFrame)}
                className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition"
                title={showScanFrame ? 'Hide Frame' : 'Show Frame'}
              >
                <span className="text-white text-2xl">{showScanFrame ? '👁️' : '🚫'}</span>
              </button>

              <button 
                onClick={() => setManualMode(true)}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-slate-100 transition shadow-lg"
              >
                <Keyboard className="w-7 h-7 text-black" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
