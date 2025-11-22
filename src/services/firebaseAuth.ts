import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';

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
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    return { user: userCredential.user, error: null };
  } catch (error: any) {
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
