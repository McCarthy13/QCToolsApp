import { firestore } from '../config/firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  setDoc
} from 'firebase/firestore';

export interface ImportData {
  exportDate?: string;
  appVersion?: string;
  strandPatterns?: any[];
  products?: any[];
  strandLibrary?: any[];
  aggregateLibrary?: any[];
  admixLibrary?: any[];
  projects?: any[];
  contacts?: any[];
  qualityLogs?: any[];
  pourSchedules?: any[];
  yardLocations?: any;
  aggregateGradations?: any;
  slippageHistory?: any;
  calculatorHistory?: any[];
}

export interface ImportResult {
  success: boolean;
  error?: string;
  imported?: {
    strandPatterns: number;
    products: number;
    strandLibrary: number;
    aggregateLibrary: number;
    admixLibrary: number;
    projects: number;
    contacts: number;
    qualityLogs: number;
    pourSchedules: number;
    yardLocations: number;
  };
}

/**
 * Import all data from JSON export to Firebase
 */
export const importDataToFirebase = async (
  data: ImportData,
  userId: string
): Promise<ImportResult> => {
  try {
    const counts = {
      strandPatterns: 0,
      products: 0,
      strandLibrary: 0,
      aggregateLibrary: 0,
      admixLibrary: 0,
      projects: 0,
      contacts: 0,
      qualityLogs: 0,
      pourSchedules: 0,
      yardLocations: 0,
    };

    // Import strand patterns
    if (data.strandPatterns && data.strandPatterns.length > 0) {
      counts.strandPatterns = await importCollection(
        'strandPatterns',
        data.strandPatterns,
        userId
      );
    }

    // Import products
    if (data.products && data.products.length > 0) {
      counts.products = await importCollection(
        'products',
        data.products,
        userId
      );
    }

    // Import strand library
    if (data.strandLibrary && data.strandLibrary.length > 0) {
      counts.strandLibrary = await importCollection(
        'strandLibrary',
        data.strandLibrary,
        userId
      );
    }

    // Import aggregate library
    if (data.aggregateLibrary && data.aggregateLibrary.length > 0) {
      counts.aggregateLibrary = await importCollection(
        'aggregateLibrary',
        data.aggregateLibrary,
        userId
      );
    }

    // Import admix library
    if (data.admixLibrary && data.admixLibrary.length > 0) {
      counts.admixLibrary = await importCollection(
        'admixLibrary',
        data.admixLibrary,
        userId
      );
    }

    // Import projects
    if (data.projects && data.projects.length > 0) {
      counts.projects = await importCollection(
        'projects',
        data.projects,
        userId
      );
    }

    // Import contacts
    if (data.contacts && data.contacts.length > 0) {
      counts.contacts = await importCollection(
        'contacts',
        data.contacts,
        userId
      );
    }

    // Import quality logs
    if (data.qualityLogs && data.qualityLogs.length > 0) {
      counts.qualityLogs = await importCollection(
        'qualityLogs',
        data.qualityLogs,
        userId
      );
    }

    // Import pour schedules
    if (data.pourSchedules && data.pourSchedules.length > 0) {
      counts.pourSchedules = await importCollection(
        'pourSchedules',
        data.pourSchedules,
        userId
      );
    }

    // Import yard locations (special case - single document with arrays)
    if (data.yardLocations) {
      await importYardLocations(data.yardLocations, userId);
      counts.yardLocations = 1;
    }

    return {
      success: true,
      imported: counts,
    };
  } catch (error: any) {
    console.error('Import error:', error);
    return {
      success: false,
      error: error.message || 'Import failed',
    };
  }
};

/**
 * Import a collection of documents using batched writes
 */
const importCollection = async (
  collectionName: string,
  items: any[],
  userId: string
): Promise<number> => {
  let count = 0;
  const batchSize = 500; // Firestore batch limit

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = writeBatch(firestore);
    const batchItems = items.slice(i, i + batchSize);

    for (const item of batchItems) {
      const docId = item.id || doc(collection(firestore, collectionName)).id;
      const docRef = doc(firestore, collectionName, docId);

      // Prepare the document data
      const docData = {
        ...item,
        importedAt: serverTimestamp(),
        importedBy: userId,
        // Convert timestamp fields if they exist
        createdAt: item.createdAt
          ? Timestamp.fromMillis(item.createdAt)
          : serverTimestamp(),
        updatedAt: item.updatedAt
          ? Timestamp.fromMillis(item.updatedAt)
          : serverTimestamp(),
      };

      batch.set(docRef, docData, { merge: true });
      count++;
    }

    await batch.commit();
  }

  return count;
};

/**
 * Import yard locations (special structure)
 */
const importYardLocations = async (
  yardData: any,
  userId: string
): Promise<void> => {
  const docRef = doc(firestore, 'yardLocations', 'main');

  await setDoc(docRef, {
    yardLocations: yardData.yardLocations || [],
    yardedPieces: yardData.yardedPieces || [],
    importedAt: serverTimestamp(),
    importedBy: userId,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

/**
 * Validate JSON structure before import
 */
export const validateImportData = (jsonString: string): { valid: boolean; data?: ImportData; error?: string } => {
  try {
    const data = JSON.parse(jsonString);

    // Basic validation
    if (typeof data !== 'object' || data === null) {
      return { valid: false, error: 'Invalid JSON structure' };
    }

    // Check if at least one collection exists
    const hasData =
      (data.strandPatterns && data.strandPatterns.length > 0) ||
      (data.products && data.products.length > 0) ||
      (data.strandLibrary && data.strandLibrary.length > 0) ||
      (data.aggregateLibrary && data.aggregateLibrary.length > 0) ||
      (data.admixLibrary && data.admixLibrary.length > 0) ||
      (data.projects && data.projects.length > 0) ||
      (data.contacts && data.contacts.length > 0) ||
      (data.qualityLogs && data.qualityLogs.length > 0) ||
      (data.pourSchedules && data.pourSchedules.length > 0) ||
      (data.yardLocations);

    if (!hasData) {
      return { valid: false, error: 'No data found to import' };
    }

    return { valid: true, data };
  } catch (error: any) {
    return { valid: false, error: `Invalid JSON: ${error.message}` };
  }
};
