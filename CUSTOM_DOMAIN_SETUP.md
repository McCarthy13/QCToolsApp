# Custom Domain Setup Guide

This guide covers how to connect your Precast QC Tools app to a custom domain with SSL and implement Multi-Factor Authentication (MFA).

## Table of Contents
1. [Custom Domain & SSL Setup](#custom-domain--ssl-setup)
2. [DNS Configuration](#dns-configuration)
3. [Multi-Factor Authentication (MFA)](#multi-factor-authentication-mfa)

---

## Custom Domain & SSL Setup

Firebase Hosting provides **free SSL certificates automatically** when you connect a custom domain. No need to purchase or manage certificates separately!

### Prerequisites
- A domain name (e.g., `qctools.yourcompany.com` or `yourcompany.com`)
- Access to your domain's DNS settings (through your registrar like GoDaddy, Namecheap, Cloudflare, etc.)
- Firebase CLI installed and authenticated

### Step 1: Connect Custom Domain via Firebase Console

1. **Go to Firebase Console**:
   - Visit https://console.firebase.google.com/project/precast-qc-tools-web-app/hosting

2. **Add Custom Domain**:
   - Click "Add custom domain"
   - Enter your domain name (e.g., `qctools.yourcompany.com`)
   - Click "Continue"

3. **Choose Setup Type**:
   - **Subdomain** (e.g., `qctools.yourcompany.com`): Recommended, easier to set up
   - **Apex domain** (e.g., `yourcompany.com`): Requires A records

4. **Firebase will provide DNS records** to add to your domain registrar

---

## DNS Configuration

Firebase will provide specific DNS records based on your domain type. Here's what you'll need to add:

### For Subdomain (e.g., qctools.yourcompany.com)

Add a **CNAME record**:

```
Type:  CNAME
Name:  qctools (or your subdomain)
Value: precast-qc-tools-web-app.web.app
TTL:   3600 (or automatic)
```

### For Apex/Root Domain (e.g., yourcompany.com)

Add **A records** (Firebase will provide the exact IPs):

```
Type:  A
Name:  @ (or blank for root)
Value: 151.101.1.195
TTL:   3600

Type:  A
Name:  @ (or blank for root)
Value: 151.101.65.195
TTL:   3600
```

**Note**: The actual IP addresses will be provided by Firebase in the console.

### Common DNS Providers

#### GoDaddy
1. Log in to GoDaddy
2. Go to "My Products" → "DNS"
3. Click "Add" under Records
4. Add the CNAME or A records provided by Firebase

#### Namecheap
1. Log in to Namecheap
2. Go to "Domain List" → Select your domain
3. Click "Advanced DNS"
4. Click "Add New Record"
5. Add the records provided by Firebase

#### Cloudflare
1. Log in to Cloudflare
2. Select your domain
3. Go to "DNS" tab
4. Click "Add record"
5. Add the records (disable proxy for initial setup)

### Step 2: Verify Domain Ownership

1. After adding DNS records, return to Firebase Console
2. Click "Verify" - Firebase will check your DNS settings
3. **DNS propagation can take 24-48 hours**, but often completes within minutes
4. You can check propagation status at: https://dnschecker.org

### Step 3: SSL Certificate Provisioning

Once DNS is verified:
1. Firebase automatically provisions a free SSL certificate via Let's Encrypt
2. This typically takes 15 minutes to a few hours
3. Your site will show "Pending" status during this time
4. Once complete, your site will be accessible via `https://yourdomain.com`

---

## Multi-Factor Authentication (MFA)

Firebase Authentication supports MFA out of the box. Here's how to implement it:

### Step 1: Enable MFA in Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com/project/precast-qc-tools-web-app/authentication
2. Click on "Settings" → "Sign-in method" tab
3. Scroll to "Advanced" section
4. Click "Multi-factor authentication"
5. **Enable SMS** or **TOTP (Time-based One-Time Password)**

### Step 2: Install Required Packages

```bash
# Already included in your project, but verify:
npm list firebase
# Should show firebase v10.x or higher
```

### Step 3: Update Firebase Authentication Service

I'll create the MFA implementation for you. The code will support:
- **SMS-based MFA** (requires phone number)
- **TOTP-based MFA** (Google Authenticator, Authy, etc.)

### Implementation Plan

Here's what we need to add:

#### 1. MFA Enrollment (User Setup)
```typescript
// src/services/firebaseMFA.ts
- enrollUserInMFA() - Let users enable MFA
- sendVerificationCode() - Send SMS code
- verifyEnrollment() - Complete MFA setup
```

#### 2. MFA Verification (Login)
```typescript
- signInWithMFA() - Handle MFA challenge during login
- verifyMFACode() - Verify the code user enters
```

#### 3. UI Screens
- MFA Setup Screen (in user settings)
- MFA Verification Screen (during login)
- QR Code display for TOTP apps

### Step 4: MFA Type Recommendations

**For Your Use Case (QC Tools):**

I recommend **TOTP (Time-based One-Time Password)** because:
- ✅ No SMS costs
- ✅ Works offline
- ✅ More secure than SMS
- ✅ Users can use apps like Google Authenticator, Authy, Microsoft Authenticator

**SMS MFA** is also available but:
- ❌ Costs money per SMS sent
- ❌ Requires phone signal
- ❌ Less secure (SIM swapping attacks)

---

## Implementation: Adding MFA to Your App

Would you like me to implement MFA for your app? I can add:

1. **MFA Enrollment Screen** - Users can enable MFA in their profile
2. **MFA Verification Flow** - Required during login if user has MFA enabled
3. **Admin Controls** - Admins can require MFA for all users or specific roles
4. **Backup Codes** - Generate recovery codes in case user loses their device

### Quick Implementation Checklist

- [ ] Enable MFA in Firebase Console
- [ ] Add MFA enrollment UI to Settings/Profile screen
- [ ] Add MFA verification step to login flow
- [ ] Add backup code generation
- [ ] Test MFA flow with Google Authenticator
- [ ] Update Firestore rules to track MFA status
- [ ] Add "Remember this device" option (optional)

---

## Firebase Hosting + Custom Domain Commands

### Deploy to Custom Domain

```bash
# Build the web app
npx expo export:web

# Deploy to Firebase (will deploy to all connected domains)
firebase deploy --only hosting --project precast-qc-tools-web-app
```

### Check Hosting Status

```bash
firebase hosting:channel:list --project precast-qc-tools-web-app
```

### View Live Domains

After setup, your app will be accessible at:
- `https://precast-qc-tools-web-app.web.app` (Firebase default)
- `https://precast-qc-tools-web-app.firebaseapp.com` (Firebase alternate)
- `https://yourdomain.com` (Your custom domain with free SSL)

---

## Costs

### Domain & SSL
- **Domain registration**: $10-15/year (varies by registrar)
- **SSL Certificate**: **FREE** (automatically provided by Firebase)
- **Firebase Hosting**: **FREE** (within generous limits)

### MFA Costs
- **TOTP (Google Authenticator)**: **FREE**
- **SMS MFA**: ~$0.01-0.05 per SMS sent (charged by Firebase)

---

## Security Best Practices

1. **Always use HTTPS** - Firebase enforces this automatically
2. **Enable MFA for admin accounts** - Protect privileged access
3. **Use TOTP over SMS** - More secure and free
4. **Generate backup codes** - In case users lose their MFA device
5. **Monitor auth logs** - Firebase Console shows all authentication events
6. **Set up security rules** - Your Firestore rules are already configured

---

## Troubleshooting

### Domain not verifying
- Check DNS propagation: https://dnschecker.org
- Wait up to 48 hours for DNS to propagate
- Ensure no conflicting DNS records exist
- Try using Cloudflare's DNS for faster propagation

### SSL certificate pending
- This is normal, can take up to 24 hours
- Ensure DNS is fully propagated first
- Check Firebase Console for specific errors
- Verify you don't have conflicting SSL certs

### MFA issues
- Clear browser cache and cookies
- Ensure system clock is accurate (TOTP requires synced time)
- Check Firebase Console → Authentication → Logs for errors
- Verify phone number format for SMS MFA (+1234567890)

---

## Next Steps

Would you like me to:
1. ✅ Implement MFA enrollment and verification flows?
2. ✅ Add admin settings to require MFA for all users?
3. ✅ Create backup code generation system?
4. ✅ Add "Trusted Devices" feature to reduce MFA prompts?

Let me know which features you'd like to add, and I'll implement them for you!
