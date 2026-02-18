# 🔐 Security Policy

## Responsible Disclosure

If you discover a security vulnerability, please email `security@example.com` instead of opening a public issue.

---

## ⚠️ DO NOT SHARE IN PUBLIC REPOSITORIES

The following should **NEVER** be committed to git or shared publicly:

### 1. Super Admin Access Tokens
```javascript
// ❌ NEVER DO THIS IN PUBLIC CODE
const ADMIN_TOKEN = 'dukaAdmin'; // EXPOSED!
const adminLink = `http://localhost:3000/?admin=${ADMIN_TOKEN}`;
```

### 2. API Keys & Secrets
```
VITE_SUPABASE_KEY=your_public_key (⚠️ Public key only in frontend)
MPESA_CONSUMER_SECRET=xxxxxx (❌ PRIVATE - backend only)
INTASEND_SECRET=xxxxxx (❌ PRIVATE - backend only)
```

### 3. Database Credentials
```
DATABASE_URL=postgresql://user:password@host (❌ NEVER IN CODE)
```

### 4. Authentication Tokens
```
JWT_SECRET=your_secret (❌ BACKEND ONLY)
ADMIN_JWT=admin_token (❌ BACKEND ONLY)
```

---

## ✅ SECURE SUPER ADMIN ACCESS

### Current Implementation (VULNERABLE)
```javascript
// INSECURE: querystring-based access
if (queryParams.admin === 'dukaAdmin') {
  // Show admin dashboard
}
```

### Recommended Implementation (SECURE)
```javascript
// SECURE: JWT-based with expiration
const superAdminRoute = '/admin/dashboard';

// Backend protection
app.get(superAdminRoute, (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token || !verifyAdminJWT(token)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Check token expiration (15 min)
  if (isTokenExpired(token)) {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  // Audit log the access
  logAdminAccess(req.user.id, 'SUPER_ADMIN_LOGIN');
  
  res.json({ dashboard: 'content' });
});
```

### Environment Variable Setup
```bash
# .env.local (NEVER COMMIT)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_KEY=eyxxx (public key only)
ADMIN_JWT_SECRET=your_very_long_random_secret_with_symbols_123!@#
ADMIN_TOKEN_EXPIRY=900 (15 minutes in seconds)
```

### .gitignore Requirements
```
# Secrets (CRITICAL)
.env
.env.local
.env.*.local
*.secret
admin-credentials.json

# Sensitive docs
ADMIN_MANUAL_PAYMENTS.md
SUPER_ADMIN_ACCESS.md
admin-setup-guide.md

# Build artifacts
dist/
node_modules/
.cache/
```

---

## 🔒 Authentication Best Practices

### 1. Multi-Factor Authentication (MFA)
```javascript
// Implement for super admin
- Password (hashed with Argon2)
- Time-based OTP (TOTP)
- IP whitelist
- Device fingerprint
```

### 2. Audit Logging
```javascript
// Log all admin actions
{
  adminId: 'uuid',
  action: 'SUBSCRIPTION_UPDATED',
  resourceId: 'store_id',
  previousValue: {...},
  newValue: {...},
  timestamp: '2026-02-19T10:30:00Z',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...'
}
```

### 3. Rate Limiting
```javascript
// Limit admin login attempts
- Max 5 failed attempts per 15 minutes
- Lock admin account temporarily
- Alert on unusual access patterns
```

### 4. Session Management
```javascript
// Session timeout
- 15 minutes of inactivity → automatic logout
- Revoke all sessions on password change
- Prevent concurrent sessions from different IPs
```

---

## 🛡️ Data Protection

### Sensitive Data Fields
```javascript
// These should be ENCRYPTED at rest
- pin_hash (store owner PINs)
- password_hash (user passwords)
- payment_tokens (M-Pesa/Intasend tokens)
- store_access_codes (in transit)

// Encryption library: libsodium or TweetNaCl
const encrypted = nacl.secretbox(dataBytes, nonceBytes, keyBytes);
```

### PII Handling
```javascript
// Personally Identifiable Information
- Phone numbers (masked in logs)
- Names (access controlled)
- Email addresses (never in error messages)
- Transaction details (access per-store only)
```

### Payment Data
```javascript
// Payment Card Industry Data Security Standard (PCI-DSS)
- Never store full card numbers
- Use tokenization (M-Pesa/Intasend handles this)
- Never log payment tokens
- Encrypt M-Pesa secrets in environment
```

---

## 📋 Security Checklist

Before deploying to production:

- [ ] No secrets in `.git` history (`git-secrets` installed)
- [ ] All environment variables externalized
- [ ] Super admin JWT token implemented (not query params)
- [ ] Admin actions audit-logged
- [ ] Rate limiting enabled
- [ ] HTTPS enforced everywhere
- [ ] CORS properly configured
- [ ] SQL injection tests passed
- [ ] XSS protection headers set
- [ ] CSRF tokens on state-changing operations
- [ ] Session timeouts configured
- [ ] Database IP whitelist configured
- [ ] Backups encrypted
- [ ] Incident response plan documented

---

## 🔍 Regular Security Reviews

### Quarterly
- [ ] Audit admin access logs for anomalies
- [ ] Review dependency vulnerabilities (`npm audit`)
- [ ] Rotate API keys and secrets
- [ ] Test backup/restore procedures
- [ ] Review RLS policies effectiveness

### Monthly
- [ ] Check failed login attempts
- [ ] Update security patches immediately
- [ ] Review Supabase audit logs
- [ ] Test disaster recovery plan

### Weekly
- [ ] Monitor error logs for suspicious patterns
- [ ] Check Supabase for unauthorized modifications
- [ ] Verify backup completion

---

## 🚨 If Compromised

1. **Immediately** revoke all admin tokens
2. **Change** all secrets and API keys
3. **Audit** recent admin actions in logs
4. **Notify** affected users
5. **Review** git history for exposed secrets
6. **Force** password resets for all admins
7. **Document** the incident for compliance

---

## 📚 References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Supabase Security Best Practices](https://supabase.com/docs/learn/auth-deep-dive/auth-security)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html#SQL-EXPRESSIONS)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)

---

**Last Updated**: February 2026  
**Maintainer**: Security Team
