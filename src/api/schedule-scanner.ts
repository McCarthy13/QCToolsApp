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
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('[Schedule Scanner] Original blob size:', blob.size);

      // Compress image before converting to base64
      const compressedBlob = await compressImage(blob);
      console.log('[Schedule Scanner] Compressed blob size:', compressedBlob.size, 'reduction:',
        Math.round((1 - compressedBlob.size / blob.size) * 100) + '%');

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

    // Create prompt for AI to parse the schedule
    const prompt = `You are a PRECISION OCR system for a precast concrete plant's production schedule. Your task is MAXIMUM ACCURACY data extraction.

${options?.date ? `Expected Date: ${options.date.toLocaleDateString()}` : ''}
${options?.department ? `Department: ${options.department}` : ''}

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

STEP 1: COUNT ROWS
- Look at the "Pos" (Position) column on the far left
- Find the HIGHEST position number visible (e.g., if highest is 15, you need 15 entries)
- This is your target count - you MUST extract exactly this many rows

STEP 2: EXTRACT EACH ROW LEFT TO RIGHT
For EACH row, read across the columns in this exact order:

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
│ Column 4: ID NUMBER ⚠️ CRITICAL - READ VERY CAREFULLY       │
│ • Usually 6-7 digits                                         │
│ • EVERY DIGIT MATTERS - this is critical data                │
│ • Read digit by digit, left to right                         │
│ • Double-check each digit:                                   │
│   - Is it a 1 or 7?                                          │
│   - Is it a 0 or 8?                                          │
│   - Is it a 3 or 8?                                          │
│   - Is it a 5 or 6?                                          │
│ • DO NOT assume sequential IDs                               │
│ • If uncertain, reduce confidence score                      │
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
QUALITY CHECKS BEFORE SUBMITTING:
═══════════════════════════════════════════════════════════════

✓ Count check: Number of entries = highest Position number?
✓ All ID numbers have 6-7 digits?
✓ All job numbers are numeric only (letters removed)?
✓ All mark numbers have letter + number format?
✓ All measurements use correct format with feet' and inches"?
✓ Did you read each row independently without copying patterns?

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
    const cleanedEntries = (parsed.entries || []).map((entry: ParsedScheduleEntry) => ({
      ...entry,
      jobNumber: extractJobNumber(entry.jobNumber), // Remove letters/prefixes
    }));

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
