# Camber Calculator - Deployment Guide

## 🔐 Authentication

The app now has password protection for company-only access.

**Default Access Code:** `camber2025`

To change the password, edit `/src/screens/LoginScreen.tsx`:
```typescript
const COMPANY_ACCESS_CODE = 'camber2025'; // Change this
```

---

## 📱 Deployment Options

### **Option 1: Web Deployment (Recommended for Desktop Users)** 🌐

Deploy the web version to a free hosting service:

#### **A. Deploy to Vercel (Easiest)**

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Build for web:**
   ```bash
   cd /home/user/workspace
   npx expo export:web
   ```

3. **Deploy:**
   ```bash
   vercel --prod
   ```

4. **Result:** You'll get a URL like `https://camber-calculator.vercel.app`
   - Share this URL with employees
   - They access it in any browser
   - Enter company access code to login

#### **B. Deploy to Netlify**

1. **Build for web:**
   ```bash
   npx expo export:web
   ```

2. **Deploy the `dist/` folder:**
   - Go to https://app.netlify.com/drop
   - Drag and drop the `dist` folder
   - Get your URL

---

### **Option 2: Mobile Apps (iOS + Android)**

#### **A. Free Option: Expo Go**

**For Employees:**
1. Install **Expo Go** app from App Store or Play Store
2. You'll need to publish the app to Expo:
   ```bash
   npx expo login
   npx expo publish
   ```
3. Share the Expo URL with employees
4. They open it in Expo Go
5. Enter company access code

**Pros:** Free, works immediately
**Cons:** Requires Expo Go app, less professional

#### **B. Standalone Apps (Professional)**

**Requirements:**
- Apple Developer Account: $99/year (iOS)
- Google Play Developer Account: $25 one-time (Android)

**Steps:**

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   eas login
   ```

2. **Configure project:**
   ```bash
   eas build:configure
   ```

3. **Build iOS (TestFlight):**
   ```bash
   eas build --platform ios --profile production
   ```

4. **Build Android (Internal Testing):**
   ```bash
   eas build --platform android --profile production
   ```

5. **Submit to stores:**
   - **iOS:** Upload to TestFlight for internal testing
   - **Android:** Upload to Google Play Internal Testing track

---

## 🎯 Recommended Deployment Strategy

### **For Your Company:**

**Best Approach: Web + Mobile Apps**

1. **Web Version (for desktop/laptop users):**
   - Deploy to Vercel (takes 5 minutes, free)
   - URL: `https://camber-calculator.yourcompany.com`
   - Works in any browser
   - No installation needed

2. **Mobile Apps (for field workers):**
   - Build standalone iOS app → TestFlight
   - Build standalone Android app → Google Play Internal Testing
   - Employees install like normal apps
   - Professional experience

**Total Cost:** $124 first year, $99/year after

---

## 🔧 Customization

### **Change Company Name**

Edit `/src/screens/LoginScreen.tsx`:
```typescript
<Text className="text-blue-100 text-base mb-12 text-center">
  Your Company Name  // Change this
</Text>
```

### **Change App Name**

Edit `/app.json`:
```json
{
  "expo": {
    "name": "Your Company - Camber Calculator",
    "slug": "your-company-camber-calc"
  }
}
```

### **Change Bundle Identifier**

Edit `/app.json`:
```json
{
  "ios": {
    "bundleIdentifier": "com.yourcompany.cambercalculator"
  },
  "android": {
    "package": "com.yourcompany.cambercalculator"
  }
}
```

---

## 📊 Current Features

✅ **iOS Support** - Works on iPhone & iPad
✅ **Android Support** - Works on all Android devices
✅ **Web Support** - Works in any browser (Chrome, Safari, Firefox, Edge)
✅ **Password Protection** - Company access code required
✅ **Offline Support** - Calculations work without internet
✅ **Data Persistence** - Strand patterns and history saved locally
✅ **Fractional Display** - Shows inches with fractions (e.g., 11/16")
✅ **Export/Import** - Share strand patterns between devices

---

## 🚀 Quick Start (Web Deployment)

**Deploy to web in 2 minutes:**

```bash
# 1. Export for web
npx expo export:web

# 2. Install Vercel (if not already)
npm install -g vercel

# 3. Deploy
vercel --prod

# Done! You'll get a URL to share
```

---

## 📞 Support

For deployment help:
- Vercel docs: https://vercel.com/docs
- Expo docs: https://docs.expo.dev
- EAS Build: https://docs.expo.dev/build/introduction/

---

## 🔒 Security Notes

- The access code is stored in the app code
- For better security, consider implementing:
  - Individual user accounts
  - Backend authentication (Firebase Auth, etc.)
  - Email-based login
- Current implementation is suitable for trusted internal use

---

## 📝 Next Steps

1. **Test the login screen** (password: `camber2025`)
2. **Choose deployment method** (web, mobile, or both)
3. **Customize branding** (company name, colors)
4. **Deploy and share** with employees
5. **Collect feedback** and iterate

Enjoy your company-exclusive Camber Calculator! 🎉
