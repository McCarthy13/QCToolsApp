import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'pending' | 'approved' | 'rejected';

export interface FirebaseUserProfile {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  company?: string;
  department?: string;
  needsPasswordChange?: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

const USERS_COLLECTION = 'users';
const ACCESS_REQUESTS_COLLECTION = 'accessRequests';

/**
 * Create a new user profile in Firestore
 */
export const createUserProfile = async (
  uid: string,
  data: Omit<FirebaseUserProfile, 'uid' | 'createdAt' | 'updatedAt'>
): Promise<{ error: string | null }> => {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    await setDoc(userRef, {
      ...data,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to create user profile' };
  }
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (
  uid: string
): Promise<{ user: FirebaseUserProfile | null; error: string | null }> => {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { user: null, error: 'User profile not found' };
    }

    // Include the document ID (uid) in the returned data
    const userData = userSnap.data();
    return {
      user: {
        ...userData,
        uid: userSnap.id, // Ensure uid is included from document ID
      } as FirebaseUserProfile,
      error: null
    };
  } catch (error: any) {
    return { user: null, error: error.message || 'Failed to get user profile' };
  }
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  uid: string,
  data: Partial<Omit<FirebaseUserProfile, 'uid' | 'createdAt'>>
): Promise<{ error: string | null }> => {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to update user profile' };
  }
};

/**
 * Delete user profile
 */
export const deleteUserProfile = async (
  uid: string
): Promise<{ error: string | null }> => {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    await deleteDoc(userRef);
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to delete user profile' };
  }
};

/**
 * Get all pending access requests (admin only)
 */
export const getPendingAccessRequests = async (): Promise<{
  requests: FirebaseUserProfile[];
  error: string | null;
}> => {
  try {
    const q = query(
      collection(firestore, USERS_COLLECTION),
      where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(q);

    const requests: FirebaseUserProfile[] = [];
    querySnapshot.forEach((doc) => {
      requests.push({
        ...doc.data(),
        uid: doc.id, // Include document ID as uid
      } as FirebaseUserProfile);
    });

    return { requests, error: null };
  } catch (error: any) {
    return {
      requests: [],
      error: error.message || 'Failed to get access requests',
    };
  }
};

/**
 * Approve a user access request
 */
export const approveUserAccess = async (
  uid: string,
  role: UserRole = 'user'
): Promise<{ error: string | null }> => {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      status: 'approved',
      role,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to approve user' };
  }
};

/**
 * Reject a user access request
 */
export const rejectUserAccess = async (
  uid: string
): Promise<{ error: string | null }> => {
  try {
    const userRef = doc(firestore, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error: any) {
    return { error: error.message || 'Failed to reject user' };
  }
};

/**
 * Listen to user profile changes in real-time
 */
export const subscribeToUserProfile = (
  uid: string,
  callback: (user: FirebaseUserProfile | null) => void
) => {
  const userRef = doc(firestore, USERS_COLLECTION, uid);
  return onSnapshot(userRef, (doc) => {
    if (doc.exists()) {
      callback({
        ...doc.data(),
        uid: doc.id, // Include document ID as uid
      } as FirebaseUserProfile);
    } else {
      callback(null);
    }
  });
};

/**
 * Listen to pending access requests in real-time (admin only)
 */
export const subscribeToPendingRequests = (
  callback: (requests: FirebaseUserProfile[]) => void
) => {
  const q = query(
    collection(firestore, USERS_COLLECTION),
    where('status', '==', 'pending')
  );

  return onSnapshot(q, (querySnapshot) => {
    const requests: FirebaseUserProfile[] = [];
    querySnapshot.forEach((doc) => {
      requests.push({
        ...doc.data(),
        uid: doc.id, // Include document ID as uid
      } as FirebaseUserProfile);
    });
    callback(requests);
  });
};

/**
 * Check if user is admin
 */
export const isUserAdmin = async (uid: string): Promise<boolean> => {
  try {
    const { user } = await getUserProfile(uid);
    return user?.role === 'admin' && user?.status === 'approved';
  } catch {
    return false;
  }
};

/**
 * Get all approved users (admin only)
 */
export const getAllApprovedUsers = async (): Promise<{
  users: FirebaseUserProfile[];
  error: string | null;
}> => {
  try {
    const q = query(
      collection(firestore, USERS_COLLECTION),
      where('status', '==', 'approved')
    );
    const querySnapshot = await getDocs(q);

    const users: FirebaseUserProfile[] = [];
    querySnapshot.forEach((doc) => {
      users.push({
        ...doc.data(),
        uid: doc.id, // Include document ID as uid
      } as FirebaseUserProfile);
    });

    return { users, error: null };
  } catch (error: any) {
    return { users: [], error: error.message || 'Failed to get users' };
  }
};
