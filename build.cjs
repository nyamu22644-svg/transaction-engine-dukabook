#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get environment variables
const env = {
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || '',
  VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || '',
  VITE_INTASEND_PUBLIC_KEY: process.env.VITE_INTASEND_PUBLIC_KEY || '',
  VITE_INTASEND_SECRET_KEY: process.env.VITE_INTASEND_SECRET_KEY || '',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
};

// If any env var is empty locally, attempt to read from .env.local (developer convenience)
const localEnvPath = path.join(__dirname, '.env.local');
const localEnv = {};
if (fs.existsSync(localEnvPath)) {
  const raw = fs.readFileSync(localEnvPath, 'utf8');
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const idx = trimmed.indexOf('=');
    if (idx === -1) return;
    const k = trimmed.slice(0, idx);
    const v = trimmed.slice(idx + 1);
    localEnv[k] = v;
  });
}

const finalEnv = Object.fromEntries(
  Object.entries(env).map(([k, v]) => [k, v || localEnv[k] || ''])
);

// Create .env.production from the resolved values
const envContent = Object.entries(finalEnv)
  .map(([key, value]) => `${key}=${value}`)
  .join('\n');

fs.writeFileSync(path.join(__dirname, '.env.production'), envContent);

console.log('✅ Environment file created at .env.production');
console.log('Environment variables:');
Object.entries(finalEnv).forEach(([key, value]) => {
  const masked = value ? value.substring(0, 5) + '...' : '(empty)';
  console.log(`  ${key}: ${masked}`);
});

// Run vite build
console.log('\n🔨 Building with Vite...');
try {
  execSync('vite build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
