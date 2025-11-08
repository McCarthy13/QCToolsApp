/**
 * Schedule Scanner using AI Vision
 *
 * Uses camera to capture paper schedules and AI to parse them into structured data
 */

import { extractJobNumber } from '../utils/jobNumberValidation';

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
    // Convert image to base64
    const base64Image = await fetch(imageUri)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove data URL prefix
          const base64Data = base64.split(',')[1] || base64;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));

    // Create prompt for AI to parse the schedule
    const prompt = `You are analyzing a daily production schedule for a precast concrete plant. Your goal is to extract ALL individual pieces from this image as SEPARATE entries with MAXIMUM ACCURACY.

${options?.date ? `Expected Date: ${options.date.toLocaleDateString()}` : ''}
${options?.department ? `Department: ${options.department}` : ''}

CRITICAL INSTRUCTIONS:
- IGNORE all highlighter marks, pen markups, handwritten notes, or any annotations on the paper
- ONLY extract the PRINTED/TYPED text from the original schedule
- Do NOT try to interpret what the markups mean
- Focus ONLY on the table columns from "Position" (Pos) through "Cutback"
- ACCURACY IS CRITICAL - Read numbers carefully and double-check each value
- If a value is unclear or hard to read, mark confidence as lower
- EXTRACT EVERY SINGLE ROW - Do not skip any rows, even if they seem similar

VERY IMPORTANT - POSITION COLUMN VERIFICATION:
- The FIRST column is "Position" (Pos) - it contains sequential numbers (1, 2, 3, 4... 15)
- The HIGHEST number in the Position column tells you the TOTAL number of pieces
- Example: If the last Position number is 15, you MUST extract exactly 15 entries
- Use this as your verification: if Position column shows 1-15, you need 15 entries
- This is THE MOST IMPORTANT verification - Position column = total piece count

COMPLETENESS REQUIREMENT:
- Look at the Position column and find the highest number
- Create ONE entry for EACH position number (1, 2, 3... up to the maximum)
- After extraction, verify: number of entries = highest position number
- If Position shows 15 rows but you only extracted 12, GO BACK and find the missing 3
- Each Mark number (H1, H2, M1, M2, etc.) is a SEPARATE piece
- Do NOT group pieces together - EVERY ROW is a separate entry
- Do NOT extract form/bed names - ignore any bed/form columns (user will assign these manually)

COLUMN EXTRACTION RULES (READ CAREFULLY AND VERIFY EACH VALUE):

0. POSITION COLUMN (Pos):
   - This is the FIRST column before Job
   - Sequential numbers: 1, 2, 3, 4, 5... etc.
   - The HIGHEST number = total pieces you must extract
   - Extract this value for verification purposes
   - DO NOT skip any position numbers in sequence

1. JOB COLUMN:
   - Extract ONLY the numeric digits
   - IGNORE any letters like "E" or "D"
   - Example: "E255096" → extract "255096"
   - Double-check: ensure all digits are captured correctly

2. MARK COLUMN:
   - Extract mark identifier exactly as shown (H1, H2, M1, M2, etc.)
   - Be precise with the letter and number combination

3. ID COLUMN:
   - Extract the ID number for each piece accurately
   - IGNORE any handwritten IDs
   - Verify: Check if the ID is 6-7 digits and matches the printed value

4. LENGTH 1 COLUMN:
   - Extract in feet'-whole_inch fraction_inch" format
   - Example: 28'-6 1/2" or 30'-0"
   - Be VERY precise with fractions (1/2, 1/4, 3/4, 1/8, 3/8, 5/8, 7/8, etc.)
   - Common fractions: 1/2, 1/4, 3/4 - read carefully
   - Verify: Does the value make sense for a concrete product length?

5. LENGTH 2 COLUMN:
   - Extract in feet'-whole_inch fraction_inch" format
   - Same format as Length 1
   - Often similar or identical to Length 1
   - Be precise with all digits and fractions

6. CUMULATIVE LENGTH COLUMN:
   - IGNORE this column completely - do not extract

7. WIDTH COLUMN:
   - Extract width value in INCHES (numeric value only)
   - Example: "48" → 48, "24" → 24
   - Common values: 24, 32, 48 inches
   - Verify: Is this a reasonable width for a concrete product?

8. ANGLE COLUMN:
   - Extract angle value in DEGREES (numeric value only)
   - Example: "0" → 0, "2" → 2
   - Most pieces are 0 degrees
   - Verify: Angle should typically be 0-5 degrees

9. CUTBACK COLUMN:
   - Extract in feet'-whole_inch fraction_inch" format
   - Same format as Length 1 and Length 2
   - Example: 0'-6" or 1'-3 1/2"
   - Often "0" or small values
   - Be precise with fractions

ACCURACY VERIFICATION CHECKLIST:
✓ Did I look at the Position column first?
✓ Did I identify the HIGHEST position number (this is my target count)?
✓ Did I create one entry for EACH position number (1, 2, 3... up to max)?
✓ Did I read each number digit-by-digit?
✓ Did I verify the fraction values (1/2, 1/4, 3/4)?
✓ Do the length values make sense (typically 20-60 feet)?
✓ Did I extract only printed values (no handwriting)?
✓ Are the ID numbers complete (6-7 digits)?
✓ Did I read the mark numbers correctly (letter + number)?
✓ Does my entry count match the highest position number?

MANDATORY COMPLETENESS CHECK:
Before returning your response, YOU MUST verify:
1. Find highest Position number in schedule = [MAX_POS]
2. Count entries in my JSON = [ENTRY_COUNT]
3. CRITICAL: MAX_POS MUST EQUAL ENTRY_COUNT
4. If MAX_POS ≠ ENTRY_COUNT, you FAILED - re-examine and extract ALL missing rows
5. Check for gaps in Position sequence (1,2,3,4,5... no skipping)
6. Ensure sequential mark numbers are all included (H1, H2, H3... or M1, M2, M3...)

Example verification:
- Position column shows: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
- Highest Position = 15
- My JSON must have exactly 15 entries
- If I only have 12 entries, I must find the 3 missing pieces

For each INDIVIDUAL piece in the schedule, extract:
- Position Number (from Position/Pos column - sequential number)
- Job Number (ONLY numeric digits from Job column - verify accuracy)
- Mark Number (from Mark column: H1, M1, etc. - exact match)
- ID Number (from ID column - complete number)
- Length 1 (in feet'-inch fraction" format - precise fractions)
- Length 2 (in feet'-inch fraction" format - precise fractions)
- Width (numeric value in inches - verify reasonableness)
- Angle (numeric value in degrees - typically 0)
- Cutback (in feet'-inch fraction" format - precise fractions)

Return ONLY a valid JSON object with this structure:
{
  "date": "date from schedule if visible",
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
    },
    {
      "position": 2,
      "jobNumber": "255096",
      "markNumber": "H2",
      "idNumber": "1234568",
      "length1": "28'-6 1/2\"",
      "length2": "28'-6 1/2\"",
      "width": 48,
      "angle": 0,
      "cutback": "0'-6\"",
      "confidence": 0.95
    }
    ... continue for ALL positions up to the highest position number
  ]
}

REMEMBER: If highest Position = 15, you MUST have 15 entries in the array!

CRITICAL RULES:
- Return ONLY the JSON, no other text
- Use null for missing fields
- ONE entry per individual piece, not grouped
- Extract ID numbers carefully from the ID column
- For Job Number: extract ONLY numeric digits, ignore letters
- For Length fields: preserve exact format with feet, inches, and fractions (e.g., "28'-6 1/2\"")
- For Width and Angle: return numeric values only (no units in the value)
- IGNORE the Cumulative Length column
- If 5 pieces share the same job but have different marks, create 5 entries
- Confidence should be 0-1 (how certain you are about the data)
- IGNORE any form/bed/line information - do not include formBed field
- IGNORE ALL HIGHLIGHTER, PEN MARKS, AND HANDWRITTEN ANNOTATIONS
- Extract ONLY the original printed/typed schedule data
- Be precise with fractions in length measurements`;

    // Call AI with vision using fetch API
    console.log('[Schedule Scanner] Calling OpenAI API...');
    console.log('[Schedule Scanner] Using GPT-4o vision model');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
        max_tokens: 6000,
      }),
    });

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
    const base64Image = await fetch(imageUri)
      .then(res => res.blob())
      .then(blob => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          const base64Data = base64.split(',')[1] || base64;
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));

    // Step 1: Extract text
    const extractPrompt = `Extract all text from this production schedule image.
Maintain the layout and structure as much as possible. Return plain text.`;

    console.log('[Schedule Scanner] Step 1: Extracting text...');
    const extractResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
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
      }),
    });

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
    const structureResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: structurePrompt }],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

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
