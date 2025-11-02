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
// For React Native, we need to use initializeAuth with AsyncStorage for persistence
let auth: Auth;
if (Platform.OS !== 'web') {
  try {
    // Import getReactNativePersistence from the correct path
    // This is available in firebase/auth for React Native
    const { getReactNativePersistence }: any = require('firebase/auth');
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch (error: any) {
    // Fallback: if already initialized or import fails, just get the auth instance
    console.warn('Failed to initialize auth with persistence:', error.message);
    auth = getAuth(app);
  }
} else {
  // For web, use getAuth (persistence is automatic via IndexedDB)
  auth = getAuth(app);
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
  try {
    firestore = initializeFirestore(app, {
      cacheSizeBytes: 50 * 1024 * 1024, // 50 MB cache
      experimentalForceLongPolling: true, // Help with connection issues
    });
  } catch (error: any) {
    // If already initialized, get the existing instance
    console.warn('Firestore already initialized:', error.message);
    firestore = getFirestore(app);
  }
}

// Initialize Storage
const storage: FirebaseStorage = getStorage(app);

export { app, auth, firestore, storage };
