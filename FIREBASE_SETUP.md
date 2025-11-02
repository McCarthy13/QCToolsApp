# Firebase Setup Guide for Precast Quality Tools

## Overview

This app now uses Firebase for:
- **Authentication** - User accounts with email/password
- **Firestore Database** - Real-time data sync across all devices
- **Cloud Storage** - Photo attachments and file uploads
- **Offline Support** - Works offline, syncs when back online

---

## Step 1: Create Firebase Project

1. **Go to Firebase Console:** https://console.firebase.google.com/

2. **Create New Project:**
   - Click "Add project"
   - Project name: `precast-quality-tools` (or your preferred name)
   - Disable Google Analytics (optional, you can enable later)
   - Click "Create project"

---

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get started"
3. Enable **Email/Password** sign-in:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"

---

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode** (we'll add security rules later)
4. Select your Cloud Firestore location (choose closest to your users)
5. Click "Enable"

---

## Step 4: Enable Cloud Storage

1. In Firebase Console, go to **Build** → **Storage**
2. Click "Get started"
3. Start in **production mode**
4. Use the same location as Firestore
5. Click "Done"

---

## Step 5: Register Your App

### For Web App:

1. In Firebase Console, click the **Web icon** (`</>`) to add a web app
2. App nickname: `Precast Quality Tools Web`
3. **Check** "Also set up Firebase Hosting" (optional, for later)
4. Click "Register app"
5. **Copy the Firebase configuration** - you'll need this in Step 6

### For Mobile Apps (iOS & Android):

1. **iOS:**
   - Click the iOS icon
   - iOS bundle ID: `com.yourcompany.precastqualitytools` (from app.json)
   - Register and download `GoogleService-Info.plist`

2. **Android:**
   - Click the Android icon
   - Android package name: `com.yourcompany.precastqualitytools` (from app.json)
   - Register and download `google-services.json`

---

## Step 6: Add Firebase Config to Your App

You'll see a config object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Option A: Use Environment Variables (Recommended)

1. **Create a `.env` file** in the root directory:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

2. **Restart Expo:**
```bash
# Kill the current Expo process, then:
bun start
```

### Option B: Hardcode Values (Quick Testing Only)

Edit `/src/config/firebase.ts` and replace the placeholder values:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
  // ... etc
};
```

**⚠️ Warning:** Don't commit real Firebase keys to version control!

---

## Step 7: Set Up Firestore Security Rules

1. In Firebase Console, go to **Firestore Database** → **Rules**
2. Replace the default rules with these:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper function to check if user is approved
    function isApproved() {
      return isAuthenticated() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'approved';
    }

    // Helper function to check if user is admin
    function isAdmin() {
      return isApproved() &&
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Users collection
    match /users/{userId} {
      // Anyone can create their own user document during registration
      allow create: if isAuthenticated() && request.auth.uid == userId;

      // Users can read their own profile
      allow read: if isAuthenticated() && request.auth.uid == userId;

      // Admins can read all users
      allow read: if isAdmin();

      // Only admins can update user status and roles
      allow update: if isAdmin() ||
                      (isAuthenticated() && request.auth.uid == userId &&
                       !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'status']));

      // Only admins can delete users
      allow delete: if isAdmin();
    }

    // Quality Logs - All approved users can read/write
    match /qualityLogs/{logId} {
      allow read, write: if isApproved();
    }

    // Pour Schedules - All approved users can read/write
    match /pourSchedules/{scheduleId} {
      allow read, write: if isApproved();
    }

    // Yard Locations - All approved users can read/write
    match /yardLocations/{locationId} {
      allow read, write: if isApproved();
    }

    // Project Library - All approved users can read/write
    match /projects/{projectId} {
      allow read, write: if isApproved();
    }

    // Contacts - All approved users can read/write
    match /contacts/{contactId} {
      allow read, write: if isApproved();
    }

    // Material Libraries (aggregates, admixtures, products)
    match /aggregates/{aggregateId} {
      allow read, write: if isApproved();
    }

    match /admixtures/{admixtureId} {
      allow read, write: if isApproved();
    }

    match /products/{productId} {
      allow read, write: if isApproved();
    }

    // Issue Code Library - Read by all approved users, write by admins
    match /issueCodes/{codeId} {
      allow read: if isApproved();
      allow write: if isAdmin();
    }
  }
}
```

3. Click **Publish**

---

## Step 8: Set Up Storage Security Rules

1. In Firebase Console, go to **Storage** → **Rules**
2. Replace with these rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // Helper function to check if user is authenticated and approved
    function isApproved() {
      return request.auth != null;
    }

    // Quality log photos
    match /qualityLogs/{logId}/{fileName} {
      allow read: if isApproved();
      allow write: if isApproved() &&
                     request.resource.size < 10 * 1024 * 1024 && // 10MB max
                     request.resource.contentType.matches('image/.*');
    }

    // Calibration reports
    match /calibrations/{reportId}/{fileName} {
      allow read: if isApproved();
      allow write: if isApproved() &&
                     request.resource.size < 20 * 1024 * 1024; // 20MB max
    }

    // General attachments
    match /attachments/{userId}/{fileName} {
      allow read: if isApproved();
      allow write: if isApproved() &&
                     request.auth.uid == userId &&
                     request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

3. Click **Publish**

---

## Step 9: Create First Admin User

You need to create your first admin account manually:

### Method 1: Via Firebase Console (Easiest)

1. Go to **Authentication** → **Users**
2. Click "Add user"
3. Email: `admin@yourcompany.com`
4. Password: Choose a strong password
5. Click "Add user"
6. **Copy the User UID** (you'll need it for next step)

7. Go to **Firestore Database**
8. Click "Start collection"
9. Collection ID: `users`
10. Document ID: Paste the User UID from step 6
11. Add these fields:
    - `email` (string): `admin@yourcompany.com`
    - `name` (string): `Admin`
    - `role` (string): `admin`
    - `status` (string): `approved`
    - `createdAt` (timestamp): Click "Set to current time"
    - `updatedAt` (timestamp): Click "Set to current time"
12. Click "Save"

### Method 2: Via App (After First Launch)

1. Register a new account in the app
2. Go to Firebase Console → **Firestore Database** → `users` collection
3. Find your user document
4. Edit it and change:
   - `status` → `approved`
   - `role` → `admin`

---

## Step 10: Test the Setup

1. **Restart your app** (stop and start Expo)
2. **Try to register** a new account
3. **Check Firebase Console:**
   - Authentication → Users (should see the new user)
   - Firestore → users collection (should see user document with status: 'pending')
4. **Login as admin** (from Step 9)
5. **Approve the pending user** in the Admin Approval screen
6. **Test real-time sync:**
   - Open app on two devices/browsers
   - Create a quality log on one device
   - It should appear instantly on the other device

---

## Step 11: Enable Offline Persistence (Already Done)

The app is already configured for offline support:
- **Mobile (iOS/Android):** 50MB cache for offline data
- **Web:** IndexedDB persistence automatically enabled
- Data syncs automatically when connection is restored

---

## Firestore Database Structure

Your database will have these collections:

```
users/
  {userId}/
    - email, name, role, status, createdAt, updatedAt

qualityLogs/
  {logId}/
    - All quality log data
    - Photos stored in Cloud Storage, URLs in Firestore

pourSchedules/
  {scheduleId}/
    - Pour schedule entries by date/department

yardLocations/
  {locationId}/
    - Yarded pieces and their locations

projects/
  {projectId}/
    - Project/job information

contacts/
  {contactId}/
    - Contact information

aggregates/, admixtures/, products/
  {itemId}/
    - Material library data

issueCodes/
  {codeId}/
    - Issue code definitions
```

---

## Troubleshooting

### "Permission denied" errors

- Check your Firestore Security Rules
- Make sure the user is approved (status: 'approved')
- Make sure you're logged in

### App shows "YOUR_API_KEY"

- You haven't set up environment variables
- Make sure `.env` file exists in root directory
- Restart Expo after creating `.env`

### Data not syncing between devices

- Check Firebase Console → Firestore to verify data is being saved
- Check network connectivity
- Look for errors in the Expo logs (expo.log file)

### Firebase not initialized

- Verify all environment variables are set correctly
- Check for typos in `.env` file
- Restart Expo dev server

---

## Next Steps

After Firebase is set up:

1. ✅ Authentication working
2. ⏳ Migrate Quality Logs to Firestore
3. ⏳ Migrate Pour Schedule to Firestore
4. ⏳ Migrate Yard Locations to Firestore
5. ⏳ Migrate other features...
6. ⏳ Deploy web app

---

## Important Security Notes

1. **Never commit `.env` to git** - Add it to `.gitignore`
2. **Use different Firebase projects** for development and production
3. **Regularly review Security Rules** as you add features
4. **Enable App Check** for production (prevents API abuse)
5. **Set up Firebase budget alerts** to monitor usage

---

## Firebase Free Tier Limits

Firebase has a generous free tier:

- **Authentication:** Unlimited users
- **Firestore:**
  - 1 GB storage
  - 50,000 reads/day
  - 20,000 writes/day
  - 20,000 deletes/day
- **Storage:** 5 GB storage, 1 GB/day downloads
- **Hosting:** 10 GB/month bandwidth

For your company use, this should be plenty. If you exceed limits, you'll need to upgrade to the Blaze (pay-as-you-go) plan.

---

## Support

- Firebase Docs: https://firebase.google.com/docs
- Firebase Console: https://console.firebase.google.com/
- Firestore Security Rules: https://firebase.google.com/docs/firestore/security/get-started
- Firebase Status: https://status.firebase.google.com/

---

**Ready to continue?** Once Firebase is set up, we can start migrating your app features to use cloud sync!
