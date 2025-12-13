#!/bin/bash

# Create .env file from Vercel environment variables
cat > .env.production << EOF
VITE_SUPABASE_URL=$VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
VITE_INTASEND_PUBLIC_KEY=$VITE_INTASEND_PUBLIC_KEY
VITE_INTASEND_SECRET_KEY=$VITE_INTASEND_SECRET_KEY
GEMINI_API_KEY=$GEMINI_API_KEY
EOF

echo "Environment file created:"
cat .env.production

# Run the actual build
npm run build
