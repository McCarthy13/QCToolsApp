import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  Unsubscribe,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';

/**
 * Generic Firebase sync helper for Zustand stores
 */
export class FirebaseSync<T extends { id: string }> {
  private collectionName: string;
  private unsubscribe: Unsubscribe | null = null;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  /**
   * Fetch all documents from collection
   */
  async fetchAll(): Promise<T[]> {
    try {
      const q = query(collection(firestore, this.collectionName));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as T));
    } catch (error) {
      console.error(`Error fetching ${this.collectionName}:`, error);
      return [];
    }
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(onUpdate: (items: T[]) => void): () => void {
    const q = query(collection(firestore, this.collectionName));

    this.unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const items = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as T));
        onUpdate(items);
      },
      (error) => {
        console.error(`Error subscribing to ${this.collectionName}:`, error);
      }
    );

    return () => this.unsubscribe?.();
  }

  /**
   * Add or update a document
   */
  async set(id: string, data: Partial<T>): Promise<void> {
    try {
      // Remove undefined values to prevent Firebase errors
      const cleanData = this.removeUndefinedFields(data);

      const docRef = doc(firestore, this.collectionName, id);
      await setDoc(docRef, {
        ...cleanData,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error(`Error setting document in ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Recursively remove undefined fields from an object
   */
  private removeUndefinedFields<T>(obj: T): T {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedFields(item)) as T;
    }

    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const value = obj[key];
          if (value !== undefined) {
            cleaned[key] = this.removeUndefinedFields(value);
          }
        }
      }
      return cleaned as T;
    }

    return obj;
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<void> {
    try {
      const docRef = doc(firestore, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting document from ${this.collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup subscriptions
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
