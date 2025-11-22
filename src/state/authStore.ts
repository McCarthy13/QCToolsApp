import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signIn as firebaseSignIn,
  signOut as firebaseSignOut,
  registerUser as firebaseRegisterUser,
  onAuthStateChange,
  getCurrentUser as getFirebaseCurrentUser
} from '../services/firebaseAuth';
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  getPendingAccessRequests,
  approveUserAccess,
  rejectUserAccess,
  FirebaseUserProfile,
} from '../services/firebaseUsers';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  status: 'pending' | 'approved' | 'rejected';
  isTemporaryPassword: boolean;
  createdAt: number;
}

export interface PendingRequest {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  requestedAt: number;
  status: 'pending' | 'approved' | 'denied';
}

interface AuthState {
  currentUser: User | null;
  users: Record<string, { user: User; passwordHash: string }>;
  pendingRequests: PendingRequest[];
  currentSession: string | null;
  isInitialized: boolean;

  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; requiresPasswordChange?: boolean; error?: string }>;
  logout: () => Promise<void>;
  requestAccess: (data: Omit<PendingRequest, 'id' | 'requestedAt' | 'status'>) => Promise<{ success: boolean; requestId: string; error?: string }>;
  approveRequest: (requestId: string, temporaryPassword: string) => Promise<{ success: boolean; error?: string }>;
  denyRequest: (requestId: string) => Promise<{ success: boolean; error?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  getPendingRequests: () => Promise<PendingRequest[]>;
  initializeAuth: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

// Helper function to convert Firebase user profile to app User
const firebaseUserToAppUser = (firebaseUser: FirebaseUserProfile): User => {
  console.log('[AuthStore] firebaseUserToAppUser - RAW INPUT:', JSON.stringify(firebaseUser, null, 2));
  console.log('[AuthStore] firebaseUserToAppUser - firebaseUser.uid value:', firebaseUser.uid);
  console.log('[AuthStore] firebaseUserToAppUser - typeof firebaseUser.uid:', typeof firebaseUser.uid);

  const nameParts = firebaseUser.name.split(' ');

  // Explicitly create the id first and log it
  const userId = String(firebaseUser.uid);
  console.log('[AuthStore] firebaseUserToAppUser - userId after String():', userId);
  console.log('[AuthStore] firebaseUserToAppUser - typeof userId:', typeof userId);

  // Explicitly create a plain object with all properties
  const user: User = {
    id: userId,
    email: String(firebaseUser.email),
    firstName: String(nameParts[0] || ''),
    lastName: String(nameParts.slice(1).join(' ') || ''),
    role: firebaseUser.role as 'admin' | 'user',
    status: firebaseUser.status as 'pending' | 'approved' | 'rejected',
    isTemporaryPassword: Boolean(firebaseUser.needsPasswordChange || false),
    createdAt: firebaseUser.createdAt instanceof Date
      ? firebaseUser.createdAt.getTime()
      : firebaseUser.createdAt.toMillis(),
  };

  console.log('[AuthStore] firebaseUserToAppUser - CREATED USER:', JSON.stringify(user, null, 2));
  console.log('[AuthStore] firebaseUserToAppUser - user.id directly:', user.id);
  console.log('[AuthStore] firebaseUserToAppUser - typeof user.id:', typeof user.id);
  console.log('[AuthStore] firebaseUserToAppUser - Object.keys(user):', Object.keys(user));
  console.log('[AuthStore] firebaseUserToAppUser - user hasOwnProperty id:', user.hasOwnProperty('id'));
  console.log('[AuthStore] firebaseUserToAppUser - Manually stringified ID:', JSON.stringify({id: user.id}));

  return user;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: {},
      pendingRequests: [],
      currentSession: null,
      isInitialized: false,

      initializeAuth: async () => {
        console.log('[AuthStore] initializeAuth - Starting...');
        // Set up auth state listener
        onAuthStateChange(async (firebaseUser) => {
          console.log('[AuthStore] onAuthStateChange - Firebase user:', firebaseUser?.uid, firebaseUser?.email);
          if (firebaseUser) {
            // User is signed in, try to fetch their profile
            try {
              const { user: profile, error } = await getUserProfile(firebaseUser.uid);
              console.log('[AuthStore] onAuthStateChange - Profile fetched:', profile?.uid, profile?.email);
              if (profile && !error) {
                const appUser = firebaseUserToAppUser(profile);
                console.log('[AuthStore] onAuthStateChange - Setting currentUser to:', JSON.stringify(appUser, null, 2));
                set({
                  currentUser: appUser,
                  currentSession: firebaseUser.uid,
                });
                console.log('[AuthStore] onAuthStateChange - State after set:', JSON.stringify(get().currentUser, null, 2));
              } else {
                // If offline or profile not found, log warning but don't sign out
                // This allows the app to work even if Firestore is having issues
                console.warn('Could not fetch user profile from Firestore:', error);
                console.warn('Firestore may be offline or inaccessible. User will remain signed in.');
                // Keep the user signed in with basic info from Firebase Auth
                set({
                  currentUser: null, // Will trigger login flow
                  currentSession: null,
                });
                await firebaseSignOut();
              }
            } catch (err) {
              console.error('Error in auth state change:', err);
              set({
                currentUser: null,
                currentSession: null,
              });
            }
          } else {
            // User is signed out
            set({
              currentUser: null,
              currentSession: null,
            });
          }
        });

        set({ isInitialized: true });
      },

      setCurrentUser: (user: User | null) => {
        set({ currentUser: user });
      },

      login: async (email: string, password: string) => {
        try {
          const { user: firebaseUser, error } = await firebaseSignIn(email, password);

          if (error || !firebaseUser) {
            return { success: false, error: error || 'Login failed' };
          }

          // Get user profile from Firestore
          const { user: profile, error: profileError } = await getUserProfile(firebaseUser.uid);

          if (profileError || !profile) {
            await firebaseSignOut();
            return { success: false, error: 'User profile not found. Please contact an administrator.' };
          }

          // Check if user is approved
          if (profile.status === 'pending') {
            await firebaseSignOut();
            return { success: false, error: 'Your account is pending approval. Please wait for an administrator to approve your access.' };
          }

          if (profile.status === 'rejected') {
            await firebaseSignOut();
            return { success: false, error: 'Your access request was denied. Please contact an administrator.' };
          }

          const appUser = firebaseUserToAppUser(profile);
          console.log('[AuthStore] login - Setting currentUser to:', JSON.stringify(appUser, null, 2));

          set({
            currentUser: appUser,
            currentSession: firebaseUser.uid,
          });

          console.log('[AuthStore] login - Verifying state after set:', JSON.stringify(get().currentUser, null, 2));

          return {
            success: true,
            requiresPasswordChange: appUser.isTemporaryPassword,
          };
        } catch (error: any) {
          return { success: false, error: error.message || 'Login failed' };
        }
      },

      logout: async () => {
        await firebaseSignOut();
        set({
          currentUser: null,
          currentSession: null,
        });
      },

      requestAccess: async (data) => {
        try {
          const { firstName, lastName, email, company } = data;
          const fullName = `${firstName} ${lastName}`;

          // Register user with Firebase Auth
          const { user: firebaseUser, error: authError } = await firebaseRegisterUser(
            email,
            // Generate a temporary password (user will need to reset it)
            Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)
          );

          if (authError || !firebaseUser) {
            return {
              success: false,
              requestId: '',
              error: authError || 'Failed to create user account'
            };
          }

          // Create user profile in Firestore with pending status
          const { error: profileError } = await createUserProfile(firebaseUser.uid, {
            email,
            name: fullName,
            role: 'user',
            status: 'pending',
            company,
            needsPasswordChange: true,
          });

          if (profileError) {
            return {
              success: false,
              requestId: '',
              error: profileError
            };
          }

          // Sign out the newly created user (they need admin approval first)
          await firebaseSignOut();

          console.log('📧 Access request submitted for:', email);
          console.log('Admin needs to approve this user in the Admin Approval screen');

          return { success: true, requestId: firebaseUser.uid };
        } catch (error: any) {
          return {
            success: false,
            requestId: '',
            error: error.message || 'Failed to submit access request'
          };
        }
      },

      approveRequest: async (requestId: string, temporaryPassword: string) => {
        try {
          // Approve the user in Firestore
          const { error: approveError } = await approveUserAccess(requestId, 'user');

          if (approveError) {
            return { success: false, error: approveError };
          }

          // TODO: Send email notification to user with temporary password
          // For now, just log it
          const { user: profile } = await getUserProfile(requestId);
          if (profile) {
            console.log('📧 User approved:', profile.email);
            console.log('Temporary password:', temporaryPassword);
            console.log('NOTE: In production, this would be sent via email');
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message || 'Failed to approve request' };
        }
      },

      denyRequest: async (requestId: string) => {
        try {
          const { error } = await rejectUserAccess(requestId);

          if (error) {
            return { success: false, error };
          }

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message || 'Failed to deny request' };
        }
      },

      changePassword: async (newPassword: string) => {
        try {
          const { currentUser } = get();

          if (!currentUser) {
            return { success: false, error: 'Not logged in' };
          }

          // Note: Firebase doesn't support changing password without re-authentication
          // In a production app, you'd want to use Firebase's updatePassword function
          // and handle re-authentication properly. For now, we'll update the profile flag.

          const { error } = await updateUserProfile(currentUser.id, {
            needsPasswordChange: false,
          });

          if (error) {
            return { success: false, error };
          }

          const updatedUser = { ...currentUser, isTemporaryPassword: false };
          set({ currentUser: updatedUser });

          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message || 'Failed to change password' };
        }
      },

      getPendingRequests: async () => {
        try {
          const { requests, error } = await getPendingAccessRequests();

          if (error) {
            console.error('Failed to get pending requests:', error);
            return [];
          }

          return requests.map((profile): PendingRequest => ({
            id: profile.uid,
            email: profile.email,
            firstName: profile.name.split(' ')[0] || '',
            lastName: profile.name.split(' ').slice(1).join(' ') || '',
            company: profile.company || '',
            requestedAt: profile.createdAt instanceof Date
              ? profile.createdAt.getTime()
              : profile.createdAt.toMillis(),
            status: profile.status === 'rejected' ? 'denied' : profile.status,
          }));
        } catch (error: any) {
          console.error('Failed to get pending requests:', error);
          return [];
        }
      },
    }),
    {
      name: 'precast-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => {
        // Explicitly ensure the user object has all fields when saving
        const userToSave = state.currentUser ? {
          id: state.currentUser.id,
          email: state.currentUser.email,
          firstName: state.currentUser.firstName,
          lastName: state.currentUser.lastName,
          role: state.currentUser.role,
          status: state.currentUser.status,
          isTemporaryPassword: state.currentUser.isTemporaryPassword,
          createdAt: state.currentUser.createdAt,
        } : null;

        const toSave = {
          currentUser: userToSave,
          currentSession: state.currentSession,
        };

        console.log('[AuthStore] partialize - Saving state:', toSave);
        console.log('[AuthStore] partialize - currentUser.id:', userToSave?.id);
        console.log('[AuthStore] partialize - Stringified:', JSON.stringify(toSave, null, 2));
        return toSave;
      },
      onRehydrateStorage: () => (state, error) => {
        console.log('[AuthStore] onRehydrateStorage - Rehydrated state:', {
          currentUser: state?.currentUser,
          currentSession: state?.currentSession,
          error,
        });

        if (state?.currentUser) {
          console.log('[AuthStore] onRehydrateStorage - Current user ID:', state.currentUser.id);
          console.log('[AuthStore] onRehydrateStorage - typeof id:', typeof state.currentUser.id);
          console.log('[AuthStore] onRehydrateStorage - has id property:', 'id' in state.currentUser);
          console.log('[AuthStore] onRehydrateStorage - Current user FULL:', JSON.stringify(state.currentUser, null, 2));

          // Migration: If currentUser exists but id is missing or undefined, clear the auth state
          // This forces the user to be re-authenticated with the correct structure
          if (!state.currentUser.id || state.currentUser.id === '' || state.currentUser.id === 'undefined') {
            console.warn('[AuthStore] Migration: currentUser has invalid id field:', state.currentUser.id);
            console.warn('[AuthStore] Migration: Clearing auth state to force re-authentication');

            // Clear the storage to force fresh login
            AsyncStorage.removeItem('precast-auth-storage')
              .then(() => console.log('[AuthStore] Migration: Storage cleared'))
              .catch((e) => console.error('[AuthStore] Migration: Failed to clear storage:', e));

            // Also sign out from Firebase to ensure clean state
            firebaseSignOut()
              .then(() => console.log('[AuthStore] Migration: Signed out from Firebase'))
              .catch((e) => console.error('[AuthStore] Migration: Failed to sign out:', e));
          }
        }
      },
    }
  )
);
