/**
 * Firebase Cloud Functions for Precast QC Tools
 * Version: 2.2.0 - Add strand pattern extraction with intelligent matching
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
const {getStorage} = require("firebase-admin/storage");
const {PDFDocument} = require("pdf-lib");

const app = initializeApp();
const db = getFirestore(app);
const storage = getStorage(app);

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
    const {fileBase64, fileName, mimeType, productType} = request.data;

    if (!fileBase64) {
      return {success: false, error: "Missing file data"};
    }

    console.log(`[Parse Schedule] Product type filter: ${productType || 'none (all patterns)'}`);

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

    // DEBUG: Log raw table data from Azure
    for (let t = 0; t < tables.length; t++) {
      console.log(`[Parse Schedule] === RAW TABLE ${t} ===`);
      console.log(`[Parse Schedule] Rows: ${tables[t].rowCount}, Cols: ${tables[t].columnCount}`);
      console.log(`[Parse Schedule] Total cells: ${tables[t].cells?.length}`);

      // Log each cell
      for (const cell of (tables[t].cells || [])) {
        console.log(`[Parse Schedule] Cell [${cell.rowIndex},${cell.columnIndex}]: "${cell.content}" (rowSpan: ${cell.rowSpan || 1}, colSpan: ${cell.columnSpan || 1})`);
      }
    }

    const entries = [];

    for (const table of tables) {
      console.log(`[Parse Schedule] Processing table with ${table.rowCount} rows, ${table.columnCount} columns`);

      // Build a 2D array from the table cells, tracking row spans
      const tableData = [];
      const rowSpans = []; // Track which cells span multiple rows

      for (let i = 0; i < table.rowCount; i++) {
        tableData[i] = new Array(table.columnCount).fill("");
        rowSpans[i] = new Array(table.columnCount).fill(1);
      }

      for (const cell of table.cells) {
        tableData[cell.rowIndex][cell.columnIndex] = cell.content || "";
        // Track row span for multi-line cells
        if (cell.rowSpan && cell.rowSpan > 1) {
          rowSpans[cell.rowIndex][cell.columnIndex] = cell.rowSpan;
        }
      }

      // DEBUG: Log the built table data
      console.log(`[Parse Schedule] === BUILT TABLE DATA ===`);
      for (let i = 0; i < tableData.length; i++) {
        console.log(`[Parse Schedule] Row ${i}: ${JSON.stringify(tableData[i])}`);
      }

      // Find header row by looking for "ID" or "ID#" in cells
      let headerRowIndex = -1;
      let columnMap = {};

      // Search first few rows for header indicators
      for (let i = 0; i < Math.min(5, tableData.length); i++) {
        const row = tableData[i];

        for (let j = 0; j < row.length; j++) {
          const cellText = (row[j] || "").toLowerCase().replace(/\n/g, ' ').trim();

          // Map columns based on header text
          if (cellText === "id#" || cellText === "id" || cellText === "id #") {
            columnMap.id = j;
            headerRowIndex = i;
          } else if (cellText === "label" || cellText.includes("job") || (cellText.includes("mark") && !cellText.includes("remark"))) {
            columnMap.label = j;
          } else if (cellText === "width" || cellText === "w") {
            columnMap.width = j;
          } else if (cellText === "thk" || cellText.includes("thick")) {
            columnMap.thickness = j;
          } else if (cellText === "b" || cellText === "bed") {
            columnMap.bed = j;
          } else if (cellText.includes("design") && cellText.includes("feet")) {
            columnMap.lengthFeet = j;
          } else if (cellText.includes("length") && cellText.includes("inch")) {
            columnMap.lengthInches = j;
          } else if (cellText === "feet" || cellText === "ft") {
            columnMap.lengthFeet = j;
          } else if (cellText === "inches" || cellText === "in") {
            columnMap.lengthInches = j;
          } else if (cellText === "strand pattern" || cellText === "strand" || (cellText.includes("strand") && cellText.includes("pattern"))) {
            columnMap.strandPattern = j;
          }
        }

        if (headerRowIndex >= 0) break;
      }

      console.log(`[Parse Schedule] Header row: ${headerRowIndex}, Column map:`, JSON.stringify(columnMap));

      // Fetch strand patterns from Firestore for intelligent matching
      // If productType is specified, only load patterns for that product type
      let knownPatterns = [];
      try {
        let patternsQuery = db.collection('strandPatterns');

        // Filter by product type if specified - this dramatically reduces false positives
        // For example, 1250 only has ~4 bottom strand patterns, so "92-70" won't incorrectly match "152-70"
        if (productType) {
          patternsQuery = patternsQuery.where('productType', '==', productType);
          console.log(`[Parse Schedule] Filtering patterns by productType: ${productType}`);
        }

        const patternsSnapshot = await patternsQuery.get();
        patternsSnapshot.forEach(doc => {
          const pattern = doc.data();
          if (pattern.patternId) {
            knownPatterns.push(pattern.patternId);
          }
        });
        console.log(`[Parse Schedule] Loaded ${knownPatterns.length} known strand patterns from Firestore${productType ? ` (filtered by ${productType})` : ''}`);
        if (knownPatterns.length > 0) {
          console.log(`[Parse Schedule] Available patterns: ${knownPatterns.join(', ')}`);
        }
      } catch (err) {
        console.log(`[Parse Schedule] Could not load strand patterns: ${err.message}`);
      }

      /**
       * Intelligent strand pattern matching function
       * Takes a potentially partial/corrupted OCR value and tries to match it against known patterns
       *
       * Handles combined patterns like "117-70+T32-70" by splitting and matching separately.
       * Format: BOTTOM+TTOP (e.g., "117-70+T32-70")
       *
       * Strategy:
       * 1. Check if pattern contains "+T" indicating combined bottom+top
       * 2. Split and match each part separately
       * 3. Recombine in standard format
       * 4. If not combined, match as single pattern
       */
      const matchStrandPattern = (ocrValue) => {
        if (!ocrValue || typeof ocrValue !== 'string') return '';

        // Clean the input - remove spaces, normalize
        let cleaned = ocrValue.trim().replace(/\s+/g, '').toUpperCase();
        if (!cleaned) return '';

        // Check for combined pattern format (contains +T or just T followed by digits)
        // Patterns like: "117-70+T32-70", "117-70 T32-70", "117-70T32-70"
        const combinedMatch = cleaned.match(/^(\d+-\d+)\+?T(\d+-\d+)$/i);
        if (combinedMatch) {
          const bottomPart = combinedMatch[1];
          const topPart = `T${combinedMatch[2]}`;
          console.log(`[Parse Schedule] Detected combined pattern: bottom="${bottomPart}", top="${topPart}"`);

          // Match bottom part against bottom patterns
          const matchedBottom = matchSinglePattern(bottomPart, 'bottom');
          // Match top part against top patterns
          const matchedTop = matchSinglePattern(topPart, 'top');

          if (matchedBottom && matchedTop) {
            const combined = `${matchedBottom}+${matchedTop}`;
            console.log(`[Parse Schedule] Combined pattern matched: "${cleaned}" -> "${combined}"`);
            return combined;
          } else if (matchedBottom) {
            // Only bottom matched, still return with top part as-is
            const combined = `${matchedBottom}+${topPart}`;
            console.log(`[Parse Schedule] Partial match (bottom only): "${cleaned}" -> "${combined}"`);
            return combined;
          }
        }

        // Also check for patterns where +T might be written differently
        // e.g., "117-70/T32-70" or "117-70 / T32-70"
        const altCombinedMatch = cleaned.match(/^(\d+-\d+)[\/\s]+T(\d+-\d+)$/i);
        if (altCombinedMatch) {
          const bottomPart = altCombinedMatch[1];
          const topPart = `T${altCombinedMatch[2]}`;
          const matchedBottom = matchSinglePattern(bottomPart, 'bottom');
          const matchedTop = matchSinglePattern(topPart, 'top');

          if (matchedBottom) {
            const combined = matchedTop ? `${matchedBottom}+${matchedTop}` : `${matchedBottom}+${topPart}`;
            console.log(`[Parse Schedule] Alt combined pattern matched: "${cleaned}" -> "${combined}"`);
            return combined;
          }
        }

        // Not a combined pattern, try single pattern match
        return matchSinglePattern(cleaned, 'any');
      };

      /**
       * Match a single pattern (bottom or top) against known patterns
       */
      const matchSinglePattern = (value, type) => {
        if (!value) return '';

        const cleaned = value.toUpperCase().replace(/\s+/g, '');

        // Filter patterns by type if specified
        let patternsToMatch = knownPatterns;
        if (type === 'bottom') {
          // Bottom patterns don't start with T
          patternsToMatch = knownPatterns.filter(p => !p.toUpperCase().startsWith('T'));
        } else if (type === 'top') {
          // Top patterns start with T
          patternsToMatch = knownPatterns.filter(p => p.toUpperCase().startsWith('T'));
        }

        if (patternsToMatch.length === 0) {
          console.log(`[Parse Schedule] No ${type} patterns to match against, returning: "${cleaned}"`);
          return cleaned;
        }

        // 1. Exact match (case-insensitive)
        const exactMatch = patternsToMatch.find(p => p.toUpperCase() === cleaned);
        if (exactMatch) {
          console.log(`[Parse Schedule] Exact ${type} match: "${cleaned}" -> "${exactMatch}"`);
          return exactMatch;
        }

        // 2. Try common OCR error corrections
        const ocrCorrections = [
          [/O/g, '0'],  // O -> 0
          [/l/g, '1'],  // l -> 1
          [/I/g, '1'],  // I -> 1
          [/S/g, '5'],  // S -> 5
          [/B/g, '8'],  // B -> 8
          [/Z/g, '2'],  // Z -> 2
        ];

        let corrected = cleaned;
        for (const [pattern, replacement] of ocrCorrections) {
          corrected = corrected.replace(pattern, replacement);
        }

        if (corrected !== cleaned) {
          const correctedMatch = patternsToMatch.find(p => p.toUpperCase() === corrected);
          if (correctedMatch) {
            console.log(`[Parse Schedule] OCR-corrected ${type} match: "${cleaned}" -> "${correctedMatch}"`);
            return correctedMatch;
          }
        }

        // 3. Check if OCR value contains a known pattern
        for (const knownPattern of patternsToMatch) {
          if (cleaned.includes(knownPattern.toUpperCase())) {
            console.log(`[Parse Schedule] Contains ${type} match: "${cleaned}" -> "${knownPattern}"`);
            return knownPattern;
          }
        }

        // 4. Check if a known pattern contains the OCR value (min 4 chars)
        if (cleaned.length >= 4) {
          for (const knownPattern of patternsToMatch) {
            if (knownPattern.toUpperCase().includes(cleaned)) {
              console.log(`[Parse Schedule] Substring ${type} match: "${cleaned}" -> "${knownPattern}"`);
              return knownPattern;
            }
          }
        }

        // 5. No match - return original value
        console.log(`[Parse Schedule] No ${type} match for: "${cleaned}" (available: ${patternsToMatch.join(', ')})`);
        return cleaned;
      };

      // Process ALL data rows after header - simpler approach
      const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0;
      console.log(`[Parse Schedule] Processing rows ${startRow} to ${tableData.length - 1}`);

      for (let i = startRow; i < tableData.length; i++) {
        const row = tableData[i];

        // Get ID from mapped column or search for 7-digit number
        let idNumber = "";
        if (columnMap.id !== undefined) {
          idNumber = (row[columnMap.id] || "").trim();
        }

        // If not found in mapped column, search entire row for 7-digit number
        if (!idNumber || !/^\d{7}$/.test(idNumber)) {
          for (const cell of row) {
            const match = (cell || "").match(/\b(\d{7})\b/);
            if (match) {
              idNumber = match[1];
              break;
            }
          }
        }

        // Skip rows without valid ID
        if (!idNumber || !/^\d{7}$/.test(idNumber)) {
          console.log(`[Parse Schedule] Row ${i} skipped - no valid ID found. Row data: ${JSON.stringify(row)}`);
          continue;
        }

        console.log(`[Parse Schedule] Row ${i} has ID: ${idNumber}`);

        // Extract label (job-mark)
        let jobNumber = "";
        let markNumber = "";
        let labelText = columnMap.label !== undefined ? (row[columnMap.label] || "").trim() : "";

        // Parse job-mark from label
        const labelMatch = labelText.match(/(\d{5,6})\s*[-–]\s*([A-Za-z0-9]+)/);
        if (labelMatch) {
          jobNumber = labelMatch[1];
          markNumber = labelMatch[2];
        }

        // If not found in label column, search entire row
        if (!jobNumber) {
          for (const cell of row) {
            const match = (cell || "").match(/(\d{5,6})\s*[-–]\s*([A-Za-z0-9]+)/);
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

        // Extract thickness
        let rowThickness = thickness;
        if (columnMap.thickness !== undefined) {
          rowThickness = parseFloat(row[columnMap.thickness]) || thickness;
        }

        // Extract bed
        let rowBed = bed;
        if (columnMap.bed !== undefined) {
          const bedVal = (row[columnMap.bed] || "").trim();
          if (/^[1-6]$/.test(bedVal)) {
            rowBed = bedVal;
          }
        }

        // Extract length (feet and inches)
        let lengthFeet = 0;
        let lengthInches = 0;

        if (columnMap.lengthFeet !== undefined) {
          lengthFeet = parseFloat(row[columnMap.lengthFeet]) || 0;
        }
        if (columnMap.lengthInches !== undefined) {
          lengthInches = parseFloat(row[columnMap.lengthInches]) || 0;
        }

        // Format length
        let formattedLength = "";
        if (lengthFeet || lengthInches) {
          const inchesStr = lengthInches % 1 === 0
            ? lengthInches.toString()
            : lengthInches.toFixed(2).replace(/\.?0+$/, '');
          formattedLength = `${lengthFeet}'-${inchesStr}"`;
        }

        // Extract strand pattern
        let strandPattern = "";
        if (columnMap.strandPattern !== undefined) {
          const rawPattern = (row[columnMap.strandPattern] || "").trim();
          if (rawPattern) {
            console.log(`[Parse Schedule] Row ${i} raw strand pattern: "${rawPattern}"`);
            // Use intelligent matching to infer the correct pattern
            strandPattern = matchStrandPattern(rawPattern);
          }
        }

        entries.push({
          pourDate: pourDate,
          jobNumber: jobNumber || "",
          markNumber: markNumber || "",
          idNumber: idNumber,
          width: width,
          thickness: rowThickness || 0,
          length: formattedLength,
          lengthFeet: lengthFeet,
          lengthInches: lengthInches,
          bed: rowBed || undefined,
          designStrandPattern: strandPattern || undefined,
        });
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

/**
 * Parse Piece Tickets PDF
 * Uses Azure Document Intelligence to extract Job No and Mark No from piece ticket PDFs
 * Each page of the PDF is a separate piece ticket with a small table containing the values
 */
exports.parsePieceTickets = onCall({
  maxInstances: 10,
  timeoutSeconds: 300,
  memory: "2GiB",
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
      console.error("[Parse Piece Tickets] Missing Azure Document Intelligence credentials");
      return {success: false, error: "Azure credentials not configured"};
    }

    console.log(`[Parse Piece Tickets] Processing file: ${fileName} (${mimeType})`);
    console.log(`[Parse Piece Tickets] Using Azure Document Intelligence`);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    console.log(`[Parse Piece Tickets] File size: ${fileBuffer.length} bytes`);
    console.log(`[Parse Piece Tickets] Base64 length received: ${fileBase64.length} chars`);

    // Count pages in PDF using pdf-lib before sending to Azure
    try {
      const pdfDoc = await PDFDocument.load(fileBuffer);
      const pdfPageCount = pdfDoc.getPageCount();
      console.log(`[Parse Piece Tickets] PDF-lib detected ${pdfPageCount} pages in the PDF`);
    } catch (pdfErr) {
      console.log(`[Parse Piece Tickets] Could not count PDF pages: ${pdfErr.message}`);
    }

    // Call Azure Document Intelligence Layout API
    const analyzeUrl = `${AZURE_ENDPOINT}documentintelligence/documentModels/prebuilt-layout:analyze?api-version=2024-11-30`;

    console.log(`[Parse Piece Tickets] Calling Azure API: ${analyzeUrl}`);

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
      console.error("[Parse Piece Tickets] Azure API Error:", analyzeResponse.status, errorText);
      return {success: false, error: `Azure API error: ${analyzeResponse.status} - ${errorText}`};
    }

    // Get the operation location for polling
    const operationLocation = analyzeResponse.headers.get("Operation-Location");
    if (!operationLocation) {
      console.error("[Parse Piece Tickets] No operation location returned");
      return {success: false, error: "Azure API did not return operation location"};
    }

    console.log(`[Parse Piece Tickets] Operation started: ${operationLocation}`);

    // Poll for results (Azure processes async)
    let result = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max wait for multi-page PDFs

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      const pollResponse = await fetch(operationLocation, {
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_KEY,
        },
      });

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        console.error("[Parse Piece Tickets] Poll error:", pollResponse.status, errorText);
        return {success: false, error: `Azure poll error: ${pollResponse.status}`};
      }

      result = await pollResponse.json();
      console.log(`[Parse Piece Tickets] Poll attempt ${attempts + 1}, status: ${result.status}`);

      if (result.status === "succeeded") {
        break;
      } else if (result.status === "failed") {
        console.error("[Parse Piece Tickets] Azure analysis failed:", result.error);
        return {success: false, error: "Document analysis failed"};
      }

      attempts++;
    }

    if (!result || result.status !== "succeeded") {
      return {success: false, error: "Document analysis timed out"};
    }

    console.log("[Parse Piece Tickets] Azure analysis succeeded");

    // Extract data from Azure response
    const analyzeResult = result.analyzeResult;
    const pages = analyzeResult.pages || [];
    const tables = analyzeResult.tables || [];

    console.log(`[Parse Piece Tickets] Found ${pages.length} pages and ${tables.length} tables`);
    console.log(`[Parse Piece Tickets] Azure detected page count from document: ${analyzeResult.pages?.length || 0}`);
    console.log(`[Parse Piece Tickets] Full analyze result keys: ${Object.keys(analyzeResult || {}).join(', ')}`);

    // Also check if there's a pageCount in the result
    if (analyzeResult.documents) {
      console.log(`[Parse Piece Tickets] Documents found: ${analyzeResult.documents.length}`);
    }

    const tickets = [];

    // Process each page to extract Job No and Mark No
    // ORIENTATION-AGNOSTIC APPROACH: Don't rely on cell positions, just find the values anywhere
    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex];
      const pageNumber = pageIndex + 1;

      console.log(`[Parse Piece Tickets] Processing page ${pageNumber}`);

      let jobNo = null;
      let markNo = null;

      // Collect ALL text from the page (lines, words, tables, everything)
      let allTextParts = [];

      // Get text from page lines
      for (const line of (page.lines || [])) {
        allTextParts.push(line.content || "");
      }

      // Get text from tables on this page
      for (const table of tables) {
        const tablePageNum = table.boundingRegions?.[0]?.pageNumber || 1;
        if (tablePageNum === pageNumber) {
          for (const cell of (table.cells || [])) {
            allTextParts.push(cell.content || "");
          }
        }
      }

      // Get text from key-value pairs on this page
      for (const kvp of (analyzeResult.keyValuePairs || [])) {
        const kvpPage = kvp.key?.boundingRegions?.[0]?.pageNumber || 1;
        if (kvpPage === pageNumber) {
          allTextParts.push(kvp.key?.content || "");
          allTextParts.push(kvp.value?.content || "");
        }
      }

      // Join all text and also keep individual parts
      const fullPageText = allTextParts.join(" ");
      console.log(`[Parse Piece Tickets] Page ${pageNumber} - All text (${fullPageText.length} chars):`);
      console.log(`[Parse Piece Tickets] Page ${pageNumber} - Text: ${fullPageText.substring(0, 2000)}`);

      // STRATEGY 1: Look for "JOB NO" label and find nearby number
      // This works regardless of orientation because we're searching all text

      // First, find all 3-6 digit numbers on the page (potential job numbers)
      const allNumbers = [];
      const numberMatches = fullPageText.match(/\b\d{3,6}\b/g) || [];
      for (const num of numberMatches) {
        // Filter out numbers that are likely dimensions (like 1'-0", 28'-3 3/4")
        if (!fullPageText.includes(`${num}'`) && !fullPageText.includes(`${num}"`)) {
          allNumbers.push(num);
        }
      }
      console.log(`[Parse Piece Tickets] Page ${pageNumber} - Found numbers: ${JSON.stringify(allNumbers)}`);

      // Find all potential mark numbers (letter+digit combinations like H201, B101)
      // Mark numbers typically have 1-2 letters followed by 2-4 digits (e.g., H201, B101, SC12)
      // Filter out layer/elevation markers like L1, L2, E1, E2 (single letter + single digit)
      const allMarks = [];
      const markMatches = fullPageText.match(/\b[A-Za-z]{1,2}\d{2,4}\b/g) || [];  // Require at least 2 digits
      for (const mark of markMatches) {
        const upper = mark.toUpperCase();
        // Filter out common false positives
        if (!['TYP', 'MIN'].includes(upper) &&
            !upper.startsWith('P') &&  // Filter out P12, P34 etc (drawing refs)
            mark.length >= 3 &&        // Must be at least 3 chars (e.g., H12)
            mark.length <= 6) {
          allMarks.push(mark);
        }
      }
      console.log(`[Parse Piece Tickets] Page ${pageNumber} - Found marks: ${JSON.stringify(allMarks)}`);

      // Check if "JOB" and "NO" appear in the text (in any order due to rotation)
      const hasJobLabel = /JOB/i.test(fullPageText) && /NO/i.test(fullPageText);
      const hasMarkLabel = /MARK/i.test(fullPageText) && /NO/i.test(fullPageText);

      console.log(`[Parse Piece Tickets] Page ${pageNumber} - Has JOB NO label: ${hasJobLabel}, Has MARK NO label: ${hasMarkLabel}`);

      // If we have a JOB NO label, the first suitable number is likely the job number
      if (hasJobLabel && allNumbers.length > 0) {
        // Prefer 4-digit numbers (like 5201, 5127) over 3-digit
        const fourDigitNums = allNumbers.filter(n => n.length === 4);
        jobNo = fourDigitNums.length > 0 ? fourDigitNums[0] : allNumbers[0];
        console.log(`[Parse Piece Tickets] Page ${pageNumber} - Selected Job No: ${jobNo}`);
      }

      // If we have a MARK NO label, find the mark number
      if (hasMarkLabel && allMarks.length > 0) {
        // The mark number typically starts with a letter like H, B, S, C followed by digits
        // Prefer marks that start with common prefixes for precast pieces
        const preferredMarks = allMarks.filter(m => /^[HBSC]/i.test(m));
        markNo = preferredMarks.length > 0 ? preferredMarks[0] : allMarks[0];
        console.log(`[Parse Piece Tickets] Page ${pageNumber} - Selected Mark No: ${markNo}`);
      }

      // STRATEGY 2: Try regex patterns on the full text
      if (!jobNo) {
        const jobPatterns = [
          /JOB\s*NO\.?\s*[:\s]*(\d{3,6})/i,
          /JOBNO\.?\s*[:\s]*(\d{3,6})/i,
          /JOB\s*#\s*[:\s]*(\d{3,6})/i,
          /(\d{4})\s*JOB/i,  // Number before JOB (rotated)
          /NO\s*JOB\s*(\d{3,6})/i,  // Reversed order
        ];
        for (const pattern of jobPatterns) {
          const match = fullPageText.match(pattern);
          if (match) {
            jobNo = match[1];
            console.log(`[Parse Piece Tickets] Page ${pageNumber} - Found Job No via regex: ${jobNo}`);
            break;
          }
        }
      }

      if (!markNo) {
        const markPatterns = [
          /MARK\s*NO\.?\s*[:\s]*([A-Za-z]{1,2}\d{2,4})/i,   // Require at least 2 digits
          /MARKNO\.?\s*[:\s]*([A-Za-z]{1,2}\d{2,4})/i,
          /MARK\s*#\s*[:\s]*([A-Za-z]{1,2}\d{2,4})/i,
          /([A-Za-z]{1,2}\d{2,4})\s*MARK/i,  // Mark before label (rotated)
          /NO\s*MARK\s*([A-Za-z]{1,2}\d{2,4})/i,  // Reversed order
        ];
        for (const pattern of markPatterns) {
          const match = fullPageText.match(pattern);
          if (match) {
            const val = match[1];
            // Filter out false positives - must be at least 3 chars and not a common label
            if (val.length >= 3 && !['TYP', 'MIN'].includes(val.toUpperCase())) {
              markNo = val;
              console.log(`[Parse Piece Tickets] Page ${pageNumber} - Found Mark No via regex: ${markNo}`);
              break;
            }
          }
        }
      }

      // STRATEGY 3: Look at individual text parts for proximity-based matching
      if (!jobNo || !markNo) {
        for (let i = 0; i < allTextParts.length; i++) {
          const part = allTextParts[i].toUpperCase();

          // If this part contains JOB or JOBNO, check nearby parts for the number
          if (!jobNo && (part.includes('JOB') || part.includes('JOBNO'))) {
            // Check this part and adjacent parts for a number
            for (let j = Math.max(0, i - 2); j <= Math.min(allTextParts.length - 1, i + 2); j++) {
              const nearbyPart = allTextParts[j].trim();
              if (/^\d{3,6}$/.test(nearbyPart)) {
                jobNo = nearbyPart;
                console.log(`[Parse Piece Tickets] Page ${pageNumber} - Found Job No near label: ${jobNo}`);
                break;
              }
            }
          }

          // If this part contains MARK or MARKNO, check nearby parts for the value
          if (!markNo && (part.includes('MARK') || part.includes('MARKNO'))) {
            for (let j = Math.max(0, i - 2); j <= Math.min(allTextParts.length - 1, i + 2); j++) {
              const nearbyPart = allTextParts[j].trim();
              // Require at least 2 digits to filter out L1, L2, E1, E2 layer markers
              if (/^[A-Za-z]{1,2}\d{2,4}$/.test(nearbyPart) && nearbyPart.length >= 3) {
                const upper = nearbyPart.toUpperCase();
                if (!['TYP', 'MIN', 'QTY'].includes(upper)) {
                  markNo = nearbyPart;
                  console.log(`[Parse Piece Tickets] Page ${pageNumber} - Found Mark No near label: ${markNo}`);
                  break;
                }
              }
            }
          }
        }
      }

      tickets.push({
        page: pageNumber,
        jobNo: jobNo || null,
        markNo: markNo || null,
      });

      console.log(`[Parse Piece Tickets] Page ${pageNumber} FINAL result: Job=${jobNo}, Mark=${markNo}`);
    }

    console.log(`[Parse Piece Tickets] Extracted ${tickets.length} piece tickets`);

    // Summary log
    const matched = tickets.filter(t => t.jobNo && t.markNo).length;
    const partial = tickets.filter(t => (t.jobNo || t.markNo) && !(t.jobNo && t.markNo)).length;
    const noMatch = tickets.filter(t => !t.jobNo && !t.markNo).length;
    console.log(`[Parse Piece Tickets] Summary: ${matched} complete, ${partial} partial, ${noMatch} no data`);

    return {
      success: true,
      tickets: tickets,
      pageCount: tickets.length,
    };

  } catch (error) {
    console.error("[Parse Piece Tickets] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to process piece tickets",
    };
  }
});

/**
 * Extract Single Page from PDF and Upload to Storage
 * Takes a multi-page PDF, extracts a specific page, and uploads it to Firebase Storage
 * Returns the download URL for the single-page PDF
 */
exports.extractAndUploadPdfPage = onCall({
  maxInstances: 20,
  timeoutSeconds: 60,
  memory: "1GiB",
}, async (request) => {
  try {
    const {fileBase64, pageNumber, entryId, jobNumber, markNumber} = request.data;

    if (!fileBase64 || !pageNumber || !entryId) {
      return {success: false, error: "Missing required parameters: fileBase64, pageNumber, entryId"};
    }

    console.log(`[Extract PDF Page] Extracting page ${pageNumber} for entry ${entryId}`);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    console.log(`[Extract PDF Page] Source PDF size: ${fileBuffer.length} bytes`);

    // Load the source PDF
    const sourcePdf = await PDFDocument.load(fileBuffer);
    const totalPages = sourcePdf.getPageCount();

    if (pageNumber < 1 || pageNumber > totalPages) {
      return {success: false, error: `Invalid page number ${pageNumber}. PDF has ${totalPages} pages.`};
    }

    // Create a new PDF with just the requested page
    const singlePagePdf = await PDFDocument.create();
    const [copiedPage] = await singlePagePdf.copyPages(sourcePdf, [pageNumber - 1]); // 0-indexed
    singlePagePdf.addPage(copiedPage);

    // Save the single-page PDF
    const singlePageBytes = await singlePagePdf.save();
    console.log(`[Extract PDF Page] Single page PDF size: ${singlePageBytes.length} bytes`);

    // Upload to Firebase Storage
    const bucket = storage.bucket();
    const timestamp = Date.now();
    const fileName = `piece-tickets/${entryId}/${jobNumber || 'unknown'}-${markNumber || 'unknown'}-${timestamp}.pdf`;

    const file = bucket.file(fileName);
    await file.save(Buffer.from(singlePageBytes), {
      metadata: {
        contentType: 'application/pdf',
        metadata: {
          entryId: entryId,
          jobNumber: jobNumber || '',
          markNumber: markNumber || '',
          pageNumber: String(pageNumber),
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    // Make the file publicly accessible and get download URL
    await file.makePublic();
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    console.log(`[Extract PDF Page] Uploaded to: ${downloadUrl}`);

    return {
      success: true,
      downloadUrl: downloadUrl,
      fileName: fileName,
    };

  } catch (error) {
    console.error("[Extract PDF Page] Error:", error);
    return {
      success: false,
      error: error.message || "Failed to extract PDF page",
    };
  }
});
