/**
 * Schedule Scanner using AI Vision
 *
 * Uses camera to capture paper schedules and AI to parse them into structured data
 */

import { extractJobNumber } from '../utils/jobNumberValidation';

/**
 * Compress an image blob for faster upload
 * Reduces resolution and quality while maintaining readability for OCR
 *
 * Note: On React Native, image compression is handled by expo-image-picker
 * with the quality parameter, so we just pass through the blob
 */
async function compressImage(blob: Blob): Promise<Blob> {
  // Check if we're in a web environment
  const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

  // On React Native, skip compression - expo-image-picker already handles it
  if (!isWeb) {
    console.log('[Schedule Scanner] Skipping compression on React Native (handled by expo-image-picker)');
    return blob;
  }

  // Web environment - use canvas compression
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Target max dimension: 1600px (higher quality for better OCR accuracy)
      const maxDimension = 1600;
      let width = img.width;
      let height = img.height;

      // Calculate scaling factor
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw and compress
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (compressedBlob) => {
            if (compressedBlob) {
              resolve(compressedBlob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/jpeg',
          0.85 // 85% quality - higher quality for better OCR accuracy
        );
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };

    img.onerror = () => reject(new Error('Failed to load image for compression'));
    img.src = URL.createObjectURL(blob);
  });
}

export interface ParsedScheduleEntry {
  formBed?: string; // User-assigned only, not from AI
  position?: number; // Position number from Pos column (sequential: 1, 2, 3...)
  jobNumber: string;
  jobName?: string;
  idNumber?: string; // ID column from schedule
  markNumber?: string; // Single mark (M1, M2, etc)
  length1?: string; // Length 1 in feet'-inch fraction" format
  length2?: string; // Length 2 in feet'-inch fraction" format
  width?: number; // Width in inches
  angle?: number; // Angle in degrees
  cutback?: string; // Cutback in feet'-inch fraction" format
  productType?: string;
  concreteYards?: number;
  mixDesign?: string;
  scheduledTime?: string;
  notes?: string;
  department?: string;
  confidence?: number; // 0-1 score of parsing confidence
}

export interface ScheduleParseResult {
  success: boolean;
  entries: ParsedScheduleEntry[];
  date?: string;
  rawText?: string;
  error?: string;
}

/**
 * Parse a schedule image using AI vision
 */
export async function parseScheduleImage(
  imageUri: string,
  options?: {
    date?: Date;
    department?: string;
  }
): Promise<ScheduleParseResult> {
  try {
    console.log('[Schedule Scanner] Starting image conversion...');

    // Convert and compress image to base64
    let base64Image: string;

    try {
      // First check if imageUri is already base64
      if (imageUri.startsWith('data:image')) {
        console.log('[Schedule Scanner] Image is already base64 data URI');
        base64Image = imageUri.split(',')[1] || imageUri;
      } else {
        // Fetch and convert image
        console.log('[Schedule Scanner] Fetching image from:', imageUri.substring(0, 100));
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status}`);
        }

        const blob = await response.blob();
        console.log('[Schedule Scanner] Original blob size:', blob.size, 'type:', blob.type);

        // Skip compression entirely - just convert to base64
        // Compression was causing issues in deployed environment
        console.log('[Schedule Scanner] Converting to base64 without compression...');

        base64Image = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            try {
              const base64 = reader.result as string;
              const base64Data = base64.split(',')[1] || base64;
              console.log('[Schedule Scanner] Base64 conversion complete, length:', base64Data.length);
              resolve(base64Data);
            } catch (err) {
              reject(new Error(`Base64 conversion error: ${err}`));
            }
          };
          reader.onerror = () => reject(new Error('FileReader error'));
          reader.readAsDataURL(blob);
        });
      }
    } catch (fetchError) {
      console.error('[Schedule Scanner] Fetch/conversion error:', fetchError);
      throw new Error(`Failed to load image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    // Create prompt for AI to parse the schedule
    const prompt = `You are a PRECISION OCR system for a precast concrete plant's production schedule. Your task is MAXIMUM ACCURACY data extraction.

${options?.date ? `Expected Date: ${options.date.toLocaleDateString()}` : ''}
${options?.department ? `Department: ${options.department}` : ''}

⚠️⚠️⚠️ CRITICAL: YOUR RESPONSE WILL BE REJECTED IF:
1. Number of entries ≠ highest Position number
2. Any ID numbers are duplicated
3. You made assumptions or corrections instead of reading exactly what's printed

═══════════════════════════════════════════════════════════════
CRITICAL ACCURACY REQUIREMENTS:
═══════════════════════════════════════════════════════════════

⚠️ ZERO TOLERANCE FOR ERRORS:
- Every digit, letter, and symbol must be EXACTLY as printed
- Do NOT make assumptions, inferences, or corrections
- Do NOT auto-complete patterns (job numbers, marks, IDs are often non-sequential)
- When uncertain about a character, examine it 3 times before deciding
- IGNORE all handwritten notes, highlighter marks, pen marks - ONLY read printed text

═══════════════════════════════════════════════════════════════
EXTRACTION METHOD (READ THIS CAREFULLY):
═══════════════════════════════════════════════════════════════

STEP 1: COUNT ROWS ⚠️⚠️⚠️ ABSOLUTELY CRITICAL - DO THIS FIRST
- Look at the "Pos" (Position) column on the far left
- Find the HIGHEST position number visible (e.g., if highest is 15, you need 15 entries)
- This is your target count - you MUST extract EXACTLY this many rows
- NUMBER OF ENTRIES IN YOUR JSON = HIGHEST POSITION NUMBER (no exceptions)
- If you cannot see all rows clearly, adjust photo or increase confidence threshold

STEP 2: EXTRACT EACH ROW LEFT TO RIGHT
For EACH row from position 1 to the highest position, read across the columns in this exact order:

┌─────────────────────────────────────────────────────────────┐
│ Column 1: POSITION (Pos)                                     │
│ • Sequential number: 1, 2, 3, 4...                          │
│ • This is your row counter                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Column 2: JOB NUMBER                                         │
│ • May have letter prefix (E, D, etc.) - REMOVE the letters  │
│ • Extract ONLY the numeric digits                            │
│ • Examples:                                                  │
│   - "E255096" → "255096"                                     │
│   - "255096" → "255096"                                      │
│   - "D123456" → "123456"                                     │
│ • Typically 5-6 digits                                       │
│ • DO NOT assume all rows have same job number               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Column 3: MARK NUMBER                                        │
│ • Format: Letter(s) + Number                                 │
│ • Examples: H1, H2, M1, M2, DT1, G1                         │
│ • Read EXACTLY as printed - case sensitive                   │
│ • DO NOT assume sequential (might jump: H1, H3, H5...)      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Column 4: ID NUMBER ⚠️⚠️⚠️ MOST CRITICAL - UNIQUE VALUES    │
│ • Usually 6-7 digits                                         │
│ • EVERY DIGIT MATTERS - this is the most critical data       │
│ • Read digit by digit, left to right, VERY SLOWLY            │
│ • Triple-check each digit:                                   │
│   - Is it a 1 or 7? Look at the shape carefully             │
│   - Is it a 0 or 8? Check if it's closed or open            │
│   - Is it a 3 or 8? Look at the curves                      │
│   - Is it a 5 or 6? Check the top and bottom                │
│   - Is it a 2 or Z? Numbers only, no letters                │
│ • ⚠️ CRITICAL RULE: Every ID number MUST be DIFFERENT        │
│ • If you see duplicate IDs, you MADE AN ERROR - go back     │
│ • Check each ID against all others before finalizing         │
│ • DO NOT assume sequential or patterns - read what's there  │
│ • DO NOT auto-correct or fix what looks "wrong"             │
│ • When in doubt, mark lower confidence - never guess         │
│ • This field WILL BE VALIDATED - duplicates = rejection      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Column 5: LENGTH 1                                           │
│ • Format: feet'-inches fraction"                             │
│ • Examples:                                                  │
│   - "28'-6 1/2\"" (28 feet, 6 and a half inches)            │
│   - "30'-0\"" (30 feet, 0 inches)                           │
│   - "25'-3 3/4\"" (25 feet, 3 and three-quarters inches)    │
│ • Keep exact spacing and formatting                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Column 6: LENGTH 2                                           │
│ • Same format as LENGTH 1                                    │
│ • Often identical to LENGTH 1, but NOT always                │
│ • Read independently - don't copy from LENGTH 1              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Column 7: WIDTH                                              │
│ • Number in inches (no units shown, just number)             │
│ • Examples: 48, 24, 12, 36                                   │
│ • Extract as integer number                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Column 8: ANGLE                                              │
│ • Number in degrees (no degree symbol, just number)          │
│ • Usually 0, but can be 2, 5, etc.                          │
│ • Extract as number                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Column 9: CUTBACK                                            │
│ • Format: feet'-inches fraction" or "feet inches"            │
│ • Examples:                                                  │
│   - "0'-6\"" (0 feet, 6 inches)                             │
│   - "1'-3 1/2\"" (1 foot, 3 and a half inches)              │
│   - "0 ft 6 in" (alternative format)                         │
│ • Keep exact formatting as shown                             │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════
CONFIDENCE SCORING:
═══════════════════════════════════════════════════════════════

For each entry, assign confidence 0.0 to 1.0:
• 1.0 = Crystal clear, 100% certain
• 0.9 = Very clear, high confidence
• 0.8 = Clear but minor ambiguity
• 0.7 = Readable but some blur or uncertainty
• 0.6 = Difficult to read, made best guess
• <0.6 = Very uncertain

═══════════════════════════════════════════════════════════════
DATA VALIDATION RULES:
═══════════════════════════════════════════════════════════════

FIELDS THAT CAN HAVE IDENTICAL VALUES (across multiple rows):
✓ Job Number - multiple pieces can have same job
✓ Mark Number - marks can repeat
✓ Length 1 - lengths can be identical
✓ Length 2 - lengths can be identical
✓ Width - widths can be identical
✓ Angle - angles can be identical
✓ Cutback - cutbacks can be identical

FIELD THAT MUST BE UNIQUE:
⚠️ ID NUMBER - EVERY ID MUST BE DIFFERENT
   If you see duplicate IDs, you made a reading error. Go back and read more carefully.

═══════════════════════════════════════════════════════════════
QUALITY CHECKS BEFORE SUBMITTING (DO NOT SKIP):
═══════════════════════════════════════════════════════════════

MANDATORY CHECKS - YOUR RESPONSE WILL BE REJECTED IF ANY FAIL:

✓ CRITICAL #1: Count the entries in your JSON array
   • Does this number = the highest Position number you saw?
   • If not, you're missing entries - find them and add them

✓ CRITICAL #2: Check all ID numbers for duplicates
   • List out all ID numbers
   • Are there any duplicates?
   • If yes, you made a reading error - go back and reread each ID very carefully

✓ All ID numbers have 6-7 digits?
✓ All job numbers are numeric only (letters removed)?
✓ All mark numbers have letter + number format?
✓ All measurements use correct format with feet' and inches"?
✓ Did you read each row independently without copying patterns?
✓ Did you extract EXACTLY what's printed (no corrections or assumptions)?

BEFORE YOU RETURN YOUR RESPONSE:
- Count your entries one more time
- Scan all IDs for duplicates one more time
- If either check fails, FIX IT NOW

═══════════════════════════════════════════════════════════════
OUTPUT FORMAT:
═══════════════════════════════════════════════════════════════

Return ONLY valid JSON (no markdown, no explanation):

{
  "date": "date from schedule header if visible, or null",
  "entries": [
    {
      "position": 1,
      "jobNumber": "255096",
      "markNumber": "H1",
      "idNumber": "1234567",
      "length1": "28'-6 1/2\"",
      "length2": "28'-6 1/2\"",
      "width": 48,
      "angle": 0,
      "cutback": "0'-6\"",
      "confidence": 0.95
    }
  ]
}

Use null for any field that is truly blank or unreadable.

BEGIN EXTRACTION NOW:`;

    console.log('[Schedule Scanner] Starting API call...');

    // For deployed web builds, use our Firebase Cloud Function proxy
    const isWeb = typeof window !== 'undefined';

    const apiUrl = isWeb
      ? 'https://us-central1-precast-qc-tools-web-app.cloudfunctions.net/openaiVisionProxy'
      : (typeof process !== 'undefined' && process.env?.OPENAI_BASE_URL)
        ? `${process.env.OPENAI_BASE_URL}/chat/completions`
        : 'https://api.openai.com.proxy.vibecodeapp.com/v1/chat/completions';

    const apiKey = isWeb ? 'not-needed-for-cloud-function' : 'vibecode-proxy-key';

    console.log('[Schedule Scanner] Platform:', isWeb ? 'web' : 'native');
    console.log('[Schedule Scanner] API URL:', apiUrl);

    const requestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 8000,
    };

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    };

    // Add Authorization header only for non-web platforms
    if (!isWeb) {
      (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Schedule Scanner] API Error:', response.status, errorText);
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    // Parse the response
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('[Schedule Scanner] Successfully parsed schedule image');

    // Extract JSON from response (in case there's extra text)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    
    const parsed = JSON.parse(jsonStr);

    // Clean and extract job numbers from entries
    let cleanedEntries = (parsed.entries || []).map((entry: any) => ({
      ...entry,
      jobNumber: entry.jobNumber ? extractJobNumber(entry.jobNumber) : '', // Remove letters/prefixes
    }));

    // VALIDATION: Log warnings but don't block
    console.log('[Schedule Scanner] Validation checks:');

    // 1. Check if we have the correct number of entries based on highest position
    if (cleanedEntries.length > 0) {
      const positions: number[] = [];
      for (const entry of cleanedEntries) {
        if (entry.position && typeof entry.position === 'number') {
          positions.push(entry.position);
        }
      }

      if (positions.length > 0) {
        const highestPosition = Math.max(...positions);
        console.log(`[Schedule Scanner] Entry count: ${cleanedEntries.length}, Highest position: ${highestPosition}`);

        if (cleanedEntries.length !== highestPosition) {
          console.warn(
            `[Schedule Scanner] WARNING: Entry count mismatch! Found ${cleanedEntries.length} entries but highest Position is ${highestPosition}`
          );
        }
      }
    }

    // 2. Check for duplicate ID numbers
    const idNumbers: string[] = [];
    for (const entry of cleanedEntries) {
      if (entry.idNumber && typeof entry.idNumber === 'string' && entry.idNumber.trim() !== '') {
        idNumbers.push(entry.idNumber.trim());
      }
    }

    if (idNumbers.length > 0) {
      const idSet = new Set(idNumbers);
      console.log(`[Schedule Scanner] Total IDs: ${idNumbers.length}, Unique IDs: ${idSet.size}`);

      if (idSet.size !== idNumbers.length) {
        // Find duplicates
        const duplicates: string[] = [];
        const seen = new Set<string>();
        for (const id of idNumbers) {
          if (seen.has(id)) {
            if (!duplicates.includes(id)) {
              duplicates.push(id);
            }
          }
          seen.add(id);
        }

        console.warn(`[Schedule Scanner] WARNING: Duplicate ID numbers found: ${duplicates.join(', ')}`);
      }
    }

    return {
      success: true,
      entries: cleanedEntries,
      date: parsed.date,
      rawText: content,
    };
  } catch (error) {
    console.error('Schedule parsing error:', error);
    return {
      success: false,
      entries: [],
      error: error instanceof Error ? error.message : 'Failed to parse schedule',
    };
  }
}

/**
 * Validate and clean parsed entries
 */
export function validateParsedEntries(
  entries: ParsedScheduleEntry[]
): { valid: ParsedScheduleEntry[]; invalid: ParsedScheduleEntry[] } {
  const valid: ParsedScheduleEntry[] = [];
  const invalid: ParsedScheduleEntry[] = [];

  for (const entry of entries) {
    // Must have at minimum: jobNumber
    // formBed is optional since user will assign it
    if (entry.jobNumber) {
      valid.push(entry);
    } else {
      invalid.push(entry);
    }
  }

  return { valid, invalid };
}

/**
 * Parse schedule using alternative method (for troubleshooting)
 * Extracts raw text first, then structures it
 */
export async function parseScheduleWithTextExtraction(
  imageUri: string
): Promise<ScheduleParseResult> {
  try {
    console.log('[Schedule Scanner] Starting text extraction method...');

    // Convert and compress image to base64
    let base64Image: string;

    try {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('[Schedule Scanner] Original blob size:', blob.size);

      // Compress image before converting to base64
      const compressedBlob = await compressImage(blob);
      console.log('[Schedule Scanner] Compressed blob size:', compressedBlob.size);

      base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1] || base64;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(compressedBlob);
      });
    } catch (fetchError) {
      console.error('[Schedule Scanner] Fetch/conversion error:', fetchError);
      if (imageUri.startsWith('data:')) {
        base64Image = imageUri.split(',')[1] || imageUri;
      } else {
        throw new Error(`Failed to load image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
    }

    // Step 1: Extract text
    const extractPrompt = `Extract all text from this production schedule image.
Maintain the layout and structure as much as possible. Return plain text.`;

    console.log('[Schedule Scanner] Step 1: Extracting text...');

    // For deployed web builds, use our Firebase Cloud Function proxy
    const isWeb = typeof window !== 'undefined';

    const apiUrl = isWeb
      ? 'https://us-central1-precast-qc-tools-web-app.cloudfunctions.net/openaiVisionProxy'
      : (typeof process !== 'undefined' && process.env?.OPENAI_BASE_URL)
        ? `${process.env.OPENAI_BASE_URL}/chat/completions`
        : 'https://api.openai.com.proxy.vibecodeapp.com/v1/chat/completions';

    const apiKey = isWeb ? 'not-needed-for-cloud-function' : 'vibecode-proxy-key';

    const extractRequestBody = {
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: extractPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high',
              },
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 4000,
    };

    const extractFetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(extractRequestBody),
    };

    if (!isWeb) {
      (extractFetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${apiKey}`;
    }

    const extractResponse = await fetch(apiUrl, extractFetchOptions);

    if (!extractResponse.ok) {
      const errorText = await extractResponse.text();
      console.error('[Schedule Scanner] Extract API Error:', extractResponse.status, errorText);
      throw new Error(`API request failed: ${extractResponse.status} ${errorText}`);
    }

    const extractResult = await extractResponse.json();
    const extractedText = extractResult.choices?.[0]?.message?.content || '';

    // Step 2: Structure the text
    const structurePrompt = `Parse this production schedule text into structured JSON. Create ONE entry per individual piece.

${extractedText}

Return JSON with this structure:
{
  "date": "date if visible",
  "entries": [
    {
      "jobNumber": "job number",
      "idNumber": "ID from ID column",
      "markNumber": "single mark like M1, M2",
      "concreteYards": number,
      "confidence": 0-1
    }
  ]
}

IMPORTANT: Create separate entries for each piece, extract ID numbers from ID column. DO NOT include formBed field.`;

    console.log('[Schedule Scanner] Step 2: Structuring data...');

    const structureRequestBody = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: structurePrompt }],
      temperature: 0.1,
      max_tokens: 2000,
    };

    const structureFetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(structureRequestBody),
    };

    if (!isWeb) {
      (structureFetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${apiKey}`;
    }

    const structureResponse = await fetch(apiUrl, structureFetchOptions);

    if (!structureResponse.ok) {
      const errorText = await structureResponse.text();
      console.error('[Schedule Scanner] Structure API Error:', structureResponse.status, errorText);
      throw new Error(`API request failed: ${structureResponse.status} ${errorText}`);
    }

    const structureResult = await structureResponse.json();
    const content = structureResult.choices?.[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;
    const parsed = JSON.parse(jsonStr);

    return {
      success: true,
      entries: parsed.entries || [],
      date: parsed.date,
      rawText: extractedText,
    };
  } catch (error) {
    console.error('Text extraction parsing error:', error);
    return {
      success: false,
      entries: [],
      error: error instanceof Error ? error.message : 'Failed to parse schedule',
    };
  }
}
