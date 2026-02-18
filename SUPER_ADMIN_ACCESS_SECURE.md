# 🔐 Super Admin Access

**⚠️ INTERNAL DOCUMENTATION ONLY - DO NOT SHARE PUBLICLY**

This document is for authorized deployment team members only. Super admin credentials must be stored securely in environment variables, never in code.

---

## 🚨 SECURITY WARNING

**DO NOT:**
- ❌ Commit this token to git
- ❌ Share the admin link publicly  
- ❌ Use simple query parameters in production
- ❌ Store credentials in code

**DO:**
- ✅ Use environment variables only
- ✅ Rotate tokens regularly
- ✅ Implement JWT-based authentication
- ✅ Enable MFA for super admin
- ✅ Audit all admin actions

---

## Setup (Environment-Based Only)

### Step 1: Generate Secure Admin Token
```bash
# Generate cryptographically secure token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Output: a3f4b8c2d9e1f6a7c8b9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
```

### Step 2: Store in Environment Variables
```bash
# .env.local (NEVER COMMIT)
VITE_SUPER_ADMIN_TOKEN=your_generated_token_here
ADMIN_JWT_SECRET=your_jwt_secret_here
ADMIN_TOKEN_EXPIRY=900
```

### Step 3: Update .gitignore
```
.env
.env.local
.env.*.local
admin-credentials.json
```

### Step 4: Access Admin Dashboard
```bash
npm run dev
# Admin link retrieves token from environment variables
# Never hardcoded in code
```

---

## Available Features

- 📊 Manage subscription plans
- 💳 View store subscriptions
- 🔧 Configure payment methods
- 📈 Payment history monitoring
- ⚙️ Billing settings management
- 📋 Audit logging
- 📱 SMS configuration
- 🎁 Promotional offers

---

## Production Deployment

⚠️ **DO NOT** use simple tokens in production.

Implement:
1. JWT-based auth (15-min expiry)
2. Multi-factor authentication
3. IP whitelist
4. Comprehensive audit logging

See [SECURITY.md](SECURITY.md) for details.

---

**Last Review**: February 2026  
**Status**: INTERNAL - KEEP CONFIDENTIAL
