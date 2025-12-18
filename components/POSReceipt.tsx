import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';

interface ReceiptItem {
  item_name: string;
  barcode: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
}

interface ReceiptData {
  transactionId: string;
  storeName: string;
  timestamp: string;
  items: ReceiptItem[];
  subtotal: number;
  total: number;
  paymentMethod: string;
  amountTendered: number;
  changeDue: number;
}

interface POSReceiptProps {
  receipt: ReceiptData;
  onClose: () => void;
}

/**
 * POS Receipt Display & Print Modal
 */
export const POSReceipt: React.FC<POSReceiptProps> = ({ receipt, onClose }) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!receiptRef.current) return;

    const printWindow = window.open('', '', 'height=800,width=600');
    if (!printWindow) return;

    const receiptHTML = receiptRef.current.innerHTML;
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receipt.transactionId}</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 10px;
              background: white;
              color: black;
            }
            .receipt {
              max-width: 300px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .store-name {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .timestamp {
              font-size: 12px;
              color: #555;
            }
            .tx-id {
              font-size: 10px;
              font-weight: bold;
              margin-top: 5px;
            }
            .items {
              margin: 15px 0;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .item {
              font-size: 12px;
              margin-bottom: 8px;
            }
            .item-name {
              font-weight: bold;
            }
            .item-details {
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }
            .item-barcode {
              font-size: 9px;
              color: #888;
              margin-top: 2px;
            }
            .totals {
              margin: 15px 0;
              border-bottom: 2px dashed #000;
              padding-bottom: 10px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              margin-bottom: 5px;
            }
            .total-row.final {
              font-size: 14px;
              font-weight: bold;
              border-top: 1px solid #000;
              padding-top: 5px;
            }
            .payment-info {
              font-size: 11px;
              text-align: center;
              margin: 10px 0;
              padding: 10px;
              background: #f5f5f5;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3px;
            }
            .thank-you {
              text-align: center;
              font-size: 12px;
              font-weight: bold;
              margin-top: 15px;
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            ${receiptHTML}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[85vh] flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-50 to-blue-50 flex-shrink-0">
          <h2 className="font-bold text-lg">📄 Receipt</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div ref={receiptRef} className="p-6 font-mono text-sm bg-white">
            {/* Header */}
            <div className="text-center mb-4 pb-3 border-b-2 border-dashed border-gray-400">
              <p className="font-bold text-base">{receipt.storeName}</p>
              <p className="text-xs text-gray-600 mt-1">{receipt.timestamp}</p>
              <p className="text-xs font-bold text-gray-800 mt-2">TX: {receipt.transactionId}</p>
            </div>

            {/* Items */}
            <div className="mb-4 pb-3 border-b-2 border-dashed border-gray-400">
              {receipt.items.map((item, idx) => (
                <div key={idx} className="mb-3">
                  <p className="font-bold text-xs text-gray-900">{item.item_name}</p>
                  <div className="flex justify-between text-xs text-gray-600 mt-1">
                    <span>{item.quantity} × {item.unit_price.toLocaleString()}</span>
                    <span className="font-bold text-gray-900">{item.total_amount.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-1 truncate">
                    {item.barcode}
                  </p>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mb-4 pb-3 border-b-2 border-dashed border-gray-400">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-bold text-gray-900">{receipt.subtotal.toLocaleString()} KES</span>
              </div>
              <div className="flex justify-between text-sm font-bold border-t border-gray-400 pt-2">
                <span>TOTAL:</span>
                <span className="text-green-600">{receipt.total.toLocaleString()} KES</span>
              </div>
            </div>

            {/* Payment Info */}
            <div className="mb-4 pb-3 border-b-2 border-dashed border-gray-400 bg-gray-50 p-2">
              <p className="text-xs font-bold text-gray-800 mb-2">PAYMENT METHOD: {receipt.paymentMethod}</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount Tendered:</span>
                  <span className="font-bold text-gray-900">{receipt.amountTendered.toLocaleString()} KES</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Change Due:</span>
                  <span className={`font-bold ${receipt.changeDue > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {receipt.changeDue.toLocaleString()} KES
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-xs font-bold text-gray-800">THANK YOU!</p>
              <p className="text-xs text-gray-600 mt-1">Come Again</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50 flex gap-2 flex-shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-gray-600 hover:bg-gray-700 text-white font-bold rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSReceipt;
