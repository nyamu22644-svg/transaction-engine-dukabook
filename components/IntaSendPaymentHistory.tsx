import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

export default function IntaSendPaymentHistory() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    supabase
      .from('intasend_payments')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPayments(data || []);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading payment history...</div>;

  return (
    <div style={{margin:'24px 0',padding:16,border:'1px solid #eee',borderRadius:8}}>
      <h3>IntaSend Payment History</h3>
      <table style={{width:'100%',fontSize:14}}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Event</th>
            <th>Amount</th>
            <th>Phone</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {payments.map((p) => (
            <tr key={p.id}>
              <td>{new Date(p.created_at).toLocaleString()}</td>
              <td>{p.event}</td>
              <td>{p.data?.amount || '-'}</td>
              <td>{p.data?.phone_number || '-'}</td>
              <td>{p.data?.email || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
