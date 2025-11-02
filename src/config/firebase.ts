import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, initializeFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration
// NOTE: These values need to be added to your .env file or replaced with your actual Firebase config
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID",
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Auth
// Note: For React Native with newer Firebase versions, we just use getAuth
// AsyncStorage persistence is handled automatically
let auth: Auth;
try {
  auth = getAuth(app);
} catch {
  // Fallback if getAuth fails (shouldn't happen)
  auth = initializeAuth(app, {});
}

// Initialize Firestore
let firestore: Firestore;
if (Platform.OS === 'web') {
  firestore = getFirestore(app);
  // Enable offline persistence for web
  enableIndexedDbPersistence(firestore).catch((err: any) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence not available in this browser');
    }
  });
} else {
  // For React Native, use custom settings for better offline support
  firestore = initializeFirestore(app, {
    cacheSizeBytes: 50 * 1024 * 1024, // 50 MB cache
  });
}

// Initialize Storage
const storage: FirebaseStorage = getStorage(app);

export { app, auth, firestore, storage };
