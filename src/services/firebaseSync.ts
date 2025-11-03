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
      const docRef = doc(firestore, this.collectionName, id);
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error(`Error setting document in ${this.collectionName}:`, error);
      throw error;
    }
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
