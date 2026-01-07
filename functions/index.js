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
 * Uses Azure Document Intelligence to extract production schedule data from scanned PDFs
 * Azure's Layout API provides highly accurate table extraction
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

    // Get Azure credentials from environment
    const AZURE_ENDPOINT = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
    const AZURE_KEY = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

    if (!AZURE_ENDPOINT || !AZURE_KEY) {
      console.error("[Parse Schedule] Missing Azure Document Intelligence credentials");
      return {success: false, error: "Azure credentials not configured"};
    }

    console.log(`[Parse Schedule] Processing file: ${fileName} (${mimeType})`);
    console.log(`[Parse Schedule] Using Azure Document Intelligence`);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    console.log(`[Parse Schedule] File size: ${fileBuffer.length} bytes`);

    // Call Azure Document Intelligence Layout API
    // Using the prebuilt-layout model which is excellent for tables
    const analyzeUrl = `${AZURE_ENDPOINT}documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`;

    console.log(`[Parse Schedule] Calling Azure API: ${analyzeUrl}`);

    const analyzeResponse = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": AZURE_KEY,
        "Content-Type": mimeType || "application/pdf",
      },
      body: fileBuffer,
    });

    if (!analyzeResponse.ok) {
      const errorText = await analyzeResponse.text();
      console.error("[Parse Schedule] Azure API Error:", analyzeResponse.status, errorText);
      return {success: false, error: `Azure API error: ${analyzeResponse.status} - ${errorText}`};
    }

    // Get the operation location for polling
    const operationLocation = analyzeResponse.headers.get("Operation-Location");
    if (!operationLocation) {
      console.error("[Parse Schedule] No operation location returned");
      return {success: false, error: "Azure API did not return operation location"};
    }

    console.log(`[Parse Schedule] Operation started: ${operationLocation}`);

    // Poll for results (Azure processes async)
    let result = null;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds max wait

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const pollResponse = await fetch(operationLocation, {
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_KEY,
        },
      });

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        console.error("[Parse Schedule] Poll error:", pollResponse.status, errorText);
        return {success: false, error: `Azure poll error: ${pollResponse.status}`};
      }

      result = await pollResponse.json();
      console.log(`[Parse Schedule] Poll attempt ${attempts + 1}, status: ${result.status}`);

      if (result.status === "succeeded") {
        break;
      } else if (result.status === "failed") {
        console.error("[Parse Schedule] Azure analysis failed:", result.error);
        return {success: false, error: "Document analysis failed"};
      }

      attempts++;
    }

    if (!result || result.status !== "succeeded") {
      return {success: false, error: "Document analysis timed out"};
    }

    console.log("[Parse Schedule] Azure analysis succeeded");

    // Extract data from Azure response
    const analyzeResult = result.analyzeResult;

    // Get all text content for searching
    const fullText = analyzeResult.content || "";
    console.log(`[Parse Schedule] Extracted ${fullText.length} characters of text`);

    // Extract pour date - look for patterns like "Casting Date: MM/DD/YYYY" or just dates
    let pourDate = "";
    const datePatterns = [
      /Casting\s*Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /Pour\s*Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
      /Date[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    ];
    for (const pattern of datePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        pourDate = match[1];
        break;
      }
    }
    console.log(`[Parse Schedule] Detected pour date: ${pourDate}`);

    // Extract bed number - look for "Bed" followed by number
    let bed = null;
    const bedMatch = fullText.match(/Bed\s*[#:]?\s*(\d)/i);
    if (bedMatch) {
      bed = bedMatch[1];
    }
    console.log(`[Parse Schedule] Detected bed: ${bed}`);

    // Extract thickness - look for "Thk" or "Thickness" column values
    let thickness = null;
    const thicknessMatch = fullText.match(/(?:Thk|Thickness)[:\s]*(\d+(?:\.\d+)?)/i);
    if (thicknessMatch) {
      thickness = parseFloat(thicknessMatch[1]);
    }
    console.log(`[Parse Schedule] Detected thickness: ${thickness}`);

    // Process tables from Azure response
    const tables = analyzeResult.tables || [];
    console.log(`[Parse Schedule] Found ${tables.length} tables`);

    const entries = [];

    for (const table of tables) {
      console.log(`[Parse Schedule] Processing table with ${table.rowCount} rows, ${table.columnCount} columns`);

      // Build a 2D array from the table cells
      const tableData = [];
      for (let i = 0; i < table.rowCount; i++) {
        tableData[i] = new Array(table.columnCount).fill("");
      }

      for (const cell of table.cells) {
        tableData[cell.rowIndex][cell.columnIndex] = cell.content || "";
      }

      // Find header row to identify columns
      let headerRowIndex = -1;
      let columnMap = {};

      for (let i = 0; i < Math.min(3, tableData.length); i++) {
        const row = tableData[i];
        const rowText = row.join(" ").toLowerCase();

        // Look for key column headers
        if (rowText.includes("id") || rowText.includes("label") || rowText.includes("mark")) {
          headerRowIndex = i;

          for (let j = 0; j < row.length; j++) {
            const header = row[j].toLowerCase().trim();
            if (header.includes("label") || header.includes("job") || header.includes("mark")) {
              columnMap.label = j;
            } else if (header.includes("id") && !header.includes("width")) {
              columnMap.id = j;
            } else if (header.includes("width") || header === "w") {
              columnMap.width = j;
            } else if (header.includes("thk") || header.includes("thick")) {
              columnMap.thickness = j;
            } else if (header.includes("ft") || header.includes("feet") || header.includes("length")) {
              columnMap.lengthFeet = j;
            } else if (header.includes("in") && !header.includes("min")) {
              columnMap.lengthInches = j;
            }
          }
          break;
        }
      }

      console.log(`[Parse Schedule] Header row: ${headerRowIndex}, Column map:`, columnMap);

      // If we couldn't find headers, try to infer from data patterns
      if (headerRowIndex === -1) {
        // Look for rows with 7-digit numbers (ID numbers)
        for (let i = 0; i < tableData.length; i++) {
          const row = tableData[i];
          for (let j = 0; j < row.length; j++) {
            if (/^\d{7}$/.test(row[j].trim())) {
              columnMap.id = j;
              headerRowIndex = i - 1; // Assume header is row before first data
              break;
            }
          }
          if (columnMap.id !== undefined) break;
        }
      }

      // Process data rows
      const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;

      for (let i = startRow; i < tableData.length; i++) {
        const row = tableData[i];

        // Try to extract ID number (7-digit number)
        let idNumber = "";
        if (columnMap.id !== undefined) {
          idNumber = row[columnMap.id]?.trim() || "";
        }

        // If no ID from column map, search the row for 7-digit number
        if (!idNumber || !/^\d{7}$/.test(idNumber)) {
          for (const cell of row) {
            const match = cell.match(/\b(\d{7})\b/);
            if (match) {
              idNumber = match[1];
              break;
            }
          }
        }

        // Skip rows without valid ID
        if (!idNumber || !/^\d{7}$/.test(idNumber)) {
          continue;
        }

        // Extract job and mark number from label
        let jobNumber = "";
        let markNumber = "";

        if (columnMap.label !== undefined) {
          const label = row[columnMap.label]?.trim() || "";
          const labelMatch = label.match(/(\d+)\s*[-–]\s*([A-Za-z0-9]+)/);
          if (labelMatch) {
            jobNumber = labelMatch[1];
            markNumber = labelMatch[2];
          }
        }

        // If no label column, search the row
        if (!jobNumber) {
          for (const cell of row) {
            const match = cell.match(/(\d{5,6})\s*[-–]\s*([A-Za-z0-9]+)/);
            if (match) {
              jobNumber = match[1];
              markNumber = match[2];
              break;
            }
          }
        }

        // Extract width
        let width = 0;
        if (columnMap.width !== undefined) {
          width = parseFloat(row[columnMap.width]) || 0;
        }

        // Extract length
        let lengthFeet = 0;
        let lengthInches = 0;

        if (columnMap.lengthFeet !== undefined) {
          lengthFeet = parseFloat(row[columnMap.lengthFeet]) || 0;
        }
        if (columnMap.lengthInches !== undefined) {
          lengthInches = parseFloat(row[columnMap.lengthInches]) || 0;
        }

        // Extract thickness from row if available
        let rowThickness = thickness;
        if (columnMap.thickness !== undefined) {
          rowThickness = parseFloat(row[columnMap.thickness]) || thickness;
        }

        // Only add if we have minimum required data
        if (idNumber && jobNumber) {
          entries.push({
            pourDate: pourDate,
            jobNumber: jobNumber,
            markNumber: markNumber,
            idNumber: idNumber,
            width: width,
            thickness: rowThickness || 0,
            length: `${lengthFeet}'-${lengthInches}"`,
            bed: bed || undefined,
          });
        }
      }
    }

    console.log(`[Parse Schedule] Extracted ${entries.length} entries`);

    // Log the entries for debugging
    if (entries.length > 0) {
      console.log("[Parse Schedule] First entry:", JSON.stringify(entries[0]));
      console.log("[Parse Schedule] Last entry:", JSON.stringify(entries[entries.length - 1]));
    }

    return {
      success: true,
      entries,
      pourDate: pourDate,
      bed: bed || undefined,
      thickness: thickness || undefined,
    };

  } catch (error) {
    console.error("[Parse Schedule] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to process schedule",
    };
  }
});
