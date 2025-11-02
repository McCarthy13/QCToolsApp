# Microsoft Graph API Integration Setup

This document provides step-by-step instructions for setting up Microsoft Graph API integration to enable in-app email sending.

## 🎯 What This Enables

- **Send emails directly from the app** using the user's Microsoft 365 account
- **Emails appear in user's Outlook Sent folder** automatically
- **Replies go directly to user's inbox**
- **FROM address is always the user's registered work email**
- **No cost** - Microsoft Graph API is free with Microsoft 365

---

## 📋 Prerequisites

- Microsoft 365 Business or Enterprise subscription
- Azure AD admin access
- Access to Azure Portal (portal.azure.com)

---

## 🔧 Step-by-Step Setup

### Step 1: Register App in Azure AD

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory**
3. Click **App registrations** in the left sidebar
4. Click **+ New registration**
5. Fill in the details:
   - **Name**: `Precast Quality Tools` (or your app name)
   - **Supported account types**: Select "Accounts in this organizational directory only" (single tenant)
   - **Redirect URI**: 
     - Platform: **Public client/native (mobile & desktop)**
     - URI: `exp://localhost:8081/--/redirect` (for development)
     - Note: For production, use your actual app scheme
6. Click **Register**

### Step 2: Note Your Application (Client) ID

1. After registration, you'll see the **Overview** page
2. Copy the **Application (client) ID**
3. Copy the **Directory (tenant) ID**
4. Save these values - you'll need them later

### Step 3: Configure API Permissions

1. In your app registration, click **API permissions** in the left sidebar
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Select **Delegated permissions**
5. Search for and add these permissions:
   - ✅ **Mail.Send** - Allows the app to send emails as the user
   - ✅ **User.Read** - Allows the app to read basic user profile info
6. Click **Add permissions**
7. **IMPORTANT**: Click **Grant admin consent for [Your Organization]**
   - This allows users to use the app without individual consent
   - Requires admin privileges

### Step 4: Configure Authentication

1. Click **Authentication** in the left sidebar
2. Under **Platform configurations**, verify the redirect URI is set
3. Under **Advanced settings**:
   - Enable **Allow public client flows**: **Yes**
4. Click **Save**

### Step 5: Add Configuration to App

1. Open your project's `.env` file (create if it doesn't exist)
2. Add the following variables:

```env
# Microsoft Graph API Configuration
EXPO_PUBLIC_AZURE_AD_CLIENT_ID=your-application-client-id-here
EXPO_PUBLIC_AZURE_AD_TENANT_ID=your-directory-tenant-id-here
```

3. Replace the values with:
   - `EXPO_PUBLIC_AZURE_AD_CLIENT_ID`: The Application (client) ID from Step 2
   - `EXPO_PUBLIC_AZURE_AD_TENANT_ID`: The Directory (tenant) ID from Step 2

4. Save the file

### Step 6: Test the Integration

1. Restart your app
2. Navigate to a Slippage Summary screen
3. Tap **"Generate Email Report"**
4. The app will open the in-app email composer
5. On first use, users will see a Microsoft login screen
6. After authentication, they can send emails that will appear in their Sent folder

---

## 🔒 Security Notes

### What Permissions Does the App Have?

- **Mail.Send**: Can send emails on behalf of the user
- **User.Read**: Can read basic user profile (name, email)

### What the App CANNOT Do:

- ❌ Read user's inbox or existing emails
- ❌ Delete emails
- ❌ Access calendar or contacts
- ❌ Modify user settings
- ❌ Access other Microsoft 365 services

### Token Security:

- Access tokens are stored securely in AsyncStorage
- Tokens expire after 1 hour
- Users must re-authenticate after expiration
- Tokens are device-specific and cannot be transferred

### User Consent:

- Users see exactly what permissions they're granting
- Users can revoke access at any time through their Microsoft account settings
- Admin consent simplifies the user experience

---

## 🧪 Testing Checklist

- [ ] App registered in Azure AD
- [ ] Client ID and Tenant ID added to `.env`
- [ ] API permissions configured (Mail.Send, User.Read)
- [ ] Admin consent granted
- [ ] App restarted after configuration
- [ ] User can log in with Microsoft account
- [ ] Email sends successfully
- [ ] Email appears in Outlook Sent folder
- [ ] Replies come to user's inbox

---

## 🐛 Troubleshooting

### "Authentication Required" Error
- **Cause**: User needs to sign in
- **Solution**: Ensure Azure AD app is properly configured and user completes Microsoft login

### "Invalid Client" Error
- **Cause**: Client ID is incorrect or not found
- **Solution**: Double-check `EXPO_PUBLIC_AZURE_AD_CLIENT_ID` in `.env` file matches Azure AD

### "Insufficient Privileges" Error
- **Cause**: Admin consent not granted or permissions not configured
- **Solution**: Go to Azure AD → Your App → API Permissions → Grant admin consent

### Email Doesn't Appear in Sent Folder
- **Cause**: `saveToSentItems: true` is not set (should be automatic)
- **Solution**: Check the microsoft-graph.ts file ensures this parameter is set

### "Redirect URI Mismatch" Error
- **Cause**: The redirect URI in code doesn't match Azure AD configuration
- **Solution**: Ensure redirect URI in Azure AD matches the one used by expo-auth-session

---

## 📞 Support

If you encounter issues:

1. **Check Azure AD Logs**: Azure Portal → Azure AD → Sign-ins (shows authentication attempts)
2. **Check App Logs**: Look for console errors in the app
3. **Verify Permissions**: Ensure all required permissions are granted
4. **Test with Different User**: Try with another Microsoft 365 user to rule out user-specific issues

---

## 🚀 Production Deployment Notes

### Before deploying to production:

1. **Update Redirect URI**:
   - Development: `exp://localhost:8081/--/redirect`
   - Production: `your-app-scheme://redirect` (use your actual app scheme)

2. **Add Production Redirect URI** to Azure AD:
   - Go to your app registration → Authentication
   - Add the production redirect URI alongside the development one

3. **Consider Multi-Tenant** (Optional):
   - If users from different organizations will use the app
   - Change "Supported account types" to "Accounts in any organizational directory"
   - Update `EXPO_PUBLIC_AZURE_AD_TENANT_ID` to `"common"`

4. **Review Security**:
   - Ensure tokens are stored securely
   - Consider implementing token refresh logic for long-lived sessions
   - Monitor API usage through Azure Portal

---

##✅ Benefits of This Approach

✅ **Free** - No cost with Microsoft 365  
✅ **Secure** - OAuth 2.0 industry standard  
✅ **Seamless** - Appears in user's Sent folder  
✅ **Professional** - Always sends from work email  
✅ **Auditable** - All actions logged in Azure AD  
✅ **User-Friendly** - No manual account switching required  

---

**Setup Time**: ~15-20 minutes  
**Cost**: $0 (with existing Microsoft 365 subscription)  
**Security Risk**: Low (scoped permissions, OAuth 2.0)
