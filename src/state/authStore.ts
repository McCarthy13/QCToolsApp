import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
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
  
  // Actions
  login: (email: string, password: string) => Promise<{ success: boolean; requiresPasswordChange?: boolean; error?: string }>;
  logout: () => void;
  requestAccess: (data: Omit<PendingRequest, 'id' | 'requestedAt' | 'status'>) => Promise<{ success: boolean; requestId: string }>;
  approveRequest: (requestId: string, temporaryPassword: string) => Promise<{ success: boolean }>;
  denyRequest: (requestId: string) => Promise<{ success: boolean }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  getPendingRequests: () => PendingRequest[];
}

// Simple password hashing (for prototype - NOT for production!)
const hashPassword = (password: string): string => {
  return btoa(password); // Base64 encoding - NOT SECURE, just for prototype
};

const verifyPassword = (password: string, hash: string): boolean => {
  return btoa(password) === hash;
};

// Initialize with admin user
const ADMIN_EMAIL = 'admin@precast.com';
const ADMIN_PASSWORD = 'Admin123!';

const initialUsers: Record<string, { user: User; passwordHash: string }> = {
  [ADMIN_EMAIL]: {
    user: {
      id: 'admin-1',
      email: ADMIN_EMAIL,
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isTemporaryPassword: false,
      createdAt: Date.now(),
    },
    passwordHash: hashPassword(ADMIN_PASSWORD),
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: initialUsers,
      pendingRequests: [],
      currentSession: null,

      login: async (email: string, password: string) => {
        const { users } = get();
        const userEntry = users[email.toLowerCase()];

        if (!userEntry) {
          return { success: false, error: 'Invalid email or password' };
        }

        if (!verifyPassword(password, userEntry.passwordHash)) {
          return { success: false, error: 'Invalid email or password' };
        }

        set({
          currentUser: userEntry.user,
          currentSession: Date.now().toString(),
        });

        return {
          success: true,
          requiresPasswordChange: userEntry.user.isTemporaryPassword,
        };
      },

      logout: () => {
        set({
          currentUser: null,
          currentSession: null,
        });
      },

      requestAccess: async (data) => {
        const requestId = `req-${Date.now()}`;
        const newRequest: PendingRequest = {
          ...data,
          id: requestId,
          requestedAt: Date.now(),
          status: 'pending',
        };

        set((state) => ({
          pendingRequests: [...state.pendingRequests, newRequest],
        }));

        // Simulate email notification
        console.log('📧 EMAIL NOTIFICATION (Simulated)');
        console.log('To: admin@precast.com');
        console.log('Subject: New Access Request - Precast Quality Tools');
        console.log('Body:');
        console.log(`${data.firstName} ${data.lastName} has requested access.`);
        console.log(`Email: ${data.email}`);
        console.log(`Company: ${data.company}`);
        console.log('\nApproval Link: precastqc://admin/approve/' + requestId);
        console.log('Deny Link: precastqc://admin/deny/' + requestId);

        return { success: true, requestId };
      },

      approveRequest: async (requestId: string, temporaryPassword: string) => {
        const { pendingRequests } = get();
        const request = pendingRequests.find((r) => r.id === requestId);

        if (!request) {
          return { success: false };
        }

        // Create new user with temporary password
        const newUser: User = {
          id: `user-${Date.now()}`,
          email: request.email,
          firstName: request.firstName,
          lastName: request.lastName,
          role: 'user',
          isTemporaryPassword: true,
          createdAt: Date.now(),
        };

        set((state) => ({
          users: {
            ...state.users,
            [request.email.toLowerCase()]: {
              user: newUser,
              passwordHash: hashPassword(temporaryPassword),
            },
          },
          pendingRequests: state.pendingRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'approved' as const } : r
          ),
        }));

        // Simulate email to user
        console.log('📧 EMAIL NOTIFICATION (Simulated)');
        console.log(`To: ${request.email}`);
        console.log('Subject: Access Granted - Precast Quality Tools');
        console.log('Body:');
        console.log(`Hello ${request.firstName},`);
        console.log('\nYour access request has been approved!');
        console.log(`Temporary Password: ${temporaryPassword}`);
        console.log('\nYou will be required to change your password on first login.');

        return { success: true };
      },

      denyRequest: async (requestId: string) => {
        set((state) => ({
          pendingRequests: state.pendingRequests.map((r) =>
            r.id === requestId ? { ...r, status: 'denied' as const } : r
          ),
        }));

        return { success: true };
      },

      changePassword: async (newPassword: string) => {
        const { currentUser, users } = get();

        if (!currentUser) {
          return { success: false, error: 'Not logged in' };
        }

        const updatedUser = { ...currentUser, isTemporaryPassword: false };
        const newHash = hashPassword(newPassword);

        set((state) => ({
          currentUser: updatedUser,
          users: {
            ...state.users,
            [currentUser.email.toLowerCase()]: {
              user: updatedUser,
              passwordHash: newHash,
            },
          },
        }));

        return { success: true };
      },

      getPendingRequests: () => {
        return get().pendingRequests.filter((r) => r.status === 'pending');
      },
    }),
    {
      name: 'precast-auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        users: state.users,
        pendingRequests: state.pendingRequests,
        currentUser: state.currentUser,
        currentSession: state.currentSession,
      }),
    }
  )
);
