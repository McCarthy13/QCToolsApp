import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  User as FirebaseUser,
  onAuthStateChanged,
  signInAnonymously,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  EmailAuthProvider,
  linkWithCredential,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Platform } from 'react-native';

export interface AuthResult {
  user: FirebaseUser | null;
  error: string | null;
}

/**
 * Register a new user with email and password
 */
export const registerUser = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    console.log('[FirebaseAuth] registerUser - Attempting to register:', email);
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    console.log('[FirebaseAuth] registerUser - Success, uid:', userCredential.user.uid);
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('[FirebaseAuth] registerUser - Error code:', error.code);
    console.error('[FirebaseAuth] registerUser - Error message:', error.message);
    return { user: null, error: error.message || 'Registration failed' };
  }
};

/**
 * Sign in an existing user
 */
export const signIn = async (
  email: string,
  password: string
): Promise<AuthResult> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error: any) {
    let errorMessage = 'Login failed';

    // Provide user-friendly error messages
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid email or password';
    } else if (error.code === 'auth/too-many-requests') {
      errorMessage = 'Too many failed attempts. Please try again later';
    } else if (error.code === 'auth/network-request-failed') {
      errorMessage = 'Network error. Please check your connection';
    }

    return { user: null, error: errorMessage };
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    await firebaseSignOut(auth);
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Sign out failed' };
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (
  email: string
): Promise<{ error: string | null }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: any) {
    let errorMessage = 'Password reset failed';

    if (error.code === 'auth/user-not-found') {
      errorMessage = 'No account found with this email';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    }

    return { error: errorMessage };
  }
};

/**
 * Update user password (for logged-in users)
 */
export const changePassword = async (
  newPassword: string
): Promise<{ error: string | null }> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      return { error: 'No user logged in' };
    }

    await updatePassword(user, newPassword);
    return { error: null };
  } catch (error: any) {
    let errorMessage = 'Password change failed';

    if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'Please log in again to change your password';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak';
    }

    return { error: errorMessage };
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

/**
 * Listen to authentication state changes
 */
export const onAuthStateChange = (
  callback: (user: FirebaseUser | null) => void
) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Sign in to Firebase Auth for Microsoft 365 users using anonymous authentication
 * This creates a Firebase Auth session so Firestore security rules work properly
 * The actual user identity is managed via Microsoft SSO and stored in Firestore
 */
export const signInForMicrosoftUser = async (
  userId: string
): Promise<AuthResult> => {
  try {
    console.log('[FirebaseAuth] signInForMicrosoftUser - Starting for userId:', userId);

    // Use anonymous authentication for Microsoft SSO users
    // This allows Firebase Auth to work without requiring a real email
    // The actual user identity comes from Microsoft SSO and is stored in Firestore
    console.log('[FirebaseAuth] signInForMicrosoftUser - Using anonymous authentication');

    const userCredential = await signInAnonymously(auth);
    console.log('[FirebaseAuth] signInForMicrosoftUser - Anonymous sign in successful, uid:', userCredential.user.uid);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('[FirebaseAuth] signInForMicrosoftUser - Exception:', error);
    console.error('[FirebaseAuth] signInForMicrosoftUser - Error code:', error.code);
    console.error('[FirebaseAuth] signInForMicrosoftUser - Error message:', error.message);

    let errorMessage = 'Microsoft Firebase auth failed';
    if (error.code === 'auth/operation-not-allowed') {
      errorMessage = 'Anonymous authentication is not enabled in Firebase. Please enable it in the Firebase Console.';
    }

    return { user: null, error: errorMessage };
  }
};

/**
 * Send a sign-in link to the user's email (passwordless authentication)
 */
export const sendEmailSignInLink = async (
  email: string
): Promise<{ error: string | null }> => {
  try {
    console.log('[FirebaseAuth] sendEmailSignInLink - Sending to:', email);

    // Determine the correct URL based on platform
    const baseUrl = Platform.OS === 'web'
      ? window.location.origin
      : 'https://precast-qc-tools-web-app.web.app';

    const actionCodeSettings = {
      url: `${baseUrl}/email-sign-in?email=${encodeURIComponent(email)}`,
      handleCodeInApp: true,
      iOS: {
        bundleId: 'com.yourcompany.precastqualitytools',
      },
      android: {
        packageName: 'com.yourcompany.precastqualitytools',
        installApp: false,
      },
      dynamicLinkDomain: undefined, // Not using dynamic links
    };

    await sendSignInLinkToEmail(auth, email, actionCodeSettings);
    console.log('[FirebaseAuth] sendEmailSignInLink - Email sent successfully');

    return { error: null };
  } catch (error: any) {
    console.error('[FirebaseAuth] sendEmailSignInLink - Error:', error);

    let errorMessage = 'Failed to send sign-in link';
    if (error.code === 'auth/invalid-email') {
      errorMessage = 'Invalid email address';
    } else if (error.code === 'auth/missing-continue-uri') {
      errorMessage = 'Configuration error. Please contact support.';
    }

    return { error: errorMessage };
  }
};

/**
 * Check if the current URL is a sign-in link
 */
export const isEmailSignInLink = (url: string): boolean => {
  return isSignInWithEmailLink(auth, url);
};

/**
 * Complete sign-in with email link
 */
export const completeEmailSignIn = async (
  email: string,
  url: string
): Promise<AuthResult> => {
  try {
    console.log('[FirebaseAuth] completeEmailSignIn - Completing sign in for:', email);

    if (!isSignInWithEmailLink(auth, url)) {
      return { user: null, error: 'Invalid sign-in link' };
    }

    const userCredential = await signInWithEmailLink(auth, email, url);
    console.log('[FirebaseAuth] completeEmailSignIn - Success, uid:', userCredential.user.uid);

    return { user: userCredential.user, error: null };
  } catch (error: any) {
    console.error('[FirebaseAuth] completeEmailSignIn - Error:', error);

    let errorMessage = 'Failed to sign in';
    if (error.code === 'auth/invalid-action-code') {
      errorMessage = 'This sign-in link has expired or already been used. Please request a new one.';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email address does not match the one used for the sign-in link.';
    }

    return { user: null, error: errorMessage };
  }
};

/**
 * Add a password to an existing email-link authenticated user
 */
export const addPasswordToAccount = async (
  password: string
): Promise<{ error: string | null }> => {
  try {
    const user = auth.currentUser;
    if (!user || !user.email) {
      return { error: 'No user logged in or user has no email' };
    }

    console.log('[FirebaseAuth] addPasswordToAccount - Adding password for:', user.email);

    // Create email/password credential
    const credential = EmailAuthProvider.credential(user.email, password);

    // Link the credential to the current user
    await linkWithCredential(user, credential);

    console.log('[FirebaseAuth] addPasswordToAccount - Password added successfully');
    return { error: null };
  } catch (error: any) {
    console.error('[FirebaseAuth] addPasswordToAccount - Error:', error);

    let errorMessage = 'Failed to set password';
    if (error.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use at least 6 characters.';
    } else if (error.code === 'auth/requires-recent-login') {
      errorMessage = 'Please sign in again before setting a password.';
    } else if (error.code === 'auth/provider-already-linked') {
      errorMessage = 'This account already has a password set.';
    }

    return { error: errorMessage };
  }
};
