import { PublicClientApplication, AccountInfo, InteractionRequiredAuthError } from '@azure/msal-browser';
import { Client } from '@microsoft/microsoft-graph-client';
import { Platform } from 'react-native';

// MSAL configuration
const msalConfig = {
  auth: {
    clientId: process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.EXPO_PUBLIC_MICROSOFT_TENANT_ID || 'common'}`,
    redirectUri: Platform.OS === 'web'
      ? window.location.origin
      : 'msauth://com.vibecodeapp.precast-qc-tools/auth',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    allowRedirectInIframe: false,
    windowHashTimeout: 60000,
    iframeHashTimeout: 6000,
    loadFrameTimeout: 0,
  },
};

// SharePoint configuration
const SHAREPOINT_CONFIG = {
  siteUrl: process.env.EXPO_PUBLIC_SHAREPOINT_SITE_URL || '',
  library: process.env.EXPO_PUBLIC_SHAREPOINT_LIBRARY || 'Shared Documents',
  folderPath: process.env.EXPO_PUBLIC_SHAREPOINT_FOLDER_PATH || '',
};

// Required scopes for SharePoint access
const loginRequest = {
  scopes: [
    'User.Read',
    'Files.ReadWrite.All',
    'Sites.ReadWrite.All',
  ],
};

let msalInstance: PublicClientApplication | null = null;

// Initialize MSAL
async function initializeMSAL(): Promise<PublicClientApplication> {
  if (msalInstance) {
    return msalInstance;
  }

  if (Platform.OS !== 'web') {
    throw new Error('SharePoint integration is only available on web platform');
  }

  msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();
  return msalInstance;
}

// Sign in with Microsoft 365
export async function signInToMicrosoft(): Promise<AccountInfo> {
  try {
    const msal = await initializeMSAL();

    // Try to acquire token silently first
    const accounts = msal.getAllAccounts();
    if (accounts.length > 0) {
      try {
        const response = await msal.acquireTokenSilent({
          ...loginRequest,
          account: accounts[0],
        });
        return response.account;
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          // Fall through to interactive login
          console.log('[SharePoint] Silent token acquisition failed, showing login popup');
        } else {
          throw error;
        }
      }
    }

    // Interactive login with popup - use redirect instead to avoid popup issues
    const response = await msal.loginPopup({
      ...loginRequest,
      prompt: 'select_account',
    });

    // Close the popup explicitly if it's still open
    console.log('[SharePoint] Login successful, account:', response.account.username);

    return response.account;
  } catch (error) {
    console.error('[SharePoint] Sign in error:', error);
    throw new Error(`Failed to sign in to Microsoft 365: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get access token for Microsoft Graph API
async function getAccessToken(): Promise<string> {
  try {
    const msal = await initializeMSAL();
    const accounts = msal.getAllAccounts();

    if (accounts.length === 0) {
      throw new Error('No account found. Please sign in first.');
    }

    const response = await msal.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });

    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const msal = await initializeMSAL();
      const response = await msal.acquireTokenPopup(loginRequest);
      return response.accessToken;
    }
    throw error;
  }
}

// Check if user is signed in
export async function isSignedInToMicrosoft(): Promise<boolean> {
  try {
    if (Platform.OS !== 'web') {
      return false;
    }

    const msal = await initializeMSAL();
    const accounts = msal.getAllAccounts();
    return accounts.length > 0;
  } catch (error) {
    console.error('[SharePoint] Error checking sign-in status:', error);
    return false;
  }
}

// Get current user account
export async function getCurrentMicrosoftAccount(): Promise<AccountInfo | null> {
  try {
    const msal = await initializeMSAL();
    const accounts = msal.getAllAccounts();
    return accounts.length > 0 ? accounts[0] : null;
  } catch (error) {
    console.error('[SharePoint] Error getting current account:', error);
    return null;
  }
}

// Sign out
export async function signOutFromMicrosoft(): Promise<void> {
  try {
    const msal = await initializeMSAL();
    const accounts = msal.getAllAccounts();

    // Clear local cache for all accounts silently (no popup)
    if (accounts.length > 0) {
      for (const account of accounts) {
        msal.setActiveAccount(null);
        // Clear the cache for this account
        await msal.clearCache();
      }
      console.log('[SharePoint] Signed out from Microsoft (cleared cache)');
    }
  } catch (error) {
    console.error('[SharePoint] Sign out error:', error);
    // Don't throw - sign out should be best effort
  }
}

// Re-authenticate with Microsoft (forces user to enter credentials again)
// Returns true if the same user re-authenticated successfully, false otherwise
export async function reAuthenticateWithMicrosoft(): Promise<{ success: boolean; error?: string }> {
  try {
    if (Platform.OS !== 'web') {
      return { success: false, error: 'Re-authentication is only available on web platform' };
    }

    const msal = await initializeMSAL();
    const accounts = msal.getAllAccounts();

    if (accounts.length === 0) {
      return { success: false, error: 'No account found. Please sign in first.' };
    }

    const currentAccount = accounts[0];
    const currentUsername = currentAccount.username;

    // Force login prompt - user must enter credentials
    const response = await msal.loginPopup({
      ...loginRequest,
      prompt: 'login', // Forces credential entry
      loginHint: currentUsername, // Pre-fill the email
    });

    // Verify the same user re-authenticated
    if (response.account.username.toLowerCase() !== currentUsername.toLowerCase()) {
      console.warn('[SharePoint] Different user authenticated:', response.account.username, 'vs', currentUsername);
      return { success: false, error: 'Please sign in with the same account you are currently logged in with.' };
    }

    console.log('[SharePoint] Re-authentication successful for:', response.account.username);
    return { success: true };
  } catch (error) {
    console.error('[SharePoint] Re-authentication error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Re-authentication failed'
    };
  }
}

// Create Microsoft Graph client
async function getGraphClient(): Promise<Client> {
  const accessToken = await getAccessToken();

  return Client.init({
    authProvider: (done: (error: any, token: string | null) => void) => {
      done(null, accessToken);
    },
  });
}

// Extract site ID from SharePoint site URL
async function getSiteId(): Promise<string> {
  try {
    const client = await getGraphClient();
    const siteUrl = SHAREPOINT_CONFIG.siteUrl;

    // Parse the site URL to get hostname and site path
    const url = new URL(siteUrl);
    const hostname = url.hostname;
    const sitePath = url.pathname;

    // Get site by URL
    const site = await client
      .api(`/sites/${hostname}:${sitePath}`)
      .get();

    return site.id;
  } catch (error) {
    console.error('[SharePoint] Error getting site ID:', error);
    throw new Error(`Failed to get SharePoint site: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Get drive ID for the document library
async function getDriveId(siteId: string): Promise<string> {
  try {
    const client = await getGraphClient();
    const libraryName = SHAREPOINT_CONFIG.library;

    // Get all drives (document libraries) in the site
    const drives = await client
      .api(`/sites/${siteId}/drives`)
      .get();

    // Log all available drives for debugging
    console.log('[SharePoint] Available drives:', drives.value.map((d: any) => ({ name: d.name, id: d.id })));

    // Try multiple name variations
    const possibleNames = [
      libraryName,
      'Documents',
      'Shared Documents',
      'Documentos compartidos', // Spanish
      'Documents partagés', // French
    ];

    // Find the drive by trying different name variations
    let drive = null;
    for (const name of possibleNames) {
      drive = drives.value.find((d: any) => d.name === name);
      if (drive) {
        console.log('[SharePoint] Found drive with name:', name);
        break;
      }
    }

    if (!drive) {
      const availableNames = drives.value.map((d: any) => d.name).join(', ');
      throw new Error(`Document library "${libraryName}" not found. Available libraries: ${availableNames}`);
    }

    return drive.id;
  } catch (error) {
    console.error('[SharePoint] Error getting drive ID:', error);
    throw new Error(`Failed to get document library: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Check if folder exists, create if it doesn't
async function ensureFolderExists(
  siteId: string,
  driveId: string,
  folderName: string
): Promise<string> {
  try {
    const client = await getGraphClient();
    const basePath = SHAREPOINT_CONFIG.folderPath;
    const fullPath = `${basePath}/${folderName}`.replace(/\/+/g, '/');

    // Try to get the folder first
    try {
      const folder = await client
        .api(`/sites/${siteId}/drives/${driveId}/root:${fullPath}`)
        .get();

      console.log('[SharePoint] Folder already exists:', folderName);
      return folder.id;
    } catch (error: any) {
      // If folder doesn't exist (404), create it
      if (error?.statusCode === 404) {
        console.log('[SharePoint] Creating new folder:', folderName);

        const newFolder = await client
          .api(`/sites/${siteId}/drives/${driveId}/root:${basePath}:/children`)
          .post({
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          });

        console.log('[SharePoint] Folder created successfully:', folderName);
        return newFolder.id;
      }
      throw error;
    }
  } catch (error) {
    console.error('[SharePoint] Error ensuring folder exists:', error);
    throw new Error(`Failed to create/find folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Upload PDF file to SharePoint folder
export async function uploadPDFToSharePoint(
  pdfBlob: Blob,
  fileName: string,
  folderName: string
): Promise<string> {
  try {
    console.log('[SharePoint] Starting upload...', { fileName, folderName });

    // Get site and drive IDs
    const siteId = await getSiteId();
    console.log('[SharePoint] Site ID:', siteId);

    const driveId = await getDriveId(siteId);
    console.log('[SharePoint] Drive ID:', driveId);

    // Ensure folder exists
    const folderId = await ensureFolderExists(siteId, driveId, folderName);
    console.log('[SharePoint] Folder ID:', folderId);

    // Upload file to the folder
    const client = await getGraphClient();
    const basePath = SHAREPOINT_CONFIG.folderPath;
    const filePath = `${basePath}/${folderName}/${fileName}`.replace(/\/+/g, '/');

    console.log('[SharePoint] Uploading file to:', filePath);

    const uploadResult = await client
      .api(`/sites/${siteId}/drives/${driveId}/root:${filePath}:/content`)
      .put(pdfBlob);

    console.log('[SharePoint] Upload successful');

    // Return the web URL to the file
    return uploadResult.webUrl;
  } catch (error) {
    console.error('[SharePoint] Upload error:', error);
    throw new Error(`Failed to upload to SharePoint: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to generate folder name from job details
// Format: Last 4 digits of job # - Mark # - ID #
// Example: 5166-H110-1367274
export function generateFolderName(
  jobNumber: string,
  markNumber: string,
  idNumber: string
): string {
  // Extract last 4 digits of job number
  const last4Digits = jobNumber.replace(/\D/g, '').slice(-4);

  // Clean up mark and ID numbers (remove extra spaces)
  const cleanMark = markNumber.trim();
  const cleanId = idNumber.trim();

  return `${last4Digits}-${cleanMark}-${cleanId}`;
}

// Helper function to get SharePoint folder URL
export function getSharePointFolderUrl(folderName: string): string {
  const siteUrl = SHAREPOINT_CONFIG.siteUrl;
  const basePath = SHAREPOINT_CONFIG.folderPath;
  const encodedPath = encodeURIComponent(`${basePath}/${folderName}`);

  return `${siteUrl}/${SHAREPOINT_CONFIG.library}/Forms/AllItems.aspx?id=${encodedPath}`;
}

// ============================================================================
// Excel/Engineering Backlog Data Integration
// ============================================================================

// Cache for engineering data to avoid repeated API calls
interface EngineerLookupCache {
  data: Map<string, string>; // projectNumber -> engineer
  lastFetched: number;
  expiresIn: number; // milliseconds
}

let engineerCache: EngineerLookupCache | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Excel file configuration
const EXCEL_CONFIG = {
  fileName: '2026_Quality_Log-Extruded_VERSION_9.xlsx',
  worksheetName: 'EngineeringBacklogData',
  projectNumberColumn: 'A', // Job Contact Data[Project #]
  engineerColumn: 'C', // Job Contact Data[Engineer]
  dataStartRow: 4, // Data starts at row 4 (after headers)
};

/**
 * Fetch engineering backlog data from Excel worksheet in SharePoint
 * Returns a Map of project number -> engineer name
 */
export async function fetchEngineeringBacklogData(): Promise<Map<string, string>> {
  try {
    // Check cache first
    if (engineerCache && Date.now() - engineerCache.lastFetched < engineerCache.expiresIn) {
      console.log('[SharePoint] Using cached engineering data');
      return engineerCache.data;
    }

    console.log('[SharePoint] Fetching engineering backlog data from Excel...');

    const client = await getGraphClient();
    const siteId = await getSiteId();
    const driveId = await getDriveId(siteId);

    // Find the Excel file in SharePoint
    // Search in the root and common folders
    const searchPaths = [
      `/root:/${EXCEL_CONFIG.fileName}`,
      `/root:/Quality Control/${EXCEL_CONFIG.fileName}`,
      `/root:/QC/${EXCEL_CONFIG.fileName}`,
    ];

    let fileId: string | null = null;

    for (const path of searchPaths) {
      try {
        const file = await client
          .api(`/sites/${siteId}/drives/${driveId}${path}`)
          .get();
        fileId = file.id;
        console.log('[SharePoint] Found Excel file at:', path);
        break;
      } catch (e: any) {
        if (e.statusCode !== 404) {
          console.warn('[SharePoint] Error searching path:', path, e.message);
        }
      }
    }

    // If not found in common paths, search the drive
    if (!fileId) {
      console.log('[SharePoint] Searching for Excel file in drive...');
      const searchResult = await client
        .api(`/sites/${siteId}/drives/${driveId}/root/search(q='${EXCEL_CONFIG.fileName}')`)
        .get();

      if (searchResult.value && searchResult.value.length > 0) {
        fileId = searchResult.value[0].id;
        console.log('[SharePoint] Found Excel file via search');
      }
    }

    if (!fileId) {
      throw new Error(`Excel file "${EXCEL_CONFIG.fileName}" not found in SharePoint`);
    }

    // Read the worksheet data using Microsoft Graph Excel API
    // Get the used range of the worksheet
    const worksheetData = await client
      .api(`/sites/${siteId}/drives/${driveId}/items/${fileId}/workbook/worksheets('${EXCEL_CONFIG.worksheetName}')/usedRange`)
      .get();

    const rows = worksheetData.values;
    const engineerMap = new Map<string, string>();

    // Process rows (skip header rows - data starts at row 4, index 3)
    for (let i = EXCEL_CONFIG.dataStartRow - 1; i < rows.length; i++) {
      const row = rows[i];
      const projectNumber = row[0]?.toString().trim(); // Column A
      const engineer = row[2]?.toString().trim(); // Column C

      if (projectNumber && engineer) {
        engineerMap.set(projectNumber, engineer);
      }
    }

    console.log(`[SharePoint] Loaded ${engineerMap.size} project-engineer mappings`);

    // Update cache
    engineerCache = {
      data: engineerMap,
      lastFetched: Date.now(),
      expiresIn: CACHE_DURATION,
    };

    return engineerMap;
  } catch (error) {
    console.error('[SharePoint] Error fetching engineering backlog data:', error);
    throw new Error(`Failed to fetch engineering data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Look up engineer for a specific job number
 * Returns the engineer name or null if not found
 */
export async function lookupEngineerByJobNumber(jobNumber: string): Promise<string | null> {
  try {
    if (!jobNumber) return null;

    const cleanJobNumber = jobNumber.trim();
    const engineerMap = await fetchEngineeringBacklogData();

    // Direct lookup
    if (engineerMap.has(cleanJobNumber)) {
      return engineerMap.get(cleanJobNumber) || null;
    }

    // Try numeric comparison (in case of formatting differences)
    const numericJobNumber = cleanJobNumber.replace(/\D/g, '');
    for (const [projectNum, engineer] of engineerMap.entries()) {
      if (projectNum.replace(/\D/g, '') === numericJobNumber) {
        return engineer;
      }
    }

    console.log(`[SharePoint] No engineer found for job number: ${jobNumber}`);
    return null;
  } catch (error) {
    console.error('[SharePoint] Error looking up engineer:', error);
    return null;
  }
}

/**
 * Batch lookup engineers for multiple job numbers
 * Returns a Map of jobNumber -> engineer
 */
export async function batchLookupEngineers(jobNumbers: string[]): Promise<Map<string, string>> {
  const results = new Map<string, string>();

  try {
    const engineerMap = await fetchEngineeringBacklogData();

    for (const jobNumber of jobNumbers) {
      const cleanJobNumber = jobNumber.trim();

      // Direct lookup
      if (engineerMap.has(cleanJobNumber)) {
        results.set(jobNumber, engineerMap.get(cleanJobNumber)!);
        continue;
      }

      // Try numeric comparison
      const numericJobNumber = cleanJobNumber.replace(/\D/g, '');
      for (const [projectNum, engineer] of engineerMap.entries()) {
        if (projectNum.replace(/\D/g, '') === numericJobNumber) {
          results.set(jobNumber, engineer);
          break;
        }
      }
    }

    console.log(`[SharePoint] Batch lookup: ${results.size}/${jobNumbers.length} engineers found`);
  } catch (error) {
    console.error('[SharePoint] Error in batch lookup:', error);
  }

  return results;
}

/**
 * Clear the engineering data cache
 * Call this when you want to force a refresh
 */
export function clearEngineerCache(): void {
  engineerCache = null;
  console.log('[SharePoint] Engineer cache cleared');
}
