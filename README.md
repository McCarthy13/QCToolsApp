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
- ✅ **CRITICAL FIX: PDF generator now downloads files directly on web (no print dialog)**:
  - Fixed platform detection to use `Platform.OS === 'web'` instead of checking window object
  - jsPDF and html2canvas now only load on web platform (not React Native)
  - Added error logging to help diagnose library loading issues
  - Web users now get direct PDF file downloads instead of print dialog
- ✅ **Improved PDF generation error handling**:
  - Added validation for HTML content before printing
  - Enhanced error detection for "Printing did not complete" errors
  - Now retries PDF generation without images when print errors occur
  - Better logging to diagnose PDF generation issues
- ✅ **Fixed html2canvas document.createElement error in React Native**:
  - Added document object mock in index.ts for React Native platforms
  - Prevents html2canvas initialization errors on mobile
  - Web-only libraries now safely load without crashing the app
- ✅ **Fixed Latin1 encoding error for jsPDF/fast-png library**:
  - Added TextDecoder polyfill in index.ts to support latin1 encoding
  - Latin1 encoding now maps bytes directly to Unicode codepoints
  - Resolves "Unknown encoding: latin1" error when generating PDF reports
- ✅ **Changed product type 1248 to 1247 throughout the entire codebase**:
  - Renamed CrossSection1248 component to CrossSection1247
  - Updated all imports and references across all screens
  - Updated product type arrays, type definitions, and documentation
  - Updated comments in CrossSection1250 component
  - Product type 1247 now used consistently everywhere
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
  - **Shape coding by strand size (applies to both top and bottom strands):**
    - 3/8" strands = Diamonds 🔷
    - 1/2" strands = X marks ✖️
    - 0.6" strands = Circles ⭕
  - Updated all 6 CrossSection components (8048, 1048, 1247, 1250, 1648, 1650)
  - Cross-sections now show both bottom and top strands simultaneously
  - Labels show B1, B2... for bottom strands and T1, T2... for top strands
- ✅ **Fixed strand indicator visibility issue**:
  - Strand indicators now display correctly in all cross-section diagrams
  - Fixed condition logic to show strands when `strandCoordinates`, `bottomStrandSizes`, or `topStrandCoordinates` are provided
  - Applied fix to all 6 CrossSection components
  - Strands now visible in Slippage Identifier screen, Slippage Summary screen, and PDF reports
- ✅ **Enhanced PDF generation with direct download**:
  - Web platform now uses jsPDF + html2canvas for direct PDF file download
  - PDFs are automatically downloaded to Downloads folder (no print dialog)
  - Cross-section illustration now properly included in PDF reports
  - Added better padding (30px top/bottom, 40px left/right) for professional appearance
  - Reordered product details: Project #, Project Name, Mark #, ID #, Product Type, Strand Pattern, Span, Width
  - **Separate statistics for bottom and top strands:**
    - Bottom strand statistics section with totals and averages
    - Top strand statistics section with totals and averages
    - Each section shows: Total E1, Total E2, Total Both Ends, Average E1, Average E2, Average Both Ends
    - Independent warning indicators for bottom and top strands
  - Reduced empty spaces for more compact, efficient layout
  - Multi-page support for longer reports

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
