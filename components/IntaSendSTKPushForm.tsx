import React, { useState } from 'react';
import { initiateMpesaPayment, IntaSendPaymentRequest } from '../services/intasendService';

export default function IntaSendSTKPushForm() {
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const payload: IntaSendPaymentRequest = {
        phone_number: phone,
        amount: parseFloat(amount),
        email,
      };
      const res = await initiateMpesaPayment(payload);
      setResult(res);
    } catch (err: any) {
      setError(typeof err === 'string' ? err : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '2rem auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>Pay with M-Pesa (IntaSend STK Push)</h2>
      <div style={{ marginBottom: 12 }}>
        <label>Phone Number (07...):<br />
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required pattern="07[0-9]{8}" placeholder="07XXXXXXXX" style={{ width: '100%' }} />
        </label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Amount (KES):<br />
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required min="1" step="0.01" style={{ width: '100%' }} />
        </label>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label>Email:<br />
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </label>
      </div>
      <button type="submit" disabled={loading} style={{ width: '100%', padding: 12, background: '#009e3a', color: '#fff', border: 'none', borderRadius: 4 }}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
      {result && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 4, color: '#065f46' }}>
          <strong>✓ Payment Initiated!</strong><br />
          <small>{result.message || result.status_code || 'Check your phone for payment prompt'}</small>
        </div>
      )}
      {error && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 4, color: '#991b1b' }}>
          <strong>✗ Error:</strong> <br />
          <small>{error}</small>
        </div>
      )}
    </form>
  );
}
