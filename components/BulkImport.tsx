import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Download } from 'lucide-react';
import { InventoryItem } from '../types';

interface BulkImportProps {
  storeId: string;
  onImport: (items: Omit<InventoryItem, 'id'>[]) => Promise<void>;
  onClose: () => void;
}

export const BulkImport: React.FC<BulkImportProps> = ({ storeId, onImport, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setError('');
    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setError('CSV must have headers and at least one data row');
          return;
        }

        // Parse headers (first line)
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
        
        // Required columns
        const requiredCols = ['item_name', 'unit_price'];
        const missingCols = requiredCols.filter(col => !headers.includes(col));
        if (missingCols.length > 0) {
          setError(`Missing required columns: ${missingCols.join(', ')}`);
          return;
        }

        // Parse data rows
        const items = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length !== headers.length) continue;

          const item: any = {};
          headers.forEach((header, idx) => {
            item[header] = values[idx]?.trim().replace(/"/g, '') || '';
          });

          // Validate and transform
          if (!item.item_name) continue;

          items.push({
            item_name: item.item_name,
            barcode: item.barcode || generateBarcode(),
            unit_price: parseFloat(item.unit_price) || 0,
            buying_price: parseFloat(item.buying_price) || parseFloat(item.cost_price) || 0,
            current_stock: parseInt(item.current_stock) || parseInt(item.stock) || parseInt(item.quantity) || 0,
            low_stock_threshold: parseInt(item.low_stock_threshold) || parseInt(item.reorder_level) || 10,
            category: item.category || ''
          });
        }

        if (items.length === 0) {
          setError('No valid items found in CSV');
          return;
        }

        setPreview(items);
      } catch (err) {
        setError('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  // Parse CSV line handling quoted values with commas
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const generateBarcode = () => {
    // Generate random EAN-13 style barcode
    return '690' + Math.random().toString().slice(2, 12);
  };

  const handleImport = async () => {
    if (preview.length === 0) return;

    setImporting(true);
    setError('');

    try {
      const itemsToImport = preview.map(item => ({
        store_id: storeId,
        item_name: item.item_name,
        barcode: item.barcode,
        unit_price: item.unit_price,
        buying_price: item.buying_price,
        current_stock: item.current_stock,
        low_stock_threshold: item.low_stock_threshold,
        category: item.category
      }));

      await onImport(itemsToImport);
      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setError('Failed to import items');
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `item_name,barcode,unit_price,buying_price,current_stock,low_stock_threshold,category
"Cement Bamburi 50kg",6901234567001,750,680,50,10,Building
"Nails 4 inch (1kg)",6901234567003,220,180,100,20,Fasteners
"Paint Crown White 20L",6901234567006,3800,3200,20,5,Paints`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-800 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-green-500" />
            <div>
              <h2 className="text-xl font-bold text-white">Bulk Import Items</h2>
              <p className="text-sm text-slate-400">Upload CSV or Excel file</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {success ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Import Successful!</h3>
              <p className="text-slate-400">{preview.length} items imported to your inventory</p>
            </div>
          ) : (
            <>
              {/* Upload Area */}
              {!file && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 rounded-xl p-12 text-center cursor-pointer hover:border-slate-600 hover:bg-slate-800/30 transition"
                >
                  <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-white font-medium mb-2">Click to upload or drag and drop</p>
                  <p className="text-slate-500 text-sm">CSV file with item data</p>
                  <input 
                    ref={fileInputRef}
                    type="file" 
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
              )}

              {/* Download Template */}
              <button 
                onClick={downloadTemplate}
                className="mt-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm mx-auto"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </button>

              {/* Error */}
              {error && (
                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Preview */}
              {preview.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-white">Preview ({preview.length} items)</h3>
                    <button 
                      onClick={() => { setFile(null); setPreview([]); }}
                      className="text-slate-400 hover:text-white text-sm"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-800 sticky top-0">
                          <tr>
                            <th className="text-left p-3 text-slate-400 font-medium">Item Name</th>
                            <th className="text-left p-3 text-slate-400 font-medium">Barcode</th>
                            <th className="text-right p-3 text-slate-400 font-medium">Price</th>
                            <th className="text-right p-3 text-slate-400 font-medium">Stock</th>
                          </tr>
                        </thead>
                        <tbody>
                          {preview.slice(0, 10).map((item, idx) => (
                            <tr key={idx} className="border-t border-slate-800">
                              <td className="p-3 text-white">{item.item_name}</td>
                              <td className="p-3 text-slate-400 font-mono text-xs">{item.barcode}</td>
                              <td className="p-3 text-right text-white">{item.unit_price}</td>
                              <td className="p-3 text-right text-slate-400">{item.current_stock}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {preview.length > 10 && (
                      <div className="p-2 text-center text-slate-500 text-xs border-t border-slate-800">
                        ...and {preview.length - 10} more items
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && preview.length > 0 && (
          <div className="p-6 border-t border-slate-800">
            <button 
              onClick={handleImport}
              disabled={importing}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {importing ? 'Importing...' : `Import ${preview.length} Items`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
