# IntaSend M-Pesa Integration

This project now uses IntaSend for M-Pesa payments. IntaSend is designed for Kenyan developers and startups, is free to integrate, and only charges a small fee per transaction. It handles all Safaricom connections for you.

## How to Integrate IntaSend

1. Sign up at https://intasend.com and get your API keys.
2. Follow the official IntaSend API docs: https://developers.intasend.com/docs/mpesa/
3. Add your API keys to your environment variables or Supabase secrets.
4. Use the IntaSend REST API to initiate payments and check status.

## Example Payment Flow

- When a user wants to pay, call the IntaSend API from your backend (Node/Supabase Edge Function).
- Redirect the user to the IntaSend payment page or handle the response in your app.
- Listen for payment notifications (webhooks) from IntaSend to update your database.

## Dashboard

- The admin dashboard will show IntaSend payment status and transaction history.

## Migration Notes

- All previous Daraja/Safaricom code has been removed.
- Only IntaSend integration is supported now.

## Resources
- IntaSend API Docs: https://developers.intasend.com/docs/mpesa/
- IntaSend Dashboard: https://dashboard.intasend.com/

---

For any issues, contact IntaSend support or check their developer documentation.