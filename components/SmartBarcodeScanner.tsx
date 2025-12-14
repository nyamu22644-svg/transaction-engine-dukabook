import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Keyboard, Search, AlertCircle, CheckCircle2, SwitchCamera, Lightbulb, Plus } from 'lucide-react';
import Quagga from '@ericblade/quagga2';
import globalProductService, { GlobalProduct } from '../services/globalProductService';
import shopInventoryService, { ShopInventoryItem } from '../services/shopInventoryService';
import { useStore } from '../store';

interface SmartBarcodeScannerProps {
  onScan: (barcode: string, item?: ShopInventoryItem) => void;
  onClose: () => void;
}

type ScanStatus = 'searching' | 'found' | 'not-found' | 'duplicate' | 'error' | 'register' | null;

/**
 * Smart Two-Stage Barcode Scanner
 * 
 * Stage 1: Product Lookup
 *   - Scan barcode
 *   - Check global_products catalog
 *   - If found: Show confirmation dialog
 *   - If not found: Show registration form
 * 
 * Stage 2: Shop Inventory
 *   - Add to shop_inventory with shop-specific prices
 *   - Save both global and private data
 * 
 * Network Effect: Each new product increases catalog for all shops
 */
export const SmartBarcodeScanner: React.FC<SmartBarcodeScannerProps> = ({ onScan, onClose }) => {
  const { currentStore } = useStore();
  const videoRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Scanning states
  const [manualMode, setManualMode] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScanned, setLastScanned] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const [scanError, setScanError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [scanStatus, setScanStatus] = useState<ScanStatus>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [detectedBarcodes, setDetectedBarcodes] = useState<Set<string>>(new Set());
  const [showScanFrame, setShowScanFrame] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  // Two-stage flow states
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [globalProduct, setGlobalProduct] = useState<GlobalProduct | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Form states for new product registration
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('General');
  const [productImageUrl, setProductImageUrl] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [sellingPrice, setSellingPrice] = useState('');
  const [buyingPrice, setBuyingPrice] = useState('');
  const [customAlias, setCustomAlias] = useState('');

  // Initialize Quagga2 barcode scanner
  useEffect(() => {
    if (manualMode || isRegistering) {
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
                width: { min: 320, ideal: 1920, max: 1920 },
                height: { min: 240, ideal: 1440, max: 1440 },
                aspectRatio: { ideal: 16 / 9 }
              },
              area: {
                top: '20%',
                right: '0%',
                left: '0%',
                bottom: '20%'
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
                'code_39_vin_reader',
                'code_93_reader'
              ],
              debug: {
                showCanvas: false,
                showPatternOrigin: false,
                showFrequency: false,
                drawBoundingBox: false,
                drawScanline: false
              }
            },
            locator: {
              halfSample: true,
              patchSize: 'large',
              showCanvas: false
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 30,
            debug: false
          } as any
        );

        Quagga.start?.();
        setScannerReady(true);
        setIsScanning(true);

        // Check for torch support
        try {
          const stream = Quagga.mediaStream?.getVideoTracks?.()?.[0];
          if (stream?.getCapabilities?.()) {
            const capabilities = stream.getCapabilities?.() as any;
            if (capabilities?.torch) {
              setTorchAvailable(true);
            }
          }
          streamRef.current = Quagga.mediaStream;
        } catch (err) {
          console.log('Torch not available');
        }

        // Handle detection
        Quagga.onDetected?.((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            const detectedCode = result.codeResult.code.trim();
            if (detectedCode && detectedCode.length > 0) {
              handleBarcodeDetected(detectedCode);
            }
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
  }, [manualMode, facingMode, isRegistering]);

  // Sound feedback
  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 1000;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);

      const osc2 = audioContext.createOscillator();
      osc2.connect(gainNode);
      osc2.frequency.value = 1200;
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

      oscillator.frequency.value = 400;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (err) {
      console.error('Sound error:', err);
    }
  };

  /**
   * Stage 1: Check global catalog
   */
  const handleBarcodeDetected = async (barcode: string) => {
    // Prevent duplicates
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

    setDetectedBarcodes(prev => new Set([...prev, barcode]));
    setScanStatus('searching');
    setStatusMessage('🔍 Searching global catalog...');
    setCurrentBarcode(barcode);
    setLastScanned(barcode);

    // Search global catalog
    setTimeout(async () => {
      const product = await globalProductService.searchByBarcode(barcode);

      if (product) {
        // FOUND IN GLOBAL CATALOG
        setScanStatus('found');
        setStatusMessage(`✅ Found: ${product.generic_name}`);
        setGlobalProduct(product);
        setIsNewProduct(false);
        playSuccessSound();

        // Show confirmation dialog
        setTimeout(() => {
          setIsRegistering(true);
        }, 500);
      } else {
        // NOT IN GLOBAL CATALOG - Need to register
        setScanStatus('not-found');
        setStatusMessage(`⚠️ New product! Please register: ${barcode}`);
        setGlobalProduct(null);
        setIsNewProduct(true);
        playErrorSound();

        // Show registration form
        setTimeout(() => {
          setProductName('');
          setProductCategory('General');
          setIsRegistering(true);
        }, 500);
      }
    }, 300);
  };

  /**
   * Stage 2: Register or confirm product and add to shop inventory
   */
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentStore) {
      setScanError('No store selected');
      return;
    }

    if (!sellingPrice || !quantity) {
      setScanError('Selling price and quantity are required');
      return;
    }

    try {
      setScanError('');
      let product = globalProduct;

      // If new product, create it in global catalog first
      if (isNewProduct && !globalProduct) {
        if (!productName.trim()) {
          setScanError('Product name is required');
          return;
        }

        product = await globalProductService.createProduct(
          currentBarcode,
          productName,
          productCategory,
          productImageUrl || undefined
        );

        if (!product) {
          setScanError('Failed to create product in global catalog');
          return;
        }
      }

      // If product exists (either from catalog or just created), add to shop inventory
      if (product || globalProduct) {
        const inventoryItem = await shopInventoryService.addItem({
          shop_id: currentStore.id,
          barcode: currentBarcode,
          quantity: parseFloat(quantity),
          selling_price: parseFloat(sellingPrice),
          buying_price: buyingPrice ? parseFloat(buyingPrice) : undefined,
          custom_alias: customAlias || undefined
        });

        if (inventoryItem) {
          playSuccessSound();
          setStatusMessage('✅ Product added to inventory!');

          setTimeout(() => {
            onScan(currentBarcode, inventoryItem);
            setDetectedBarcodes(new Set());
            setIsRegistering(false);
            setScanStatus(null);
            // Reset form
            setProductName('');
            setProductCategory('General');
            setQuantity('1');
            setSellingPrice('');
            setBuyingPrice('');
            setCustomAlias('');
          }, 800);
        } else {
          setScanError('Failed to add item to shop inventory');
        }
      }
    } catch (err) {
      console.error('Error submitting product:', err);
      setScanError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const switchCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    try {
      if (!streamRef.current) return;

      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (!videoTrack) return;

      const constraints = {
        advanced: [{ torch: !torchEnabled }]
      };

      await videoTrack.applyConstraints(constraints);
      setTorchEnabled(!torchEnabled);
      playSuccessSound();
    } catch (err) {
      console.error('Error toggling torch:', err);
      setStatusMessage('💡 Flashlight not available on this device');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;

    const barcode = manualBarcode.trim();
    handleBarcodeDetected(barcode);
    setManualBarcode('');
  };

  if (manualMode && !isRegistering) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Manual Entry</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter Barcode
              </label>
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Scan or type barcode..."
                autoFocus
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {scanError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle size={20} />
                <span>{scanError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Search
            </button>

            <button
              type="button"
              onClick={() => setManualMode(false)}
              className="w-full bg-gray-200 text-gray-800 py-2 rounded-lg font-semibold hover:bg-gray-300 transition flex items-center justify-center gap-2"
            >
              <Camera size={20} /> Back to Camera
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (isRegistering) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {isNewProduct ? '➕ Register New Product' : '✅ Confirm Product'}
            </h2>
            <button
              onClick={() => {
                setIsRegistering(false);
                setDetectedBarcodes(new Set());
                setScanStatus(null);
              }}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-gray-600">Barcode</p>
              <p className="text-lg font-mono font-bold text-blue-600">{currentBarcode}</p>
            </div>

            {globalProduct && !isNewProduct && (
              <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Found in Catalog</p>
                <p className="text-lg font-semibold text-green-700">
                  {globalProduct.generic_name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Category: {globalProduct.category}
                </p>
                <p className="text-xs text-gray-600">
                  Used by {globalProduct.contribution_count} shop(s)
                </p>
              </div>
            )}

            {isNewProduct && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g., Simba Cement 50kg"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option>General</option>
                    <option>Building Materials</option>
                    <option>Groceries</option>
                    <option>Electronics</option>
                    <option>Clothing</option>
                    <option>Beverages</option>
                    <option>Toiletries</option>
                    <option>Other</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity in Stock *
              </label>
              <input
                type="number"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g., 50"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selling Price (KES) *
              </label>
              <input
                type="number"
                step="0.01"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="e.g., 750"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buying Price (KES) - Optional
              </label>
              <input
                type="number"
                step="0.01"
                value={buyingPrice}
                onChange={(e) => setBuyingPrice(e.target.value)}
                placeholder="e.g., 600"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Nickname for This Item - Optional
              </label>
              <input
                type="text"
                value={customAlias}
                onChange={(e) => setCustomAlias(e.target.value)}
                placeholder="e.g., Simba Mfuko"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {scanError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle size={20} />
                <span className="text-sm">{scanError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              <Plus size={20} /> Save & Add to Inventory
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Camera scanning mode
  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Video Feed */}
      <div className="flex-1 relative overflow-hidden bg-black">
        <div ref={videoRef} className="w-full h-full" />

        {/* Scanning Frame Animation */}
        {showScanFrame && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              {/* Pulsing border */}
              <div className="absolute inset-0 border-4 border-green-500 rounded-lg animate-pulse-glow" />

              {/* Animated scanning line */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-green-400 to-transparent animate-slide" />

              {/* Corner markers */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-500" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-500" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-500" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-500" />
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className="absolute top-20 left-0 right-0 text-center">
            <div className="inline-block bg-black bg-opacity-70 text-white px-4 py-2 rounded-lg">
              <p className="text-lg font-semibold">{statusMessage}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {scanError && (
          <div className="absolute top-32 left-0 right-0 px-4">
            <div className="flex items-center gap-2 p-3 bg-red-500 text-white rounded-lg">
              <AlertCircle size={20} />
              <span>{scanError}</span>
            </div>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="bg-gray-900 border-t border-gray-700 p-4">
        <div className="flex justify-center gap-3 mb-4">
          {/* Torch Button */}
          {torchAvailable && (
            <button
              onClick={toggleTorch}
              className={`p-3 rounded-full transition ${
                torchEnabled
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-700 text-white hover:bg-gray-600'
              }`}
              title="Toggle flashlight"
            >
              <Lightbulb size={24} />
            </button>
          )}

          {/* Frame Toggle */}
          <button
            onClick={() => setShowScanFrame(!showScanFrame)}
            className="p-3 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition"
            title="Toggle scan frame"
          >
            {showScanFrame ? '👁️' : '🚫'}
          </button>

          {/* Camera Switch */}
          <button
            onClick={switchCamera}
            className="p-3 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition"
            title="Switch camera"
          >
            <SwitchCamera size={24} />
          </button>

          {/* Manual Entry */}
          <button
            onClick={() => setManualMode(true)}
            className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
            title="Manual entry mode"
          >
            <Keyboard size={24} />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
            title="Close scanner"
          >
            <X size={24} />
          </button>
        </div>

        <p className="text-center text-gray-400 text-sm">
          {isScanning ? '🟢 Scanning...' : '🔴 Scanner not ready'}
        </p>
      </div>
    </div>
  );
};
