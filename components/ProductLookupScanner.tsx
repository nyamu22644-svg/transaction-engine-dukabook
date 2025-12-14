import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Eye, EyeOff, RefreshCw, ShoppingCart, AlertCircle, Check } from 'lucide-react';
import Quagga from '@ericblade/quagga2';
import { lookupProductByBarcode, registerProductByBarcode } from '../services/barcodeProductService';
import { InventoryItem } from '../types';

interface ScanStatus {
  state: 'searching' | 'found' | 'not-found' | 'registering' | 'error';
  message: string;
}

interface ScannedProduct {
  product: InventoryItem;
  buyingPrice: number;
  sellingPrice: number;
  stock: number;
  notes: string;
}

interface ProductLookupScannerProps {
  storeId: string;
  onProductFound?: (product: ScannedProduct) => void;
  onProductRegistered?: (product: InventoryItem) => void;
  onClose?: () => void;
}

export const ProductLookupScanner: React.FC<ProductLookupScannerProps> = ({
  storeId,
  onProductFound,
  onProductRegistered,
  onClose
}) => {
  const [scanStatus, setScanStatus] = useState<ScanStatus>({
    state: 'searching',
    message: '🔍 Searching for barcode...'
  });
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [foundProduct, setFoundProduct] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFrame, setShowFrame] = useState(true);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [formData, setFormData] = useState({
    item_name: '',
    buying_price: '',
    unit_price: '',
    current_stock: '',
    category: 'Uncategorized',
    buyingPrice: 0,
    sellingPrice: 0,
    stock: 0,
    notes: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationError, setRegistrationError] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<boolean>(false);
  const scannedCodesRef = useRef<Set<string>>(new Set());

  // Initialize scanner
  useEffect(() => {
    initializeScanner();
    return () => {
      stopScanner();
    };
  }, []);

  // Populate form when product is found
  useEffect(() => {
    if (foundProduct) {
      setFormData((prev) => ({
        ...prev,
        item_name: foundProduct.item_name || '',
        buying_price: (foundProduct.buying_price || 0).toString(),
        unit_price: (foundProduct.unit_price || 0).toString(),
        current_stock: (foundProduct.current_stock || 0).toString(),
        category: foundProduct.category || '',
        buyingPrice: foundProduct.buying_price || 0,
        sellingPrice: foundProduct.unit_price || 0,
        stock: foundProduct.current_stock || 0,
        notes: ''
      }));
    }
  }, [foundProduct]);

  const initializeScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1440 },
          advanced: [{ focusMode: 'continuous' }] as any
        }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Check torch capability
      try {
        const track = stream.getVideoTracks()[0];
        const capabilities = (track as any).getCapabilities?.();
        if (capabilities?.torch) {
          setTorchAvailable(true);
        }
      } catch (e) {
        console.log('Torch not available');
      }

      // Start Quagga
      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            constraints: {
              width: { ideal: 1920 },
              height: { ideal: 1440 },
              facingMode: 'environment',
              aspectRatio: { min: 1, ideal: 1.5, max: 2 }
            },
            target: videoRef.current,
            area: {
              top: '20%',
              right: '0%',
              left: '0%',
              bottom: '20%'
            }
          },
          locator: {
            patchSize: 'large',
            halfSample: false
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          frequency: 30,
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
            ] as any,
            debug: {
              drawBoundingBox: false,
              showFrequency: false,
              drawScanline: false,
              showPattern: false,
              printReaderInfo: false
            }
              lineWidth: 2
            }
          }
        },
        (err) => {
          if (err) {
            console.error('Quagga init error:', err);
            setScanStatus({
              state: 'error',
              message: '❌ Camera error. Check permissions.'
            });
            return;
          }

          Quagga.onDetected(handleBarcodeDetected);
          Quagga.start();
          scannerRef.current = true;
        }
      );
    } catch (err) {
      console.error('Error initializing scanner:', err);
      setScanStatus({
        state: 'error',
        message: '❌ Unable to access camera'
      });
    }
  };

  const handleBarcodeDetected = async (result: any) => {
    const barcode = result.codeResult?.code;

    if (!barcode || scannedCodesRef.current.has(barcode)) {
      return;
    }

    scannedCodesRef.current.add(barcode);
    setScannedBarcode(barcode);

    // Play success beep
    playSuccessBeep();

    setScanStatus({
      state: 'found',
      message: `✅ Found: ${barcode}`
    });

    // Look up product
    setLoading(true);
    const product = await lookupProductByBarcode(storeId, barcode);

    if (product) {
      setFoundProduct(product);
      setFormData({
        ...formData,
        buyingPrice: product.buying_price || 0,
        sellingPrice: product.unit_price || 0,
        stock: product.current_stock || 0,
        notes: ''
      });
      setScanStatus({
        state: 'found',
        message: `✅ Found: ${product.item_name}`
      });
    } else {
      // Product not found - show registration form
      setScanStatus({
        state: 'not-found',
        message: `❌ Product not found. Register to add.`
      });
      setShowRegistration(true);
      setFormData({
        ...formData,
        item_name: '',
        buying_price: '',
        unit_price: '',
        current_stock: '',
        category: 'Uncategorized'
      });
      playErrorBeep();
    }

    setLoading(false);
  };

  const toggleTorch = async () => {
    try {
      if (!streamRef.current) return;

      const track = streamRef.current.getVideoTracks()[0];
      if (!track) return;

      await (track as any).applyConstraints({
        advanced: [{ torch: !torchEnabled }]
      });

      setTorchEnabled(!torchEnabled);
      playSuccessBeep();
    } catch (err) {
      console.error('Torch toggle failed:', err);
    }
  };

  const handleRegisterProduct = async () => {
    // Validate form
    if (!formData.item_name || !formData.buying_price || !formData.unit_price || !formData.current_stock) {
      setRegistrationError('Please fill all required fields');
      return;
    }

    setIsRegistering(true);
    setRegistrationError('');
    setScanStatus({
      state: 'registering',
      message: '⚙️ Registering product...'
    });

    try {
      const newProduct = await registerProductByBarcode(storeId, {
        barcode: scannedBarcode,
        item_name: formData.item_name,
        buying_price: parseFloat(formData.buying_price),
        unit_price: parseFloat(formData.unit_price),
        current_stock: parseInt(formData.current_stock),
        category: formData.category,
      });

      setScanStatus({
        state: 'found',
        message: `✅ Registered: ${newProduct.item_name}`
      });
      setFoundProduct(newProduct);
      setShowRegistration(false);
      setFormData({
        ...formData,
        item_name: '',
        buying_price: '',
        unit_price: '',
        current_stock: '',
        category: 'Uncategorized',
        buyingPrice: newProduct.buying_price || 0,
        sellingPrice: newProduct.unit_price || 0,
        stock: newProduct.current_stock || 0,
      });
      playSuccessBeep();
      onProductRegistered?.(newProduct);
    } catch (err) {
      setRegistrationError('Failed to register product. Try again.');
      setScanStatus({
        state: 'error',
        message: '❌ Registration failed'
      });
      playErrorBeep();
    } finally {
      setIsRegistering(false);
    }
  };

  const playSuccessBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const freq1 = 1000;
      const freq2 = 1200;
      const duration = 0.1;
      const now = audioContext.currentTime;

      [freq1, freq2].forEach((freq, idx) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

        oscillator.start(now + idx * duration);
        oscillator.stop(now + (idx + 1) * duration);
      });
    } catch (e) {
      console.log('Audio beep failed');
    }
  };

  const playErrorBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 400;
      const now = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      oscillator.start(now);
      oscillator.stop(now + 0.3);
    } catch (e) {
      console.log('Audio error beep failed');
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      Quagga.stop();
      Quagga.offDetected(() => {});
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
  };

  const handleSubmit = () => {
    if (!foundProduct) return;

    const product: ScannedProduct = {
      product: foundProduct,
      buyingPrice: formData.buyingPrice,
      sellingPrice: formData.sellingPrice,
      stock: formData.stock,
      notes: formData.notes
    };

    setSubmitted(true);
    if (onProductFound) {
      onProductFound(product);
    }

    // Reset after 2 seconds
    setTimeout(() => {
      setFoundProduct(null);
      setScannedBarcode('');
      setScanStatus({ state: 'searching', message: '🔍 Searching for barcode...' });
      setSubmitted(false);
      scannedCodesRef.current.clear();
    }, 2000);
  };

  const handleScan = (barcode: string) => {
    if (barcode.trim()) {
      handleBarcodeDetected({ codeResult: { code: barcode } });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">📦 Product Lookup Scanner</h2>
        <div className="flex gap-2">
          {torchAvailable && (
            <button
              onClick={toggleTorch}
              className={`p-2 rounded-lg transition ${
                torchEnabled
                  ? 'bg-yellow-500 text-black'
                  : 'bg-slate-700 text-white hover:bg-slate-600'
              }`}
              title="Toggle flashlight"
            >
              <Lightbulb size={20} />
            </button>
          )}
          <button
            onClick={() => setShowFrame(!showFrame)}
            className="p-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600"
            title="Toggle scanning frame"
          >
            {showFrame ? <Eye size={20} /> : <EyeOff size={20} />}
          </button>
          <button
            onClick={() => {
              stopScanner();
              if (onClose) onClose();
            }}
            className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
          >
            Close
          </button>
        </div>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative bg-black overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Scanning frame */}
        {showFrame && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
              className="border-4 border-green-500 rounded-lg animate-pulse-glow"
              style={{
                width: '80%',
                height: '40%',
                boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)'
              }}
            >
              <div className="absolute inset-0 animate-slide" style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #22c55e, transparent)' }} />
            </div>
          </div>
        )}

        {/* Status indicator */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 px-4 py-2 rounded-lg">
          <p className="text-white font-semibold text-center">{scanStatus.message}</p>
        </div>
      </div>

      {/* Product details panel */}
      <div className="bg-slate-900 border-t border-slate-800 p-6 max-h-[45vh] overflow-y-auto">
        {/* Registration form for new products */}
        {showRegistration && !foundProduct && (
          <div className="space-y-4">
            <h3 className="text-white font-bold text-lg mb-4">Register New Product</h3>
            <p className="text-slate-300 text-sm">
              Barcode: <span className="text-white font-mono">{scannedBarcode}</span>
            </p>

            {registrationError && (
              <div className="bg-red-900 border border-red-600 text-red-200 px-3 py-2 rounded text-sm">
                {registrationError}
              </div>
            )}

            <div>
              <label className="text-slate-400 text-sm block mb-1">Product Name *</label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) =>
                  setFormData({ ...formData, item_name: e.target.value })
                }
                placeholder="e.g., Crown Paint White 4L"
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm block mb-1">Buying Price (KES) *</label>
              <input
                type="number"
                value={formData.buying_price}
                onChange={(e) =>
                  setFormData({ ...formData, buying_price: e.target.value })
                }
                placeholder="e.g., 1500"
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm block mb-1">Selling Price (KES) *</label>
              <input
                type="number"
                value={formData.unit_price}
                onChange={(e) =>
                  setFormData({ ...formData, unit_price: e.target.value })
                }
                placeholder="e.g., 2500"
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
              />
              {formData.buying_price && formData.unit_price && (
                <p className="text-slate-400 text-xs mt-1">
                  Margin: {(((parseFloat(formData.unit_price) - parseFloat(formData.buying_price)) / parseFloat(formData.buying_price)) * 100).toFixed(1)}%
                </p>
              )}
            </div>

            <div>
              <label className="text-slate-400 text-sm block mb-1">Stock Quantity *</label>
              <input
                type="number"
                value={formData.current_stock}
                onChange={(e) =>
                  setFormData({ ...formData, current_stock: e.target.value })
                }
                placeholder="e.g., 50"
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="text-slate-400 text-sm block mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
              >
                <option>Uncategorized</option>
                <option>Paint</option>
                <option>Cement</option>
                <option>Beverages</option>
                <option>Food</option>
                <option>Electronics</option>
                <option>Hardware</option>
                <option>Other</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleRegisterProduct}
                disabled={isRegistering}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                {isRegistering ? 'Saving...' : 'Save Product'}
              </button>
              <button
                onClick={() => {
                  setShowRegistration(false);
                  setScannedBarcode('');
                  setScanStatus({ state: 'searching', message: '🔍 Searching for barcode...' });
                  scannedCodesRef.current.clear();
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-700 text-white hover:bg-slate-600 font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!foundProduct && !submitted && !showRegistration && (
          <div className="text-center py-8">
            <div className="text-slate-400">
              <ShoppingCart className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Scan a barcode to get started</p>
              <p className="text-sm text-slate-500 mt-2">Or enter manually:</p>
              <input
                type="text"
                placeholder="Enter barcode manually"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleScan((e.target as HTMLInputElement).value);
                    (e.target as HTMLInputElement).value = '';
                  }
                }}
                className="mt-3 w-full px-4 py-2 bg-slate-800 text-white rounded-lg placeholder-slate-500"
              />
            </div>
          </div>
        )}

        {foundProduct && !submitted && (
          <div className="space-y-6">
            {/* Product info */}
            <div className="bg-slate-800 rounded-lg p-4 space-y-3">
              <div>
                <p className="text-slate-400 text-sm">Product Name</p>
                <p className="text-white text-lg font-semibold">{foundProduct.item_name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-slate-400 text-sm">Barcode</p>
                  <p className="text-white font-mono">{foundProduct.barcode}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Category</p>
                  <p className="text-white">{foundProduct.category || 'Uncategorized'}</p>
                </div>
              </div>

              {foundProduct.description && (
                <div>
                  <p className="text-slate-400 text-sm">Description</p>
                  <p className="text-white text-sm">{foundProduct.description}</p>
                </div>
              )}
            </div>

            {/* Form inputs */}
            <div className="bg-slate-800 rounded-lg p-4 space-y-4">
              <div>
                <label className="text-slate-400 text-sm block mb-1">💰 Buying Price</label>
                <input
                  type="number"
                  value={formData.buyingPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, buyingPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm block mb-1">💵 Selling Price</label>
                <input
                  type="number"
                  value={formData.sellingPrice}
                  onChange={(e) =>
                    setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                />
                {formData.buyingPrice > 0 && (
                  <p className="text-slate-400 text-xs mt-1">
                    Margin: {(((formData.sellingPrice - formData.buyingPrice) / formData.buyingPrice) * 100).toFixed(1)}%
                  </p>
                )}
              </div>

              <div>
                <label className="text-slate-400 text-sm block mb-1">📦 Stock Quantity</label>
                <input
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-400 text-sm block mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Optional notes about this product"
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:border-blue-500 outline-none text-sm"
                  rows={2}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setFoundProduct(null);
                  setScannedBarcode('');
                  setScanStatus({ state: 'searching', message: '🔍 Searching for barcode...' });
                  scannedCodesRef.current.clear();
                }}
                className="flex-1 px-4 py-3 rounded-lg bg-slate-700 text-white hover:bg-slate-600 font-semibold flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} /> Scan Another
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check size={18} /> Confirm & Save
              </button>
            </div>
          </div>
        )}

        {submitted && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="bg-green-900 bg-opacity-30 border border-green-500 rounded-lg p-6 text-center max-w-sm">
              <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-white font-semibold text-lg">Product Saved!</p>
              <p className="text-slate-300 text-sm mt-2">
                {foundProduct?.item_name} has been recorded
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
          }
          50% {
            box-shadow: 0 0 30px rgba(34, 197, 94, 0.8);
          }
        }

        @keyframes slide {
          0% {
            transform: translateY(-100%);
          }
          100% {
            transform: translateY(100%);
          }
        }

        .animate-pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }

        .animate-slide {
          animation: slide 1s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default ProductLookupScanner;
