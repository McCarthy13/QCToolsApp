import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, Auth } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Suppress console errors for transient network/SSL errors
const originalConsoleError = console.error;
console.error = (...args) => {
  const message = args.join(' ');
  // Suppress known transient Firebase/network errors
  if (
    message.includes('NSURLErrorDomain') ||
    message.includes('error -1013') ||
    message.includes('The operation couldn\'t be completed') ||
    (message.includes('API ERROR') && message.includes('Network error'))
  ) {
    // Log to console.log instead for debugging, but don't show error toast
    console.log('[Firebase] Transient network error suppressed:', message);
    return;
  }
  originalConsoleError(...args);
};

// Firebase configuration
// All values should come from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
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
  // For web, use the new cache API with persistent local cache
  try {
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (error: any) {
    // If already initialized, get the existing instance
    console.warn('Firestore already initialized:', error.message);
    firestore = getFirestore(app);
  }
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
