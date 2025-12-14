import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Flashlight, FlashlightOff, SwitchCamera, Keyboard, Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { searchCatalog, ItemTemplate } from '../data/itemTemplates';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (barcode: string, item?: ItemTemplate) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [matchedItem, setMatchedItem] = useState<ItemTemplate | null>(null);
  const [scannerReady, setScannerReady] = useState(false);
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  // Initialize scanner when component mounts and camera mode is active
  useEffect(() => {
    if (manualMode) {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (err) {
          console.error('Error clearing scanner:', err);
        }
        scannerRef.current = null;
      }
      setScannerReady(false);
      return;
    }

    // Initialize html5-qrcode scanner
    const initScanner = async () => {
      try {
        setScanError('');
        setIsScanning(false);
        
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          /* useBarCodeDetectorIfAvailable= */ true
        );

        const onScanSuccess = (decodedText: string) => {
          handleBarcodeDetected(decodedText);
        };

        const onScanError = (error: string) => {
          // Silently continue scanning on error - don't show every frame's error
          return;
        };

        scanner.render(onScanSuccess, onScanError);
        scannerRef.current = scanner;
        setScannerReady(true);
        setIsScanning(true);
      } catch (err) {
        console.error('Scanner initialization error:', err);
        setScanError('Camera not available. Using manual entry instead.');
        setTimeout(() => setManualMode(true), 2000);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch (err) {
          console.error('Error cleaning up scanner:', err);
        }
      }
    };
  }, [manualMode]);

  const handleBarcodeDetected = (barcode: string) => {
    setLastScanned(barcode);
    
    // Check if barcode exists in catalog
    const results = searchCatalog(barcode);
    const exactMatch = results.find(item => item.barcode === barcode);
    
    if (exactMatch) {
      setMatchedItem(exactMatch);
      onScan(barcode, exactMatch);
    } else {
      setMatchedItem(null);
      onScan(barcode);
    }
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

            <div id="qr-reader" className="w-full h-full" />
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
