# Precast Quality Tools

A comprehensive mobile app for precast concrete quality management, built with React Native and Expo.

## Deployment Status

✅ **Web App Deployed** - Live at https://precast-qc-tools-web-app.web.app
✅ **Firebase Authentication** - Fully integrated with email/password sign-in
✅ **Firestore Database** - Ready for real-time data sync
✅ **Cloud Storage** - Ready for file uploads
✅ **Admin Approval System** - Working and tested
✅ **Data Import Tool** - Import existing data from JSON to Firebase

---

## Quick Start

### 1. Set Up Firebase Credentials

You need to add your Firebase project credentials to get the app fully working.

**Option A: Using Vibecode ENV Tab (Recommended)**

1. Open the **ENV tab** in your Vibecode app
2. Add the following environment variables with your Firebase project values:

```
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id_here
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id_here
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id_here
```

**Option B: Local Development**

If you're running locally, create a `.env` file in the root directory with the same variables above.

**Where to get these values:**
- Go to [Firebase Console](https://console.firebase.google.com/)
- Select your project (or create a new one)
- Go to Project Settings > General
- Scroll down to "Your apps" and click the web icon `</>`
- Copy the config values

### 2. Set Up Firebase Services

Follow the detailed guide in [`FIREBASE_SETUP.md`](./FIREBASE_SETUP.md) to:
- Enable Authentication (Email/Password)
- Create Firestore Database
- Enable Cloud Storage
- Set up Security Rules
- Create your first admin user

### 3. Import Existing Data (Optional)

If you have existing data from a previous version of the app, you can import it to Firebase:

1. **Login as Admin** - You must have admin privileges to access the import tool
2. **Open Data Import** - Tap the green cloud upload button in the top-right corner of the dashboard
3. **Paste JSON Data** - Paste your exported JSON data into the text field
4. **Import to Firebase** - Tap "Import to Firebase" button
5. **Verify Import** - Check the success message showing how many items were imported

The import tool supports:
- Strand Patterns
- Products (including hollow core sub-products)
- Strand Library
- Aggregate Library
- Admixture Library
- Projects
- Contacts
- Yard Locations

**Note:** Data with matching IDs will be merged (not duplicated). This means you can safely re-import updated data.

### 4. Test the App

Once Firebase is configured, the app will automatically connect. You can:

1. **Register a new user** - Submit an access request
2. **Admin approval** - First admin user needs to be created manually in Firebase Console (see FIREBASE_SETUP.md)
3. **Login** - Use approved credentials
4. **Explore features** - Access all the precast quality tools

---

## App Architecture

### Authentication Flow

```
User Registration → Firebase Auth + Firestore Profile (pending status)
       ↓
Admin Approval → Update Firestore status to 'approved'
       ↓
User Login → Check Firestore approval status → Grant access
```

### Key Features

- **Camber Calculator** - Calculate camber for precast members
- **Slippage Identifier** - Identify strand slippage issues
- **Stressing Calculator** - Calculate strand elongation
- **Aggregate Gradation** - Test and track aggregate gradations
- **Quality Logs** - Track quality issues by department
- **Daily Pour Schedule** - Manage pour schedules
- **Yard Maps** - Track piece locations in the yard
- **Material Libraries** - Manage aggregates, admixtures, and products
- **Project & Contact Management** - Organize projects and contacts
- **Data Import Tool (Admin)** - Import existing data from JSON exports to Firebase

---

## Tech Stack

- **Frontend**: React Native 0.76.7 with Expo SDK 53
- **Styling**: NativeWind (TailwindCSS for React Native)
- **Navigation**: React Navigation
- **State Management**: Zustand with AsyncStorage persistence
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Cloud Storage
- **Icons**: Lucide React Native

---

## Project Structure

```
/home/user/workspace/
├── src/
│   ├── components/        # Reusable UI components
│   ├── screens/           # App screens
│   ├── navigation/        # Navigation types
│   ├── services/          # Firebase services
│   │   ├── firebaseAuth.ts       # Authentication service
│   │   ├── firebaseUsers.ts      # User profile management
│   │   └── ...
│   ├── state/             # Zustand stores
│   │   ├── authStore.ts          # Authentication state
│   │   └── ...
│   ├── config/            # Configuration files
│   │   └── firebase.ts           # Firebase initialization
│   ├── types/             # TypeScript type definitions
│   └── utils/             # Utility functions
├── assets/                # Images, fonts, etc.
├── App.tsx               # Main app entry point
├── app.json              # Expo configuration
├── package.json          # Dependencies
└── README.md            # This file
```

---

## Firebase Collections Structure

### `users` Collection

```typescript
{
  uid: string;              // Firebase Auth UID
  email: string;            // User email
  name: string;             // Full name
  role: 'admin' | 'user';   // User role
  status: 'pending' | 'approved' | 'rejected';
  company?: string;         // Company name
  department?: string;      // Department
  needsPasswordChange?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Future Collections (Ready to implement)

- `qualityLogs` - Quality log entries
- `pourSchedules` - Pour schedule data
- `yardLocations` - Yard piece locations
- `projects` - Project/job information
- `contacts` - Contact directory
- `aggregates` - Aggregate library
- `admixtures` - Admixture library
- `products` - Product library
- `issueCodes` - Issue code definitions

---

## Current Implementation Status

### ✅ Completed

- [x] Firebase configuration setup
- [x] Firebase Authentication integration
- [x] Firestore user profile management
- [x] User registration with admin approval workflow
- [x] Login/logout functionality
- [x] Auth state persistence
- [x] Real-time auth state listener
- [x] Admin approval screen
- [x] Password change screen
- [x] Data import tool for migrating existing data to Firebase
- [x] All UI screens and navigation
- [x] Offline-first architecture
- [x] TypeScript type safety
- [x] Web deployment text input fix - inputs are now fully interactive on web
- [x] Slippage Identifier ">1 inch" calculation fix - properly handles ">1 inch" values in totals and averages
- [x] Slippage Identifier PDF Report - colorful PDF with captured cross-section diagram showing strand pattern, cut width, and slippage values
- [x] iOS PDF image loading fix - cross-section images now properly embedded as base64 data URIs for iOS compatibility
- [x] PDF generation error fix - resolved "non-std C++ exception" by adding image size limits, quality reduction, and fallback retry logic
- [x] Slippage average calculation fix - averages now include all active strands (including those with 0 slippage) for accurate results
- [x] Slippage per-strand total fix - per-strand totals now properly treat >1 inch values as 1.0 for accurate calculations
- [x] Active strand calculation fix - now accounts for full product width (strand span + 2" concrete cover on each side) instead of just strand positions
- [x] Terminology update - changed "Offcut Side" to "Product Side" in Slippage Identifier and Camber Calculator for clearer user experience
- [x] PDF layout optimization - reduced spacing and font sizes to fit entire slippage report on single page
- [x] Cross-section visual refinement - removed red outline from product edge for cleaner presentation
- [x] Product tag OCR scanning - added comprehensive camera-based OCR to scan entire product tag and auto-fill all fields (project number, mark number, ID number, span, pour date, strand pattern, product width) using AI vision in both Slippage Identifier and Camber Calculator
- [x] Pour date field - added pour date field to product details and PDF reports
- [x] Span display enhancement - span now properly displayed in feet and decimal inches format (e.g., 33'-2.5") in PDF reports
- [x] Single-scan workflow - "Scan Product Tag" button at top of Product Details and Camber Calculator screens captures all information from the tag in one photo
- [x] Daily pour schedule enhanced OCR - added extraction of Position, Length 1, Length 2, Width, Angle, and Cutback fields from schedule images with detailed formatting (feet-inch-fraction format for lengths and cutback, numeric values with units for width and angle)
- [x] Schedule scanner authentication fix - converted OpenAI API calls from SDK to fetch API for proper authentication with Vibecode proxy
- [x] Schedule scanner UX improvements - removed confusing blue frame guide; added zoom controls (+/-/reset) for precise framing; tips prompt encourages holding steady and waiting for focus before capture
- [x] Position column verification system - AI uses Position column to determine total row count; extracts that many entries without attempting pattern validation or sequential verification
- [x] Simplified extraction logic - removed complex verification steps that were causing AI to "correct" values it read correctly; AI now extracts EXACTLY what it sees without trying to find patterns, verify consistency, or infer sequential ID numbers; each row treated as completely independent
- [x] Schedule scanner camera optimization - using device's maximum native resolution with quality=1; increased stabilization delay to 500ms for full autofocus lock; enabled EXIF data preservation for proper orientation; added imageType specification for maximum quality JPG capture; user guidance emphasizes holding VERY steady and waiting 1-2 seconds before capture; warning about excessive zoom reducing quality
- [x] Product tag scanner zoom controls - added zoom in/out buttons with level indicator and reset button to capture product tags that are high up or out of reach (supports up to 10x digital zoom)

### ⏳ Ready to Implement

- [ ] Migrate Quality Logs to Firestore
- [ ] Migrate Pour Schedule to Firestore
- [ ] Migrate Yard Locations to Firestore
- [ ] Migrate Material Libraries to Firestore
- [ ] Add photo upload to Cloud Storage
- [ ] Implement real-time sync for all features
- [ ] Add admin user management
- [ ] Email notifications for user approvals

---

## Development

### Running the App

The app is already running in your Vibecode environment. Any changes you make will automatically hot-reload in the Vibecode mobile app.

### Viewing Logs

Check the **LOGS tab** in the Vibecode app or read the `expo.log` file to see runtime logs and debug issues.

### Adding New Features

1. Create new Firestore collections as needed
2. Add security rules in Firebase Console
3. Create service functions in `/src/services/`
4. Add state management in `/src/state/`
5. Build UI in `/src/screens/` and `/src/components/`

---

## Default Admin Credentials

After setting up Firebase, you need to manually create an admin user in Firebase Console. See Step 9 in `FIREBASE_SETUP.md`.

The old local admin credentials are no longer active. Firebase Authentication is now the source of truth.

---

## Security Notes

⚠️ **Important Security Reminders:**

1. **Never commit Firebase API keys** to version control (already in `.gitignore`)
2. **Set up proper Firestore Security Rules** before production (see FIREBASE_SETUP.md)
3. **Enable Firebase App Check** for production to prevent API abuse
4. **Use different Firebase projects** for development and production
5. **Regularly review user access** in the Admin Approval screen
6. **Set up Firebase budget alerts** to monitor usage

---

## Troubleshooting

### "Permission denied" errors
- Check Firestore Security Rules in Firebase Console
- Make sure user status is 'approved' in Firestore
- Verify user is logged in

### App shows "YOUR_API_KEY"
- Firebase credentials not set up
- Add credentials via ENV tab in Vibecode app
- Restart the app after adding credentials

### Data not syncing
- Check Firebase Console to verify data is saving
- Check network connectivity
- Look for errors in the LOGS tab
- Verify Firestore Security Rules are correct

### Login fails
- Verify user exists in Firebase Authentication
- Check user status in Firestore (should be 'approved')
- Make sure password is correct
- Check expo.log for detailed error messages

---

## Next Steps

1. **Complete Firebase Setup** - Follow `FIREBASE_SETUP.md` to configure your Firebase project
2. **Create Admin User** - Manually create first admin in Firebase Console
3. **Test Authentication** - Register, approve, and login
4. **Add Real Features** - Start migrating data to Firestore
5. **Deploy** - Build and deploy to App Store / Google Play

---

## Support

- **Firebase Docs**: https://firebase.google.com/docs
- **Expo Docs**: https://docs.expo.dev/
- **React Native Docs**: https://reactnative.dev/

---

## License

Private - Internal Use Only
