# Firebase Credentials - Quick Reference

## Your Firebase Config Values

Copy each value from Firebase Console and add to Vibecode ENV tab:

### Required Environment Variables:

```
EXPO_PUBLIC_FIREBASE_API_KEY=<paste your apiKey here>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<paste your authDomain here>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=<paste your projectId here>
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<paste your storageBucket here>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<paste your messagingSenderId here>
EXPO_PUBLIC_FIREBASE_APP_ID=<paste your appId here>
```

### Note:
- ❌ Skip `measurementId` - not needed for this app
- ✅ Make sure to copy the EXACT values (no quotes, no extra spaces)

---

## Next Steps After Adding to ENV Tab:

1. ✅ Save the environment variables in Vibecode
2. ✅ The app will automatically reload
3. ⏳ Continue with Firebase setup:
   - Enable Authentication (Email/Password)
   - Create Firestore Database
   - Enable Cloud Storage
   - Set up Security Rules
   - Create your first admin user

See `FIREBASE_SETUP.md` for detailed instructions on each step!
