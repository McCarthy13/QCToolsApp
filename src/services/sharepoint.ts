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

    // Interactive login with popup
    const response = await msal.loginPopup(loginRequest);
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
    if (accounts.length > 0) {
      await msal.logoutPopup({ account: accounts[0] });
    }
  } catch (error) {
    console.error('[SharePoint] Sign out error:', error);
    throw error;
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
