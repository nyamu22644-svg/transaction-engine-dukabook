export default async function handler(req, res) {
  console.log('API called with method:', req.method);
  console.log('Request body:', req.body);

  // Quick debug GET endpoint to check runtime env presence (useful for diagnosing deployment)
  if (req.method === 'GET') {
    // Resolve secret using same logic as POST handler
    let secretKey = process.env.VITE_INTASEND_SECRET_KEY || null;
    try {
      if (!secretKey) {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env.production');
        if (fs.existsSync(envPath)) {
          const raw = fs.readFileSync(envPath, 'utf8');
          raw.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const idx = trimmed.indexOf('=');
            if (idx === -1) return;
            const k = trimmed.slice(0, idx);
            const v = trimmed.slice(idx + 1);
            if (k === 'VITE_INTASEND_SECRET_KEY') secretKey = v;
          });
        }
      }
    } catch (e) {
      console.error('Error reading .env.production fallback (debug):', e && e.message);
    }

    const present = !!secretKey;
    const masked = present ? (secretKey.substring(0, 5) + '...') : null;
    return res.status(200).json({ ok: true, secret_present: present, secret_masked: masked });
  }

  // Only allow POST requests for real payment processing
  if (req.method !== 'POST') {
    console.error('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      public_key,
      email,
      phone_number,
      first_name,
      amount,
      currency,
      plan_name,
      plan_period,
    } = req.body;

    console.log('Creating subscription with:', { email, amount, currency });

    // Get secret key from environment, fallback to .env.production file if present
    let secretKey = process.env.VITE_INTASEND_SECRET_KEY;
    if (!secretKey) {
      try {
        const fs = require('fs');
        const path = require('path');
        const envPath = path.join(process.cwd(), '.env.production');
        if (fs.existsSync(envPath)) {
          const raw = fs.readFileSync(envPath, 'utf8');
          raw.split(/\r?\n/).forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const idx = trimmed.indexOf('=');
            if (idx === -1) return;
            const k = trimmed.slice(0, idx);
            const v = trimmed.slice(idx + 1);
            if (k === 'VITE_INTASEND_SECRET_KEY') secretKey = v;
          });
        }
      } catch (e) {
        console.error('Error reading .env.production fallback:', e && e.message);
      }
    }

    if (!secretKey) {
      console.error('VITE_INTASEND_SECRET_KEY not configured');
      return res.status(401).json({ error: 'Server configuration error: missing API key' });
    }

    // Call IntaSend API from server-side (no CORS issues)
    console.log('Calling IntaSend API...');
    const intasendResponse = await fetch('https://api.intasend.com/api/v1/subscription/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        public_key,
        email,
        phone_number,
        first_name,
        amount,
        currency,
        plan_name,
        plan_period,
      }),
    });

    console.log('IntaSend response status:', intasendResponse.status);
    const data = await intasendResponse.json();
    console.log('IntaSend response:', data);

    if (!intasendResponse.ok) {
      console.error('IntaSend API error:', data);
      return res.status(intasendResponse.status).json({
        error: 'IntaSend API error',
        details: data,
      });
    }

    console.log('Success! Returning:', data);
    return res.status(200).json(data);
  } catch (error) {
    console.error('Payment API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
