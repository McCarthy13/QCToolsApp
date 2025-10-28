/**
 * Microsoft Graph API Integration
 * 
 * This module handles authentication and email sending via Microsoft Graph API.
 * Emails sent through this API will appear in the user's Outlook Sent folder.
 * 
 * SETUP REQUIRED:
 * 1. Register an app in Azure AD (portal.azure.com)
 * 2. Add redirect URI: exp://[your-app-slug]/--/redirect
 * 3. Grant API permissions: Mail.Send (delegated)
 * 4. Add your Azure AD app credentials to .env file
 */

import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Enable browser dismiss on iOS
WebBrowser.maybeCompleteAuthSession();

// Microsoft Graph API configuration
// TODO: These need to be configured in your .env file or Azure AD app registration
const AZURE_AD_CONFIG = {
  clientId: process.env.EXPO_PUBLIC_AZURE_AD_CLIENT_ID || "YOUR_CLIENT_ID_HERE",
  tenantId: process.env.EXPO_PUBLIC_AZURE_AD_TENANT_ID || "common", // Use "common" for multi-tenant or your specific tenant ID
  redirectUri: AuthSession.makeRedirectUri({
    scheme: "exp", // Change to your custom scheme if needed
  }),
  scopes: ["Mail.Send", "User.Read"], // Mail.Send allows sending emails, User.Read for user info
};

const GRAPH_API_ENDPOINT = "https://graph.microsoft.com/v1.0";
const TOKEN_STORAGE_KEY = "microsoft_graph_token";

interface GraphAPIToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

interface EmailParams {
  from: string;
  to: string;
  cc?: string;
  subject: string;
  body: string;
}

/**
 * Authenticate with Microsoft and get access token
 */
export async function authenticateWithMicrosoft(): Promise<GraphAPIToken> {
  try {
    const discovery = {
      authorizationEndpoint: `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}/oauth2/v2.0/authorize`,
      tokenEndpoint: `https://login.microsoftonline.com/${AZURE_AD_CONFIG.tenantId}/oauth2/v2.0/token`,
    };

    const request = new AuthSession.AuthRequest({
      clientId: AZURE_AD_CONFIG.clientId,
      scopes: AZURE_AD_CONFIG.scopes,
      redirectUri: AZURE_AD_CONFIG.redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    });

    const result = await request.promptAsync(discovery);

    if (result.type === "success") {
      const { code } = result.params;

      // Exchange code for tokens
      const tokenResponse = await fetch(discovery.tokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: AZURE_AD_CONFIG.clientId,
          code: code,
          redirect_uri: AZURE_AD_CONFIG.redirectUri,
          grant_type: "authorization_code",
          code_verifier: request.codeVerifier || "",
        }).toString(),
      });

      const tokens = await tokenResponse.json();

      if (tokens.error) {
        throw new Error(tokens.error_description || tokens.error);
      }

      const tokenData: GraphAPIToken = {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + tokens.expires_in * 1000,
      };

      // Store tokens securely
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokenData));

      return tokenData;
    } else if (result.type === "error") {
      throw new Error(result.params.error_description || "Authentication failed");
    } else {
      // User cancelled - don't log as error, just throw for caller to handle
      const cancelError = new Error("Authentication was cancelled");
      cancelError.name = "AuthCancelledError";
      throw cancelError;
    }
  } catch (error: any) {
    // Only log errors that aren't user cancellations
    if (error.name !== "AuthCancelledError") {
      console.error("Microsoft authentication error:", error);
    }
    throw error;
  }
}

/**
 * Get stored access token or refresh if expired
 */
async function getValidAccessToken(): Promise<string> {
  try {
    const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);

    if (!storedToken) {
      throw new Error("No authentication token found. Please sign in.");
    }

    const tokenData: GraphAPIToken = JSON.parse(storedToken);

    // Check if token is expired (with 5 minute buffer)
    if (Date.now() >= tokenData.expiresAt - 5 * 60 * 1000) {
      // Token expired or about to expire, need to re-authenticate
      // In a production app, you'd use the refresh token here
      throw new Error("Token expired. Please sign in again.");
    }

    return tokenData.accessToken;
  } catch (error) {
    console.error("Token retrieval error:", error);
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
    const accessToken = await getValidAccessToken();

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

    // Prepare email message
    const message = {
      message: {
        subject: params.subject,
        body: {
          contentType: "Text",
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
    console.log("Email sent successfully via Graph API");
  } catch (error: any) {
    console.error("Graph API send email error:", error);
    
    // Check if it's an authentication error
    if (error.message?.includes("token") || error.message?.includes("authentication")) {
      // Clear invalid token
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    }
    
    throw error;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const storedToken = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    if (!storedToken) return false;

    const tokenData: GraphAPIToken = JSON.parse(storedToken);
    return Date.now() < tokenData.expiresAt;
  } catch {
    return false;
  }
}

/**
 * Sign out and clear stored tokens
 */
export async function signOutMicrosoft(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
}
