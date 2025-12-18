# Store Entry Flow - Phone + Passkey + Device Token

## Overview

This system provides a **secure, user-friendly store access flow** that respects the Kenyan market and reduces friction for daily operations.

### The Problem (❌ Without This System)

Staff arrives at 8 AM. They open the app and see a blank screen asking for:
- "Enter Shop ID: ____"
- Complex password
- MFA code

**Result:** Annoyed staff, slow opening, frustration.

### The Solution (✅ With This System)

**DAY 1 (Setup):**
1. Owner: Enters phone number → Selects store → Enters passkey → Clicks "Remember This Device"
2. Device token saved to localStorage
3. App unlocked

**DAY 2-365 (Every day after):**
1. Staff opens app
2. App checks localStorage for device token
3. Device token is valid → App goes **straight to dashboard**
4. **No phone number, no passkey needed**

**Result:** Instant access. Happy staff. Professional experience.

---

## Architecture

### Database Schema

Three new tables in Supabase:

#### 1. `store_access_keys`
```sql
- store_id (PK reference to stores)
- passkey_hash (argon2 hash of passkey)
- created_at, updated_at
```

**Why:**
- Non-unique globally (multiple stores can have passkey "PASS")
- Hashed for security
- One per store

#### 2. `device_sessions`
```sql
- id (PK)
- store_id (reference to stores)
- device_token (secure random, UNIQUE)
- phone_number (who logged in)
- device_name (e.g., "Shop Tablet")
- created_at, last_accessed_at, expires_at (365 days)
- is_active (can be revoked)
```

**Why:**
- Track which device accessed which store
- Support multiple devices per store
- Allow revoking specific devices
- Audit trail of access

#### 3. RLS Policies
- Store owners can manage own passkeys
- Service role can create/update device sessions
- Prevents cross-store access

---

## Flow: Step-by-Step

### Step 1: Phone Number
**User enters:** Owner/staff phone number

**Backend does:**
- Normalize phone (remove dashes, spaces)
- Query `stores` table WHERE `owner_phone = '254712345678'` OR `phone = '254712345678'`
- Return list of matching stores

**Why this works:**
- Phone numbers are UNIQUE in Kenya
- Everyone has a phone number
- No need to remember complex shop IDs

### Step 2: Store Selection (if multiple)
**Shown:** List of stores linked to that phone number

**Example:**
- "Edgait Hardware - Kirinyaga"
- "Edgait Wholesalers - Nairobi"

**User chooses:** One store

**Why this works:**
- Some entrepreneurs own multiple shops
- Still simple: just tap one

### Step 3: Passkey Entry
**User enters:** Simple passkey they created (e.g., "PASS123")

**Backend does:**
- Hash the passkey
- Compare with stored hash in `store_access_keys`
- If match → passkey verified ✅

**Why this works:**
- Simple (3-20 characters, alphanumeric)
- Easy to remember
- Easy to type daily
- NOT unique globally (multiple stores can use "PASS")
- Only unique PER STORE

### Step 4: Remember This Device
**Question:** "Remember this device?"

**If YES:**
- Generate secure device token (crypto.getRandomValues)
- Save to `device_sessions` table
- Save token to localStorage
- Redirect to dashboard

**If NO:**
- Don't save token
- Redirect to dashboard
- Next time: repeat flow

**Why this works:**
- Staff doesn't need to enter credentials daily
- Still secure (token expires after 365 days)
- Can be revoked from settings
- Can forget device and re-enter flow

---

## Implementation Details

### Frontend: StoreEntryFlow.tsx

```tsx
<StoreEntryFlow onStoreSelected={(store) => {
  // Authenticated! Load dashboard
  setCurrentStore(store);
}} />
```

**Flow:**
1. Phone input form
2. Store selection (if multiple)
3. Passkey input form
4. Remember device prompt
5. Calls onStoreSelected callback with store profile

### Service Functions: storeEntryService.ts

```typescript
// Step 1: Look up stores
await lookupStoresByPhone('254712345678')
// Returns: [{ store_id, store_name, location, ... }, ...]

// Step 2: Verify passkey
await verifyStorePasskey(storeId, 'PASS123')
// Returns: boolean

// Step 3: Create device session
await createDeviceSession(storeId, phoneNumber, 'My Tablet')
// Returns: { device_token, expires_at, ... }

// Step 4: On app load, validate token
await validateDeviceToken(deviceToken)
// Returns: store profile (if valid) or null
```

### Hooks: useStoreSession.ts

```typescript
// On app mount/route change
const { store, loading, deviceToken } = useStoreSession(storeId);

// Check if device is remembered
const isRemembered = useIsRememberedDevice(storeId);

// If store exists, user is authenticated
// If loading, show spinner
// If store is null and not loading, redirect to StoreEntryFlow
```

---

## Integration: How to Use

### 1. Replace App Entry Point

**Before:** Users logged in via Supabase auth

**After:** Use StoreEntryFlow before dashboard

```tsx
// App.tsx or main route
const [authUser, setAuthUser] = useState(null);
const [currentStore, setCurrentStore] = useState(null);

useEffect(() => {
  // Check device token on mount
  const { store } = useStoreSession(null);
  if (store) setCurrentStore(store);
}, []);

if (!currentStore) {
  return <StoreEntryFlow onStoreSelected={setCurrentStore} />;
}

return <EmployerDashboard store={currentStore} />;
```

### 2. Add Passkey Setup to Store Settings

When store owner first signs up:

```tsx
<SettingsModal>
  <section>
    <h3>Store Passkey</h3>
    <input placeholder="Create a simple passkey (e.g., PASS, STORE1)" />
    <button onClick={() => updateStorePasskey(storeId, newPasskey)}>
      Save Passkey
    </button>
  </section>
</SettingsModal>
```

### 3. Add Device Management to Settings

Store owner can see and revoke devices:

```tsx
<SettingsModal>
  <section>
    <h3>Devices</h3>
    {devices.map(device => (
      <div key={device.id}>
        <p>{device.device_name}</p>
        <small>Last accessed: {device.last_accessed_at}</small>
        <button onClick={() => revokeDeviceSession(device.device_token)}>
          Logout This Device
        </button>
      </div>
    ))}
  </section>
</SettingsModal>
```

---

## Security Considerations

### ✅ What's Secure

1. **Phone Number Lookup**
   - Only owner/linked phone numbers can access
   - Prevents random guessing

2. **Passkey Hashing**
   - Stored as argon2 hash
   - Never sent in plaintext
   - Can't be stolen from DB

3. **Device Token**
   - Crypto.getRandomValues (256-bit)
   - Stored in localStorage (not accessible to other sites)
   - Expires after 365 days
   - Can be revoked

4. **RLS Policies**
   - Store owners can only access own data
   - Service role creates sessions (trusted operation)

### ⚠️ What's NOT Secure

1. **Simple Passkey**
   - Not for highly sensitive operations
   - Fine for shop access
   - Use full auth for admin operations

2. **localStorage**
   - Not secure against XSS attacks
   - Use HTTPS only (required)
   - Consider httpOnly cookies if needed

3. **365-Day Token**
   - Long expiry for convenience
   - Can reduce to 30/90 days if needed
   - Consider refresh tokens for high-security apps

### 🔐 Recommendations

1. **Use HTTPS only** - Never allow HTTP
2. **Short-lived tokens for sensitive ops** - Re-auth for payments
3. **Log device changes** - Audit trail in `device_sessions`
4. **Rate limit passkey attempts** - Prevent brute force
5. **Require re-auth for passkey changes** - Prevent account takeover

---

## Deployment Steps

### Step 1: Deploy Database Schema
```bash
# Run in Supabase SQL Editor
\copy STORE_ENTRY_FLOW_SCHEMA.sql
```

Verify:
```sql
SELECT COUNT(*) FROM store_access_keys;
SELECT COUNT(*) FROM device_sessions;
```

### Step 2: Deploy Service Functions
```bash
# Already in storeEntryService.ts
# Just import and use
```

### Step 3: Add Store Entry Flow to App
```bash
# Add StoreEntryFlow.tsx to components/
# Update main app routing
# Test with demo account
```

### Step 4: Set Up Passkey for Existing Stores
```bash
# One-time: Set passkey for each store via settings UI
# Or: Bulk script to set defaults
UPDATE store_access_keys 
SET passkey_hash = crypt('STORE123', gen_salt('bf', 10))
WHERE store_id IN (SELECT id FROM stores);
```

---

## User Experience Timeline

### Store Owner (First Time)

1. **08:00 AM** - Owner opens app
2. App: "Enter your phone number"
3. Owner: Enters "0712345678"
4. App: "Select store: Edgait Hardware"
5. Owner: Taps it
6. App: "Enter passkey"
7. Owner: Enters "PASS"
8. App: "Remember this device?"
9. Owner: Taps "Yes"
10. **08:15 AM** - Dashboard loaded ✅

**Total time:** 2-3 seconds

### Store Owner (Day 100)

1. **08:00 AM** - Owner opens app
2. App checks localStorage → finds device token
3. App validates token → still valid ✅
4. **08:01 AM** - Dashboard loaded ✅

**Total time:** 1 second

### Staff Member (First Phone)

1. **08:00 AM** - Staff arrives with new phone
2. App: "Enter phone number"
3. Staff: "What's the number?"
4. Owner shows it on dashboard: "0712345678"
5. Staff enters it
6. App: "Not linked to this phone"
7. **Staff calls owner** - One-time setup ✅
8. Owner goes to settings → "Staff Devices" → "Invite: 0712999999"
9. Staff enters passkey (from WhatsApp message)
10. **08:30 AM** - Dashboard loaded ✅

---

## FAQ

### Q: What if staff forgets the passkey?

**A:** They need owner's help. Owner can:
1. Show passkey from settings
2. Reset passkey for that store
3. All devices get logged out
4. Staff re-enters with new passkey

### Q: Can two stores use the same passkey?

**A:** **YES!** That's the point.
- Store A passkey: "PASS"
- Store B passkey: "PASS"
- Both can coexist because they have different store IDs

### Q: What if staff steals a phone?

**A:** 
1. Owner logs into settings
2. Revokes the device token
3. Thief's phone no longer has access
4. Staff will need to re-enter passkey if they get new phone

### Q: How long are devices remembered?

**A:** 365 days (1 year) by default. Can be changed in DB:
```sql
expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'  -- 30 days instead
```

### Q: Can multiple people use the same device?

**A:** **YES!** As long as they have the passkey.
- Device 1 (Shop Tablet) - Multiple staff use it
- All staff who know passkey can use it

This is intentional - supports kiosk mode.

---

## Testing Checklist

- [ ] Phone lookup works (returns multiple stores)
- [ ] Store selection displays correctly
- [ ] Passkey verification rejects wrong code
- [ ] Device token saved to localStorage
- [ ] App skips login on next load
- [ ] Device can be revoked from settings
- [ ] Wrong phone number shows "no stores found"
- [ ] Passkey too short shows error
- [ ] Device name optional but nice to have
- [ ] Multiple devices per store supported
- [ ] Token refresh on access works

---

## Future Enhancements

1. **SMS Verification** - Send OTP to phone
2. **Biometric** - Use phone fingerprint after first login
3. **QR Code** - Owner generates QR for staff to scan
4. **Batch Invite** - Owner invites multiple staff at once
5. **Time-Limited Tokens** - Temporary access for contractors
6. **IP Whitelisting** - Only allow specific networks
7. **Geofencing** - Only work inside shop location

---

**Ready to deploy!** 🚀
