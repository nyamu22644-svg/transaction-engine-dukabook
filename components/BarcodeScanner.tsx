import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Camera, Flashlight, FlashlightOff, SwitchCamera, Keyboard, Search } from 'lucide-react';
import { searchCatalog, ItemTemplate } from '../data/itemTemplates';

interface BarcodeScannerProps {
  onScan: (barcode: string, item?: ItemTemplate) => void;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCamera, setHasCamera] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [torch, setTorch] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [matchedItem, setMatchedItem] = useState<ItemTemplate | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = useCallback(async () => {
    try {
      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        setHasCamera(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setHasCamera(false);
      setManualMode(true);
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    if (!manualMode) {
      startCamera();
    }
    return () => stopCamera();
  }, [manualMode, facingMode, startCamera, stopCamera]);

  // Toggle torch/flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    
    const track = streamRef.current.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as any;
    
    if (capabilities.torch) {
      const newTorchState = !torch;
      await (track as any).applyConstraints({
        advanced: [{ torch: newTorchState }]
      });
      setTorch(newTorchState);
    }
  };

  // Switch camera
  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // Simple barcode detection using canvas analysis
  // In production, you'd use a library like @nicolo-ribaudo/quagga2 or html5-qrcode
  useEffect(() => {
    if (!scanning || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const scanFrame = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        // Here you would integrate a barcode detection library
        // For demo purposes, we'll use a simulated detection
        // In production, use: html5-qrcode, quagga2, or zxing-js
      }
      animationId = requestAnimationFrame(scanFrame);
    };

    scanFrame();
    return () => cancelAnimationFrame(animationId);
  }, [scanning]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;

    const barcode = manualBarcode.trim();
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
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
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
                      <Search className="w-5 h-5 text-green-500" />
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
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition"
              >
                Search / Add Item
              </button>
            </form>

            {hasCamera && (
              <button 
                onClick={() => setManualMode(false)}
                className="w-full mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white py-3"
              >
                <Camera className="w-5 h-5" />
                Use Camera Instead
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Camera Mode */
        <>
          {/* Video Feed */}
          <div className="flex-1 relative">
            <video 
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Scan Guide Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-72 h-40 border-2 border-white/50 rounded-xl relative">
                {/* Corner markers */}
                <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                
                {/* Scan line animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse top-1/2" />
              </div>
            </div>

            {/* Last scanned */}
            {lastScanned && (
              <div className="absolute bottom-4 left-4 right-4 bg-green-500/90 text-white p-4 rounded-xl">
                <p className="font-mono text-lg">{lastScanned}</p>
                {matchedItem && (
                  <p className="text-sm opacity-90">{matchedItem.item_name} - KES {matchedItem.unit_price}</p>
                )}
              </div>
            )}
          </div>

          {/* Camera Controls */}
          <div className="p-6 bg-gradient-to-t from-black to-transparent">
            <div className="flex items-center justify-center gap-6">
              <button 
                onClick={toggleTorch}
                className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"
              >
                {torch ? (
                  <Flashlight className="w-6 h-6 text-yellow-400" />
                ) : (
                  <FlashlightOff className="w-6 h-6 text-white" />
                )}
              </button>

              <button 
                onClick={() => setManualMode(true)}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center"
              >
                <Keyboard className="w-7 h-7 text-black" />
              </button>

              <button 
                onClick={switchCamera}
                className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center"
              >
                <SwitchCamera className="w-6 h-6 text-white" />
              </button>
            </div>

            <p className="text-center text-white/60 text-sm mt-4">
              Position barcode within the frame
            </p>
          </div>
        </>
      )}
    </div>
  );
};
