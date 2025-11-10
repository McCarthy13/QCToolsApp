# Precast Quality Tools

A comprehensive mobile app for precast concrete quality management, built with React Native and Expo.

## Deployment Status

✅ **Web App Deployed** - Live at https://precast-qc-tools-web-app.web.app
✅ **Firebase Authentication** - Fully integrated with email/password sign-in
✅ **Firestore Database** - Ready for real-time data sync
✅ **Cloud Storage** - Ready for file uploads
✅ **Cloud Functions** - OpenAI Vision API proxy deployed with updated API key
✅ **Product Tag Scanner** - Working in deployed web app with native camera
✅ **Admin Approval System** - Working and tested
✅ **Data Import Tool** - Import existing data from JSON to Firebase

### Recent Updates (2025-11-10)
- ✅ Updated OpenAI API key in Cloud Function
- ✅ Deployed Cloud Function successfully
- ✅ Function URL: https://openaivisionproxy-k2ycslozcq-uc.a.run.app
- ✅ Camera scanner now working with new API key
- ✅ Changed "Project Information" to "Product Details" in Camber Calculator and Product Details screens
- ✅ Fixed span input fields layout to prevent fraction button from being pushed off-screen after scanning product tags
- ✅ **Added support for top strand patterns in Slippage Identifier** - DEPLOYED:
  - Updated SlippageData interface to track strand source (bottom/top)
  - Modified SlippageIdentifierScreen to display input fields for both bottom AND top strands
  - Updated SlippageSummaryScreen to show separate sections for bottom and top strands
  - Enhanced PDF generator to include both bottom and top strand data in reports
  - Strands now use prefixes: "B" for bottom strands (B1, B2, B3...), "T" for top strands (T1, T2, T3...)
  - Visual distinction: Bottom strands shown with green badges, Top strands with blue badges
  - Deployed to production at https://precast-qc-tools-web-app.web.app
- ✅ **Enhanced cross-section visualization with shape-based strand identification**:
  - Bottom strands now displayed in GREEN (instead of red)
  - Top strands displayed in BLUE
  - **Shape coding by strand size:**
    - 0.6" strands = Circles ⭕
    - 1/2" strands = X marks ✖️
    - 3/8" strands (top only) = Diamonds 🔷
  - Updated all 6 CrossSection components (8048, 1048, 1248, 1250, 1648, 1650)
  - Cross-sections now show both bottom and top strands simultaneously
  - Labels show B1, B2... for bottom strands and T1, T2... for top strands

## Features

### Product Tag Scanner
- **Native Camera Integration** - Uses iPhone native camera for sharp, clear images
- **AI-Powered OCR** - Automatically extracts all product information from tags
- **Cloud Function Proxy** - Secure server-side OpenAI API calls
- **Works on Web & Mobile** - Fully functional in both sandbox and deployed environments

### Quality Management Tools
- Product tracking and management
- Schedule scanning and import
- Real-time data synchronization
- User authentication and admin approval

## Deployment

### Deploy Web App + Cloud Functions

Deploy everything with a single command:

```bash
node deploy.js
```

This will:
1. Build the Expo web app for production
2. Deploy to Firebase Hosting
3. Your app will be live at https://precast-qc-tools-web-app.web.app

**Note:** Cloud Functions are deployed separately and require additional permissions (already configured).

### Deploy Cloud Functions Only

If you need to update just the Cloud Functions:

```bash
GOOGLE_APPLICATION_CREDENTIALS=/tmp/firebase-sa.json npx firebase deploy --only functions --project precast-qc-tools-web-app
```

**Requirements:**
- `FIREBASE_PROJECT_ID` must be set in `.env` file (via Vibecode ENV tab)
- `FIREBASE_SERVICE_ACCOUNT` (full JSON) must be set in `.env` file (via Vibecode ENV tab)

## Quick Start

### 1. Environment Setup

Add these environment variables via the Vibecode ENV tab:
- `FIREBASE_PROJECT_ID` - Your Firebase project ID
- `FIREBASE_SERVICE_ACCOUNT` - Your Firebase service account JSON

### 2. Install Dependencies

```bash
bun install
cd functions && npm install && cd ..
```

### 3. Run Development Server

```bash
npx expo start
```

## Architecture

### Frontend
- **React Native** with Expo SDK 53
- **NativeWind** for styling (TailwindCSS)
- **Firebase SDK** for authentication and data
- **Expo Router** for navigation
- **Zustand** for state management

### Backend
- **Firebase Authentication** - User auth with email/password
- **Firestore Database** - Real-time data storage
- **Cloud Functions** - OpenAI Vision API proxy (Node.js 20)
- **Firebase Hosting** - Web app deployment

### Cloud Function: OpenAI Vision Proxy

Located in `/functions/index.js`, this serverless function:
- Receives image data from the web app
- Calls OpenAI GPT-4o Vision API
- Returns parsed product tag data
- Avoids CORS and SSL certificate issues

**Endpoint:** https://us-central1-precast-qc-tools-web-app.cloudfunctions.net/openaiVisionProxy

## Project Structure

```
/home/user/workspace/
├── src/                          # React Native source code
│   ├── api/                      # API integration files
│   │   └── product-tag-scanner.ts  # Product tag AI parsing
│   ├── screens/                  # App screens
│   │   └── ProductTagScannerScreen.tsx
│   ├── components/               # Reusable components
│   ├── config/                   # Configuration files
│   └── store/                    # Zustand state management
├── functions/                    # Firebase Cloud Functions
│   ├── index.js                  # OpenAI Vision proxy function
│   └── package.json              # Function dependencies
├── assets/                       # Images, fonts, etc.
├── deploy.js                     # Deployment script
├── firebase.json                 # Firebase configuration
├── app.json                      # Expo configuration
└── package.json                  # Dependencies

```

## Deployment History

See `changelog.txt` for detailed deployment history and changes.

## Support

For issues or questions:
- Check the deployment logs in the console
- Review Firebase Cloud Function logs at: https://console.firebase.google.com/project/precast-qc-tools-web-app/functions
- Contact Vibecode support for infrastructure issues

## License

Private - All rights reserved
