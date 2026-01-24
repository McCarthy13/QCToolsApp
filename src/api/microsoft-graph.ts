/**
 * Microsoft Graph API Integration
 *
 * This module handles authentication and email sending via Microsoft Graph API.
 * Emails sent through this API will appear in the user's Outlook Sent folder.
 *
 * Uses MSAL (same as SharePoint integration) for consistent authentication.
 */

import { PublicClientApplication, AccountInfo, InteractionRequiredAuthError } from '@azure/msal-browser';
import { Platform } from 'react-native';

// MSAL configuration - same as SharePoint but with Mail.Send scope
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

// Scopes required for sending email
const emailRequest = {
  scopes: [
    'User.Read',
    'Mail.Send',
  ],
};

const GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0";

let msalInstance: PublicClientApplication | null = null;

interface EmailParams {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
}

// Initialize MSAL
async function initializeMSAL(): Promise<PublicClientApplication> {
  if (msalInstance) {
    return msalInstance;
  }

  if (Platform.OS !== 'web') {
    throw new Error('Email sending via Microsoft is only available on web platform');
  }

  msalInstance = new PublicClientApplication(msalConfig);
  await msalInstance.initialize();
  return msalInstance;
}

/**
 * Authenticate with Microsoft and get access token
 */
export async function authenticateWithMicrosoft(): Promise<AccountInfo> {
  try {
    const msal = await initializeMSAL();

    // Try to acquire token silently first
    const accounts = msal.getAllAccounts();
    if (accounts.length > 0) {
      try {
        const response = await msal.acquireTokenSilent({
          ...emailRequest,
          account: accounts[0],
        });
        return response.account;
      } catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          // Fall through to interactive login
          console.log('[MicrosoftGraph] Silent token acquisition failed, showing login popup');
        } else {
          throw error;
        }
      }
    }

    // Interactive login with popup
    const response = await msal.loginPopup({
      ...emailRequest,
      prompt: 'select_account',
    });

    console.log('[MicrosoftGraph] Login successful, account:', response.account.username);
    return response.account;
  } catch (error: any) {
    // Check if user cancelled
    if (error.errorCode === 'user_cancelled' || error.errorMessage?.includes('cancelled')) {
      const cancelError = new Error("Authentication was cancelled");
      cancelError.name = "AuthCancelledError";
      throw cancelError;
    }
    console.error('[MicrosoftGraph] Sign in error:', error);
    throw new Error(`Failed to sign in to Microsoft: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get access token for Microsoft Graph API (with Mail.Send scope)
 */
async function getAccessToken(): Promise<string> {
  try {
    const msal = await initializeMSAL();
    const accounts = msal.getAllAccounts();

    if (accounts.length === 0) {
      throw new Error('No account found. Please sign in first.');
    }

    const response = await msal.acquireTokenSilent({
      ...emailRequest,
      account: accounts[0],
    });

    return response.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const msal = await initializeMSAL();
      const response = await msal.acquireTokenPopup(emailRequest);
      return response.accessToken;
    }
    throw error;
  }
}

/**
 * Send email via Microsoft Graph API
 *
 * The email will be sent from the authenticated user's account and will
 * appear in their Outlook Sent folder automatically.
 */
export async function sendEmailViaGraphAPI(params: EmailParams): Promise<void> {
  try {
    const accessToken = await getAccessToken();

    // Prepare recipients
    const toRecipients = params.to.split(",").map((email) => ({
      emailAddress: {
        address: email.trim(),
      },
    }));

    const ccRecipients = params.cc
      ? params.cc.split(",").map((email) => ({
          emailAddress: {
            address: email.trim(),
          },
        }))
      : undefined;

    // Prepare email message with HTML body
    const message = {
      message: {
        subject: params.subject,
        body: {
          contentType: "HTML", // Changed to HTML to support formatting
          content: params.body,
        },
        toRecipients: toRecipients,
        ccRecipients: ccRecipients,
      },
      saveToSentItems: true, // Important: This saves to Sent folder
    };

    // Send email via Graph API
    const response = await fetch(`${GRAPH_API_ENDPOINT}/me/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // Success - no response body for sendMail endpoint
    console.log("[MicrosoftGraph] Email sent successfully via Graph API");
  } catch (error: any) {
    console.error("[MicrosoftGraph] Send email error:", error);
    throw error;
  }
}

/**
 * Check if user is authenticated for email sending
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    if (Platform.OS !== 'web') {
      return false;
    }

    const msal = await initializeMSAL();
    const accounts = msal.getAllAccounts();

    if (accounts.length === 0) {
      return false;
    }

    // Try to acquire token silently to verify we have Mail.Send permission
    try {
      await msal.acquireTokenSilent({
        ...emailRequest,
        account: accounts[0],
      });
      return true;
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Sign out and clear stored tokens
 */
export async function signOutMicrosoft(): Promise<void> {
  try {
    const msal = await initializeMSAL();
    const accounts = msal.getAllAccounts();

    if (accounts.length > 0) {
      msal.setActiveAccount(null);
      await msal.clearCache();
      console.log('[MicrosoftGraph] Signed out from Microsoft');
    }
  } catch (error) {
    console.error('[MicrosoftGraph] Sign out error:', error);
  }
}
