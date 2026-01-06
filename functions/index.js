/**
 * Firebase Cloud Functions for Precast QC Tools
 *
 * Provides server-side proxy for Claude API calls to avoid CORS and SSL issues
 */

// Load environment variables from .env.prod file
const fs = require('fs');
const path = require('path');

// Try to load .env.prod file (created during deployment)
const envPath = path.join(__dirname, '.env.prod');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values.length > 0) {
      process.env[key.trim()] = values.join('=').trim();
    }
  });
}

const {onRequest, onCall} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");

const app = initializeApp();
const db = getFirestore(app);

/**
 * Claude Vision Proxy
 * Proxies Anthropic Claude vision API requests from the web app
 * This avoids SSL certificate issues with the client-side proxy
 */
exports.claudeVisionProxy = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60,
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  try {
    const {messages, model = "claude-3-5-sonnet-20241022", temperature = 0.1, max_tokens = 8000} = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({error: "Missing or invalid messages"});
    }

    // Get API key from environment variable
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      console.error("[Claude Vision Proxy] Missing API key");
      return res.status(500).json({
        error: "Anthropic API key not configured",
        details: "Please set ANTHROPIC_API_KEY environment variable"
      });
    }

    console.log("[Claude Vision Proxy] Making request to Anthropic API");

    // Make request to Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Claude Vision Proxy] API Error:", response.status, errorText);
      return res.status(response.status).json({
        error: `Claude API error: ${response.status}`,
        details: errorText,
      });
    }

    const result = await response.json();
    console.log("[Claude Vision Proxy] Success");

    return res.status(200).json(result);
  } catch (error) {
    console.error("[Claude Vision Proxy] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * Bootstrap Admin User
 * Adds a Microsoft 365 user as an admin to Firestore
 * This function bypasses security rules and should only be used for initial setup
 *
 * Usage: POST to this function with body:
 * {
 *   "email": "user@example.com",
 *   "name": "User Name",
 *   "role": "admin"  // optional, defaults to "admin"
 * }
 */
exports.bootstrapAdminUser = onRequest({
  cors: true,
  maxInstances: 1,
  timeoutSeconds: 30,
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  try {
    const {email, name, role = "admin"} = req.body;

    if (!email || !name) {
      return res.status(400).json({error: "Missing required fields: email, name"});
    }

    if (!['admin', 'supervisor', 'user'].includes(role)) {
      return res.status(400).json({error: "Invalid role. Must be admin, supervisor, or user"});
    }

    // Generate userId using same logic as the app
    const userId = email.toLowerCase().replace(/[^a-z0-9]/g, '_');

    console.log(`[Bootstrap Admin] Adding user: ${email} (${name}) as ${role}`);
    console.log(`[Bootstrap Admin] Generated userId: ${userId}`);

    // Create user document in Firestore using Admin SDK (bypasses security rules)
    await db.collection('users').doc(userId).set({
      uid: userId,
      email: email,
      name: name,
      role: role,
      status: 'approved',
      needsPasswordChange: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`[Bootstrap Admin] Successfully added user ${userId}`);

    return res.status(200).json({
      success: true,
      message: `Successfully added ${email} as ${role}`,
      userId: userId,
    });
  } catch (error) {
    console.error("[Bootstrap Admin] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});

/**
 * Parse Schedule PDF
 * Uses Claude Vision API to extract production schedule data from scanned PDFs
 * Falls back to standard document analysis if needed
 */
exports.parseSchedulePDF = onCall({
  maxInstances: 10,
  timeoutSeconds: 120,
  memory: "1GiB",
}, async (request) => {
  try {
    const {fileBase64, fileName, mimeType} = request.data;

    if (!fileBase64) {
      return {success: false, error: "Missing file data"};
    }

    // Get API key from environment variable
    const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

    if (!ANTHROPIC_API_KEY) {
      console.error("[Parse Schedule] Missing Anthropic API key");
      return {success: false, error: "API key not configured"};
    }

    console.log(`[Parse Schedule] Processing file: ${fileName} (${mimeType})`);

    // Determine media type for Claude
    let mediaType = mimeType;
    if (mimeType === 'application/pdf') {
      // Claude can handle PDFs directly
      mediaType = 'application/pdf';
    } else if (!mimeType.startsWith('image/')) {
      mediaType = 'image/png'; // Default fallback
    }

    // Build the prompt for schedule extraction
    const extractionPrompt = `You are analyzing a scanned production schedule for precast concrete pieces.

CRITICAL: Extract data with 100% accuracy. Every character matters, especially ID numbers.

Look for and extract:
1. **Casting Date / Pour Date** - Usually at top, format like "Casting Date: MM/DD/YYYY"
2. **Bed Number** - Often a handwritten circled number at the top of the page
3. **Thickness (Thk)** - Column showing piece thickness in inches (e.g., 12)
4. **Table rows** with these columns:
   - Label: Contains Job#-Mark# (e.g., "255158-H307"). May span two lines.
   - ID#: 7-digit unique identifier (e.g., 1369814)
   - Width: Width in inches (e.g., 48)
   - Design Length: Feet and Inches columns (e.g., 24 feet, 7 inches = "24'-7\\"")

IMPORTANT RULES:
- The Label column may have Job#-Mark# split across TWO lines. Combine them.
- Job# is BEFORE the hyphen, Mark# is AFTER the hyphen
- Length should be formatted as: feet'-inches" (e.g., "24'-7.75\\"")
- All ID#s should be exactly as shown - do not guess or interpolate

Return a JSON object with this exact structure:
{
  "pourDate": "MM/DD/YYYY",
  "bed": "1" to "6" or null if not visible,
  "thickness": number (inches) or null,
  "entries": [
    {
      "jobNumber": "255158",
      "markNumber": "H307",
      "idNumber": "1369814",
      "width": 48,
      "lengthFeet": 24,
      "lengthInches": 7.75
    }
  ]
}

Return ONLY valid JSON, no other text.`;

    // Make request to Anthropic API with vision
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 16000,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: mediaType === 'application/pdf' ? 'document' : 'image',
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: fileBase64,
                },
              },
              {
                type: "text",
                text: extractionPrompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Parse Schedule] API Error:", response.status, errorText);
      return {success: false, error: `API error: ${response.status}`};
    }

    const result = await response.json();
    console.log("[Parse Schedule] Got response from Claude");

    // Extract the text content from Claude's response
    const textContent = result.content?.find(c => c.type === 'text')?.text;
    if (!textContent) {
      console.error("[Parse Schedule] No text content in response");
      return {success: false, error: "No response from vision API"};
    }

    // Parse the JSON from Claude's response
    let parsedData;
    try {
      // Try to extract JSON from the response (Claude sometimes adds markdown)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        parsedData = JSON.parse(textContent);
      }
    } catch (parseError) {
      console.error("[Parse Schedule] JSON parse error:", parseError);
      console.log("[Parse Schedule] Raw response:", textContent.substring(0, 500));
      return {success: false, error: "Failed to parse extracted data"};
    }

    // Validate and transform the data
    const entries = (parsedData.entries || []).map(entry => ({
      pourDate: parsedData.pourDate || "",
      jobNumber: String(entry.jobNumber || "").trim(),
      markNumber: String(entry.markNumber || "").trim(),
      idNumber: String(entry.idNumber || "").trim(),
      width: Number(entry.width) || 0,
      thickness: Number(parsedData.thickness) || 0,
      length: `${entry.lengthFeet || 0}'-${entry.lengthInches || 0}"`,
      bed: parsedData.bed || undefined,
    })).filter(entry => entry.idNumber && entry.jobNumber); // Filter out invalid entries

    console.log(`[Parse Schedule] Extracted ${entries.length} entries`);

    return {
      success: true,
      entries,
      pourDate: parsedData.pourDate || "",
      bed: parsedData.bed || undefined,
      thickness: parsedData.thickness || undefined,
    };

  } catch (error) {
    console.error("[Parse Schedule] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to process schedule",
    };
  }
});
