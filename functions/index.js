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
 * OpenAI Chat Proxy
 * Proxies OpenAI API requests from the web app to avoid CORS issues
 * Used by AI Insights feature for quality log analysis
 */
exports.openaiChatProxy = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 120,
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  try {
    const {messages, model = "gpt-4o-2024-11-20", temperature = 0.7, max_tokens = 4096} = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({error: "Missing or invalid messages"});
    }

    // Get API key from environment variable
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    if (!OPENAI_API_KEY) {
      console.error("[OpenAI Chat Proxy] Missing API key");
      return res.status(500).json({
        error: "OpenAI API key not configured",
        details: "Please set OPENAI_API_KEY environment variable"
      });
    }

    console.log("[OpenAI Chat Proxy] Making request to OpenAI API");

    // Make request to OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
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
      console.error("[OpenAI Chat Proxy] API Error:", response.status, errorText);
      return res.status(response.status).json({
        error: `OpenAI API error: ${response.status}`,
        details: errorText,
      });
    }

    const result = await response.json();
    console.log("[OpenAI Chat Proxy] Success");

    return res.status(200).json(result);
  } catch (error) {
    console.error("[OpenAI Chat Proxy] Error:", error);
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
          } else if ((cellText.includes("bottom") && cellText.includes("strand")) || cellText === "bot strand" || cellText === "bot" || cellText === "bottom") {
            columnMap.bottomStrand = j;
          } else if ((cellText.includes("top") && cellText.includes("strand")) || cellText === "top strand" || cellText === "top") {
            columnMap.topStrand = j;
          }
        }

        if (headerRowIndex >= 0) break;
      }

      console.log(`[Parse Schedule] Header row: ${headerRowIndex}, Column map:`, JSON.stringify(columnMap));

      // Log if we found strand pattern columns
      if (columnMap.strandPattern !== undefined) {
        console.log(`[Parse Schedule] Found combined strand pattern column at index ${columnMap.strandPattern}`);
      }
      if (columnMap.bottomStrand !== undefined) {
        console.log(`[Parse Schedule] Found bottom strand column at index ${columnMap.bottomStrand}`);
      }
      if (columnMap.topStrand !== undefined) {
        console.log(`[Parse Schedule] Found top strand column at index ${columnMap.topStrand}`);
      }
      if (columnMap.strandPattern === undefined && columnMap.bottomStrand === undefined) {
        console.log(`[Parse Schedule] WARNING: No strand pattern columns detected! Will search cells for patterns.`);
        // Log the header row to help debug
        if (headerRowIndex >= 0 && tableData[headerRowIndex]) {
          console.log(`[Parse Schedule] Header row contents: ${JSON.stringify(tableData[headerRowIndex])}`);
        }
      }

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
       * Handles combined patterns like "117-70+T32-70" or truncated "117-70+T3"
       * Format: BOTTOM+TTOP (e.g., "117-70+T32-70")
       *
       * Strategy:
       * 1. Check if pattern contains "+T" indicating combined bottom+top
       * 2. Split and match each part separately (handling truncated values)
       * 3. Recombine in standard format
       * 4. If not combined, match as single pattern
       */
      const matchStrandPattern = (ocrValue) => {
        if (!ocrValue || typeof ocrValue !== 'string') return '';

        // Clean the input - normalize but preserve some structure for pattern detection
        let cleaned = ocrValue.trim().toUpperCase();
        if (!cleaned) return '';

        console.log(`[Parse Schedule] matchStrandPattern input: "${ocrValue}" -> cleaned: "${cleaned}"`);

        // Check for combined pattern with +T separator
        // Handle both full patterns like "117-70+T32-70" AND truncated like "117-70+T3"
        // The top part might be truncated due to narrow column width in OCR
        const combinedMatch = cleaned.match(/^(\d+-\d+)\s*\+\s*T(\d+(?:-\d+)?)(.*)$/i);

        if (combinedMatch) {
          const bottomPart = combinedMatch[1];
          const topPartRaw = combinedMatch[2]; // Could be "32-70" or just "3" (truncated)
          const suffix = combinedMatch[3] || ''; // Any trailing chars like /RCF

          console.log(`[Parse Schedule] Detected combined pattern: bottom="${bottomPart}", topRaw="T${topPartRaw}", suffix="${suffix}"`);

          // Match bottom part against bottom patterns
          const matchedBottom = matchSinglePattern(bottomPart, 'bottom');

          // Match top part - may need to infer full pattern from truncated value
          let topToMatch = `T${topPartRaw}`;
          const matchedTop = matchSinglePattern(topToMatch, 'top');

          if (matchedBottom && matchedTop) {
            const combined = `${matchedBottom}+${matchedTop}`;
            console.log(`[Parse Schedule] Combined pattern matched: "${cleaned}" -> "${combined}"`);
            return combined;
          } else if (matchedBottom) {
            // Only bottom matched, return with whatever top we could infer
            const combined = matchedTop ? `${matchedBottom}+${matchedTop}` : `${matchedBottom}+T${topPartRaw}`;
            console.log(`[Parse Schedule] Partial match: "${cleaned}" -> "${combined}"`);
            return combined;
          }
        }

        // Check for pattern with space before T (no +)
        const spaceMatch = cleaned.match(/^(\d+-\d+)\s+T(\d+(?:-\d+)?)$/i);
        if (spaceMatch) {
          const bottomPart = spaceMatch[1];
          const topPartRaw = spaceMatch[2];

          console.log(`[Parse Schedule] Detected space-separated pattern: bottom="${bottomPart}", top="T${topPartRaw}"`);

          const matchedBottom = matchSinglePattern(bottomPart, 'bottom');
          const matchedTop = matchSinglePattern(`T${topPartRaw}`, 'top');

          if (matchedBottom) {
            const combined = matchedTop ? `${matchedBottom}+${matchedTop}` : `${matchedBottom}+T${topPartRaw}`;
            console.log(`[Parse Schedule] Space pattern matched: "${cleaned}" -> "${combined}"`);
            return combined;
          }
        }

        // Not a combined pattern, try single pattern match
        const cleanedNoSpaces = cleaned.replace(/\s+/g, '');
        return matchSinglePattern(cleanedNoSpaces, 'any');
      };

      /**
       * Match a single pattern (bottom or top) against known patterns
       * Handles truncated values like "T3" that should match "T32-70"
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

        console.log(`[Parse Schedule] Matching "${cleaned}" against ${type} patterns: ${patternsToMatch.join(', ')}`);

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

        // 4. Check if a known pattern STARTS WITH the OCR value (for truncated patterns)
        // This handles cases like "T3" matching "T32-70" or "117" matching "117-70"
        for (const knownPattern of patternsToMatch) {
          if (knownPattern.toUpperCase().startsWith(cleaned)) {
            console.log(`[Parse Schedule] Prefix ${type} match: "${cleaned}" -> "${knownPattern}"`);
            return knownPattern;
          }
        }

        // 5. Check if a known pattern contains the OCR value (min 2 chars for top patterns)
        const minLength = type === 'top' ? 2 : 4;
        if (cleaned.length >= minLength) {
          for (const knownPattern of patternsToMatch) {
            if (knownPattern.toUpperCase().includes(cleaned)) {
              console.log(`[Parse Schedule] Substring ${type} match: "${cleaned}" -> "${knownPattern}"`);
              return knownPattern;
            }
          }
        }

        // 6. No match - return original value
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

        // Extract strand pattern - check for combined column first, then separate bottom/top columns
        let strandPattern = "";

        if (columnMap.strandPattern !== undefined) {
          // Single combined strand pattern column
          const rawPattern = (row[columnMap.strandPattern] || "").trim();
          if (rawPattern) {
            console.log(`[Parse Schedule] Row ${i} raw strand pattern (combined column): "${rawPattern}"`);
            strandPattern = matchStrandPattern(rawPattern);
          }
        } else if (columnMap.bottomStrand !== undefined) {
          // Separate bottom and top strand columns
          const bottomRaw = (row[columnMap.bottomStrand] || "").trim();
          const topRaw = columnMap.topStrand !== undefined ? (row[columnMap.topStrand] || "").trim() : "";

          console.log(`[Parse Schedule] Row ${i} raw bottom strand: "${bottomRaw}", raw top strand: "${topRaw}"`);

          if (bottomRaw) {
            const matchedBottom = matchSinglePattern(bottomRaw, 'bottom');

            if (topRaw) {
              // Clean up top strand - ensure it has T prefix
              let topCleaned = topRaw.toUpperCase().replace(/\s+/g, '');
              if (!topCleaned.startsWith('T')) {
                topCleaned = 'T' + topCleaned;
              }
              const matchedTop = matchSinglePattern(topCleaned, 'top');
              strandPattern = `${matchedBottom}+${matchedTop}`;
              console.log(`[Parse Schedule] Row ${i} combined from separate columns: "${strandPattern}"`);
            } else {
              strandPattern = matchedBottom;
              console.log(`[Parse Schedule] Row ${i} bottom only: "${strandPattern}"`);
            }
          }
        }

        // If still no strand pattern, search the row for pattern-like values
        if (!strandPattern) {
          for (const cell of row) {
            const cellVal = (cell || "").trim();
            // Look for patterns like "117-70" or "117-70+T32-70" or "T32-70"
            if (/^\d+-\d+/.test(cellVal) || /^T\d+-\d+/.test(cellVal)) {
              console.log(`[Parse Schedule] Row ${i} found pattern in cell search: "${cellVal}"`);
              strandPattern = matchStrandPattern(cellVal);
              if (strandPattern) break;
            }
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
  timeoutSeconds: 540,
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
    console.log(`[Parse Piece Tickets] Using Azure Document Intelligence - PAGE BY PAGE MODE with rate limiting`);

    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    console.log(`[Parse Piece Tickets] File size: ${fileBuffer.length} bytes`);

    // Load PDF and get page count
    const pdfDoc = await PDFDocument.load(fileBuffer);
    const pageCount = pdfDoc.getPageCount();
    console.log(`[Parse Piece Tickets] PDF has ${pageCount} pages - will process EACH page individually`);

    // Helper function to call Azure for a single page PDF with retry logic for rate limits
    const analyzePageWithAzure = async (pageBuffer, pageNum, retryCount = 0) => {
      const analyzeUrl = `${AZURE_ENDPOINT}documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-11-30`;

      console.log(`[Parse Piece Tickets] Page ${pageNum} - Calling Azure API... (attempt ${retryCount + 1})`);

      const analyzeResponse = await fetch(analyzeUrl, {
        method: "POST",
        headers: {
          "Ocp-Apim-Subscription-Key": AZURE_KEY,
          "Content-Type": "application/pdf",
        },
        body: pageBuffer,
      });

      // Handle rate limiting (429) with retry
      if (analyzeResponse.status === 429) {
        const errorText = await analyzeResponse.text();
        console.log(`[Parse Piece Tickets] Page ${pageNum} - Rate limited (429), will retry...`);

        // Extract wait time from error message or default to 10 seconds
        let waitTime = 10000;
        const waitMatch = errorText.match(/retry after (\d+) seconds/i);
        if (waitMatch) {
          waitTime = (parseInt(waitMatch[1]) + 2) * 1000; // Add 2 second buffer
        }

        if (retryCount < 3) {
          console.log(`[Parse Piece Tickets] Page ${pageNum} - Waiting ${waitTime/1000} seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          return analyzePageWithAzure(pageBuffer, pageNum, retryCount + 1);
        } else {
          console.error(`[Parse Piece Tickets] Page ${pageNum} - Max retries exceeded for rate limit`);
          return null;
        }
      }

      if (!analyzeResponse.ok) {
        const errorText = await analyzeResponse.text();
        console.error(`[Parse Piece Tickets] Page ${pageNum} - Azure API Error:`, analyzeResponse.status, errorText);
        return null;
      }

      const operationLocation = analyzeResponse.headers.get("Operation-Location");
      if (!operationLocation) {
        console.error(`[Parse Piece Tickets] Page ${pageNum} - No operation location`);
        return null;
      }

      // Poll for results
      let result = null;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const pollResponse = await fetch(operationLocation, {
          headers: { "Ocp-Apim-Subscription-Key": AZURE_KEY },
        });

        if (!pollResponse.ok) {
          console.error(`[Parse Piece Tickets] Page ${pageNum} - Poll error`);
          return null;
        }

        result = await pollResponse.json();

        if (result.status === "succeeded") {
          console.log(`[Parse Piece Tickets] Page ${pageNum} - Azure analysis succeeded`);
          return result.analyzeResult;
        } else if (result.status === "failed") {
          console.error(`[Parse Piece Tickets] Page ${pageNum} - Azure analysis failed`);
          return null;
        }

        attempts++;
      }

      console.error(`[Parse Piece Tickets] Page ${pageNum} - Timed out`);
      return null;
    };

    // Process each page individually with delay between calls to avoid rate limits
    const tickets = [];
    const DELAY_BETWEEN_PAGES = 1500; // 1.5 seconds between pages to balance speed vs rate limits

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      console.log(`[Parse Piece Tickets] === Processing page ${pageNum} of ${pageCount} ===`);

      // Add delay between pages (except for first page)
      if (pageNum > 1) {
        console.log(`[Parse Piece Tickets] Waiting ${DELAY_BETWEEN_PAGES/1000}s before next page to avoid rate limits...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_PAGES));
      }

      // Extract single page as new PDF
      const singlePagePdf = await PDFDocument.create();
      const [copiedPage] = await singlePagePdf.copyPages(pdfDoc, [pageNum - 1]);
      singlePagePdf.addPage(copiedPage);
      const singlePageBuffer = Buffer.from(await singlePagePdf.save());

      console.log(`[Parse Piece Tickets] Page ${pageNum} - Extracted as ${singlePageBuffer.length} bytes`);

      // Send single page to Azure
      const analyzeResult = await analyzePageWithAzure(singlePageBuffer, pageNum);

      let jobNo = null;
      let markNo = null;

      if (analyzeResult) {
        // Get all text content from this single page
        const content = analyzeResult.content || '';
        console.log(`[Parse Piece Tickets] Page ${pageNum} - Content length: ${content.length} chars`);
        console.log(`[Parse Piece Tickets] Page ${pageNum} - Content preview: ${content.substring(0, 500)}`);

        // Extract Job No and Mark No from page content
        const extractResult = extractJobAndMark(content, pageNum);
        jobNo = extractResult.jobNo;
        markNo = extractResult.markNo;
      } else {
        console.log(`[Parse Piece Tickets] Page ${pageNum} - No Azure result, skipping`);
      }

      console.log(`[Parse Piece Tickets] Page ${pageNum} FINAL: Job=${jobNo}, Mark=${markNo}`);

      tickets.push({
        page: pageNum,
        jobNo,
        markNo,
      });
    }

    console.log(`[Parse Piece Tickets] Completed processing ${pageCount} pages`);
    return { success: true, tickets, pageCount };

  } catch (error) {
    console.error("[Parse Piece Tickets] Error:", error);
    return { success: false, error: error.message };
  }
});

// Helper function to extract Job No and Mark No from page text
function extractJobAndMark(text, pageNum) {
  let jobNo = null;
  let markNo = null;

  if (!text || text.length < 10) {
    console.log(`[Parse Piece Tickets] Page ${pageNum} - Text too short for extraction`);
    return { jobNo, markNo };
  }

  const upperText = text.toUpperCase();

  // Find all 4-6 digit numbers (potential job numbers)
  const allNumbers = [];
  const numberMatches = text.match(/\b\d{4,6}\b/g) || [];
  for (const num of numberMatches) {
    // Filter out numbers that are part of dimensions
    if (!text.includes(`${num}'`) && !text.includes(`${num}"`)) {
      allNumbers.push(num);
    }
  }

  // Find all potential mark numbers (letter+digit combinations)
  const allMarks = [];
  const markMatches = text.match(/\b[A-Za-z]{1,2}\d{2,4}[A-Za-z]?\b/g) || [];
  for (const mark of markMatches) {
    const upper = mark.toUpperCase();
    if (!['TYP', 'MIN', 'MAX', 'REF', 'DWG'].includes(upper) && mark.length >= 3) {
      allMarks.push(mark);
    }
  }

  console.log(`[Parse Piece Tickets] Page ${pageNum} - Numbers found: ${JSON.stringify(allNumbers.slice(0, 5))}`);
  console.log(`[Parse Piece Tickets] Page ${pageNum} - Marks found: ${JSON.stringify(allMarks.slice(0, 5))}`);

  // Check for JOB label
  const hasJobLabel = /JOB/i.test(upperText);
  const hasMarkLabel = /MARK/i.test(upperText);

  console.log(`[Parse Piece Tickets] Page ${pageNum} - Has JOB: ${hasJobLabel}, Has MARK: ${hasMarkLabel}`);

  // Extract Job No
  if (hasJobLabel && allNumbers.length > 0) {
    // Prefer 4-6 digit numbers
    const preferredNums = allNumbers.filter(n => n.length >= 4);
    jobNo = preferredNums.length > 0 ? preferredNums[0] : allNumbers[0];
  }

  // Try regex patterns for job
  if (!jobNo) {
    const jobPatterns = [
      /JOB\s*(?:NO\.?|#)?\s*[:\s]*(\d{4,6})/i,
      /PROJECT\s*(?:NO\.?|#)?\s*[:\s]*(\d{4,6})/i,
    ];
    for (const pattern of jobPatterns) {
      const match = text.match(pattern);
      if (match) {
        jobNo = match[1];
        break;
      }
    }
  }

  // Extract Mark No
  if (hasMarkLabel && allMarks.length > 0) {
    const preferredMarks = allMarks.filter(m => /^[HBSCW]/i.test(m));
    markNo = preferredMarks.length > 0 ? preferredMarks[0] : allMarks[0];
  }

  // Try regex patterns for mark
  if (!markNo) {
    const markPatterns = [
      /MARK\s*(?:NO\.?|#)?\s*[:\s]*([A-Za-z]{1,2}\d{2,4}[A-Za-z]?)/i,
      /PIECE\s*(?:NO\.?|#|MARK)?\s*[:\s]*([A-Za-z]{1,2}\d{2,4}[A-Za-z]?)/i,
    ];
    for (const pattern of markPatterns) {
      const match = text.match(pattern);
      if (match && match[1].length >= 3) {
        markNo = match[1];
        break;
      }
    }
  }

  return { jobNo, markNo };
}

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

/**
 * Feedback Page
 * Serves an HTML page for engineers to submit feedback on quality log entries
 * Accessed via /feedback?entryId=xxx&subject=xxx
 */
exports.feedbackPage = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 30,
}, async (req, res) => {
  try {
    const { entryId, subject } = req.query;

    if (!entryId) {
      return res.status(400).send('Missing entry ID');
    }

    // Fetch the entry from Firestore
    const entryDoc = await db.collection('qualityLogEntries').doc(entryId).get();

    if (!entryDoc.exists) {
      return res.status(404).send('Entry not found');
    }

    const entry = entryDoc.data();

    // Format inspection notes
    const inspectionNotes = entry.inspectionNotes?.map(n => `${n.type}: ${n.note}`).join('<br/>') || '-';

    // Build the HTML page
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Engineer Feedback - ${entry.jobNumber}-${entry.markNumber}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background-color: #f5f5f5;
      padding: 20px;
      line-height: 1.5;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 24px;
    }
    h1 {
      color: #1f2937;
      font-size: 24px;
      margin-bottom: 8px;
    }
    .subtitle {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 24px;
    }
    .entry-details {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .entry-details h2 {
      font-size: 16px;
      color: #374151;
      margin-bottom: 12px;
    }
    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 12px;
    }
    .detail-item {
      font-size: 13px;
    }
    .detail-label {
      color: #6b7280;
      font-weight: 500;
    }
    .detail-value {
      color: #1f2937;
      font-weight: 600;
    }
    .notes-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }
    .notes-section .detail-value {
      font-weight: normal;
      white-space: pre-wrap;
    }
    .feedback-form {
      margin-top: 24px;
    }
    .feedback-form label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin-bottom: 8px;
    }
    .feedback-form textarea {
      width: 100%;
      min-height: 120px;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      font-family: inherit;
      resize: vertical;
    }
    .feedback-form textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .email-input {
      margin-top: 16px;
    }
    .email-input input {
      width: 100%;
      padding: 12px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
    }
    .email-input input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .submit-btn {
      margin-top: 20px;
      width: 100%;
      padding: 14px;
      background: #7c3aed;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .submit-btn:hover {
      background: #6d28d9;
    }
    .submit-btn:disabled {
      background: #c4b5fd;
      cursor: not-allowed;
    }
    .success-message {
      display: none;
      padding: 16px;
      background: #d1fae5;
      border: 1px solid #a7f3d0;
      border-radius: 8px;
      color: #065f46;
      margin-top: 16px;
    }
    .error-message {
      display: none;
      padding: 16px;
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      color: #991b1b;
      margin-top: 16px;
    }
    .existing-feedback {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }
    .existing-feedback h3 {
      font-size: 14px;
      color: #1e40af;
      margin-bottom: 8px;
    }
    .existing-feedback p {
      color: #1e3a8a;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Provide Engineer Feedback</h1>
    <p class="subtitle">Quality Log Entry: ${entry.jobNumber}-${entry.markNumber} | ID: ${entry.idNumber}</p>

    <div class="entry-details">
      <h2>Entry Details</h2>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Pour Date</div>
          <div class="detail-value">${entry.pourDate || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Disposition</div>
          <div class="detail-value">${entry.disposition || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Status</div>
          <div class="detail-value">${entry.status || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Product Type</div>
          <div class="detail-value">${entry.productType || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Job #</div>
          <div class="detail-value">${entry.jobNumber || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Mark #</div>
          <div class="detail-value">${entry.markNumber || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">ID #</div>
          <div class="detail-value">${entry.idNumber || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Length</div>
          <div class="detail-value">${entry.length || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Width</div>
          <div class="detail-value">${entry.width || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Design Pattern</div>
          <div class="detail-value">${entry.designStrandPattern || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Cast Pattern</div>
          <div class="detail-value">${entry.castStrandPattern || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Bed</div>
          <div class="detail-value">${entry.bed || '-'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Engineer</div>
          <div class="detail-value">${entry.engineer || '-'}</div>
        </div>
      </div>
      <div class="notes-section">
        <div class="detail-label">Inspection Notes</div>
        <div class="detail-value">${inspectionNotes}</div>
      </div>
    </div>

    ${entry.engineerFeedback ? `
    <div class="existing-feedback">
      <h3>Existing Feedback</h3>
      <p>${entry.engineerFeedback}</p>
    </div>
    ` : ''}

    <form class="feedback-form" id="feedbackForm">
      <input type="hidden" id="entryId" value="${entryId}">
      <input type="hidden" id="originalSubject" value="${subject || ''}">

      <label for="feedback">${entry.engineerFeedback ? 'Update Feedback' : 'Your Feedback'}</label>
      <textarea id="feedback" name="feedback" placeholder="Enter your feedback here..." required>${entry.engineerFeedback || ''}</textarea>

      <div class="email-input">
        <label for="email">Your Email Address</label>
        <input type="email" id="email" name="email" placeholder="your.email@molinconcrete.com" value="patrick.mccarthy@molin.com" required>
      </div>

      <button type="submit" class="submit-btn" id="submitBtn">Submit Feedback</button>
    </form>

    <div class="success-message" id="successMessage">
      <strong>Feedback submitted successfully!</strong><br>
      Your feedback has been saved and a reply-all email has been sent to the original recipients.
    </div>

    <div class="error-message" id="errorMessage">
      <strong>Error:</strong> <span id="errorText"></span>
    </div>
  </div>

  <script>
    document.getElementById('feedbackForm').addEventListener('submit', async function(e) {
      e.preventDefault();

      const submitBtn = document.getElementById('submitBtn');
      const successMessage = document.getElementById('successMessage');
      const errorMessage = document.getElementById('errorMessage');
      const errorText = document.getElementById('errorText');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
      successMessage.style.display = 'none';
      errorMessage.style.display = 'none';

      try {
        const feedback = document.getElementById('feedback').value;
        const email = document.getElementById('email').value;
        const originalSubject = document.getElementById('originalSubject').value;

        const response = await fetch('/api/submitFeedback', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            entryId: document.getElementById('entryId').value,
            feedback: feedback,
            email: email,
            originalSubject: originalSubject,
          }),
        });

        const result = await response.json();

        if (result.success) {
          successMessage.style.display = 'block';
          submitBtn.textContent = 'Submitted!';

          // Build mailto link for reply-all
          const replySubject = 'RE: ' + (originalSubject || 'Engineer Feedback');
          const emailBody = result.emailBody || feedback;

          // Open mailto link
          const mailtoLink = 'mailto:?subject=' + encodeURIComponent(replySubject) + '&body=' + encodeURIComponent(emailBody);

          // Small delay to show success message, then open email client
          setTimeout(() => {
            window.location.href = mailtoLink;
          }, 500);
        } else {
          throw new Error(result.error || 'Unknown error');
        }
      } catch (error) {
        errorText.textContent = error.message;
        errorMessage.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Feedback';
      }
    });
  </script>
</body>
</html>
    `;

    res.set('Content-Type', 'text/html');
    res.send(html);

  } catch (error) {
    console.error("[Feedback Page] Error:", error);
    res.status(500).send('Error loading feedback page');
  }
});

/**
 * Submit Engineer Feedback
 * Handles feedback submission, updates Firestore, and sends reply-all email
 */
exports.submitEngineerFeedback = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60,
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { entryId, feedback, email, originalSubject } = req.body;

    if (!entryId || !feedback || !email) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }

    console.log(`[Submit Feedback] Processing feedback for entry ${entryId} from ${email}`);

    // Fetch the entry from Firestore
    const entryRef = db.collection('qualityLogEntries').doc(entryId);
    const entryDoc = await entryRef.get();

    if (!entryDoc.exists) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }

    const entry = entryDoc.data();

    // Format timestamp
    const now = new Date();
    const timestamp = now.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    // Create feedback with timestamp and email
    const formattedFeedback = `${feedback}\n\n— ${email} (${timestamp})`;

    // Update the entry in Firestore
    await entryRef.update({
      engineerFeedback: formattedFeedback,
      updatedAt: Date.now(),
      updatedBy: email,
    });

    console.log(`[Submit Feedback] Updated entry ${entryId} with feedback`);

    // Format inspection notes for email
    const inspectionNotes = entry.inspectionNotes?.map(n => `${n.type}: ${n.note}`).join('\n') || '-';

    // Build email body with entry details and feedback
    const emailBody = `Engineer Feedback for ${entry.jobNumber}-${entry.markNumber}

ENTRY DETAILS:
--------------
Pour Date: ${entry.pourDate || '-'}
Disposition: ${entry.disposition || '-'}
Status: ${entry.status || '-'}
Product Type: ${entry.productType || '-'}
Job #: ${entry.jobNumber || '-'}
Mark #: ${entry.markNumber || '-'}
ID #: ${entry.idNumber || '-'}
Length: ${entry.length || '-'}
Width: ${entry.width || '-'}
Design Pattern: ${entry.designStrandPattern || '-'}
Cast Pattern: ${entry.castStrandPattern || '-'}
Bed: ${entry.bed || '-'}
Engineer: ${entry.engineer || '-'}

Inspection Notes:
${inspectionNotes}

ENGINEER FEEDBACK:
------------------
${feedback}

— ${email} (${timestamp})
`;

    return res.status(200).json({
      success: true,
      message: "Feedback submitted successfully",
      emailBody: emailBody,
    });

  } catch (error) {
    console.error("[Submit Feedback] Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});
