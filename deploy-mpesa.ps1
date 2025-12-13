# M-Pesa Edge Functions Deployment Script for DukaBook
# Run this script after setting up Supabase CLI

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectRef
)

Write-Host "🚀 DukaBook M-Pesa Deployment Script" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
$supabaseCheck = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCheck) {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

Write-Host "📦 Project Reference: $ProjectRef" -ForegroundColor Yellow
Write-Host ""

# Link the project
Write-Host "🔗 Linking Supabase project..." -ForegroundColor Blue
supabase link --project-ref $ProjectRef

Write-Host ""
Write-Host "🔐 Setting M-Pesa secrets..." -ForegroundColor Blue

# Set secrets
supabase secrets set MPESA_CONSUMER_KEY="GjifS76PwaV5YE3B2oSdRucAdS8MqUxvRF0Ehv4QL3pK7jc0"
supabase secrets set MPESA_CONSUMER_SECRET="uUCpeQ834QpQ8erDUif2AZfUVXL4wQXnudxIfCPahjlm3MhAzDaKijnVuQNJqTax"
supabase secrets set MPESA_PASSKEY="bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919"
supabase secrets set MPESA_SHORTCODE="400200"
supabase secrets set MPESA_CALLBACK_URL="https://$ProjectRef.supabase.co/functions/v1/mpesa-callback"

Write-Host "✅ Secrets set successfully" -ForegroundColor Green
Write-Host ""

Write-Host "📤 Deploying Edge Functions..." -ForegroundColor Blue

# Deploy all edge functions
$functions = @(
    "mpesa-stk-push",
    "mpesa-callback", 
    "mpesa-query",
    "mpesa-c2b-validate",
    "mpesa-c2b-confirm",
    "mpesa-register-urls"
)

foreach ($func in $functions) {
    Write-Host "  Deploying $func..." -ForegroundColor Gray
    supabase functions deploy $func --no-verify-jwt
}

Write-Host "✅ All Edge Functions deployed" -ForegroundColor Green
Write-Host ""

Write-Host "📊 Registering C2B URLs with Safaricom..." -ForegroundColor Blue
$registerUrl = "https://$ProjectRef.supabase.co/functions/v1/mpesa-register-urls"
try {
    $response = Invoke-RestMethod -Uri $registerUrl -Method POST -ContentType "application/json"
    if ($response.success) {
        Write-Host "✅ C2B URLs registered successfully!" -ForegroundColor Green
        Write-Host "   Confirmation URL: $($response.confirmationUrl)" -ForegroundColor Gray
        Write-Host "   Validation URL: $($response.validationUrl)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ C2B URL registration response: $($response | ConvertTo-Json)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Could not register C2B URLs automatically. You may need to do this manually." -ForegroundColor Yellow
    Write-Host "   Run: curl -X POST $registerUrl" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Run the SQL migrations in Supabase SQL Editor:" -ForegroundColor White
Write-Host "   - supabase/migrations/20241211_mpesa_payments.sql" -ForegroundColor Gray
Write-Host "   - supabase/migrations/20241211_mpesa_c2b.sql" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test STK Push payment:" -ForegroundColor White
Write-Host "   curl -X POST https://$ProjectRef.supabase.co/functions/v1/mpesa-stk-push \" -ForegroundColor Gray
Write-Host "     -H 'Content-Type: application/json' \" -ForegroundColor Gray  
Write-Host "     -d '{\"phone\":\"254712345678\",\"amount\":1,\"storeId\":\"test\",\"planId\":\"test\"}'" -ForegroundColor Gray
Write-Host ""
Write-Host "Your M-Pesa callback URL:" -ForegroundColor White
Write-Host "https://$ProjectRef.supabase.co/functions/v1/mpesa-callback" -ForegroundColor Cyan
Write-Host ""
