#!/usr/bin/env node
/**
 * Apply DB migration using Supabase service role key
 * Usage: node scripts/apply-migration.js
 */

const https = require('https');
const path = require('path');
const fs = require('fs');

// Read from environment or .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://udekwokdxxscahdqranv.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_DB_PASSWORD;

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_DB_PASSWORD not found in .env.local');
  console.error('   Please add your Supabase service role key to .env.local:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, '..', 'migrations', '001_add_inventory_fields.sql');
if (!fs.existsSync(migrationPath)) {
  console.error('❌ Migration file not found:', migrationPath);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');
console.log('📋 SQL to execute:');
console.log(sql);
console.log('\n🚀 Connecting to Supabase and running migration...\n');

// Using Supabase's direct HTTP endpoint is not straightforward for arbitrary SQL.
// Instead, recommend using Supabase CLI or psql.
// This script documents the approach but requires the pooler password.

console.warn('⚠️  To apply this migration automatically, you need one of:');
console.warn('   A) Your Supabase Postgres password (for psql)');
console.warn('   B) Access to the dashboard SQL editor (manual apply)');
console.warn('   C) SUPABASE_SERVICE_ROLE_KEY in .env.local (for API-based execution)\n');

console.log('For now, manually apply via:');
console.log('   1. Go to: https://app.supabase.com/project/udekwokdxxscahdqranv/sql');
console.log('   2. Create a new query and paste the migration SQL');
console.log('   3. Click Run\n');
