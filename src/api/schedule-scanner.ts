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
    const prompt = `You are analyzing a daily production schedule for a precast concrete plant. Read each row independently and extract EXACTLY what you see.

${options?.date ? `Expected Date: ${options.date.toLocaleDateString()}` : ''}
${options?.department ? `Department: ${options.department}` : ''}

EXTRACTION APPROACH:
- Read the image from TOP to BOTTOM
- Extract EVERY row you can see
- Treat each row as completely independent (do NOT try to find patterns or verify consistency)
- Extract EXACTLY what is printed - do NOT guess, correct, or infer values
- IGNORE all highlighter marks, pen markups, handwritten notes

COLUMNS TO EXTRACT (Position through Cutback):

1. POSITION (Pos): Number in first column (1, 2, 3, etc.) - this tells you how many total rows to extract

2. JOB: Extract ONLY numeric digits, ignore letters (E255096 → 255096)

3. MARK: Letter + number exactly as shown (H1, M2, etc.)

4. ID: 6-7 digit number - read carefully, each digit matters

5. LENGTH 1: Format as feet'-inch fraction" (28'-6 1/2")

6. LENGTH 2: Format as feet'-inch fraction" (28'-6 1/2")

7. WIDTH: Numeric value in inches (48, 24, etc.)

8. ANGLE: Numeric value in degrees (0, 2, etc.)

9. CUTBACK: Format as feet'-inch fraction" (0'-6", 1'-3 1/2")

CRITICAL RULES:
- Look at Position column FIRST - the highest position number = total rows to extract
- If you see Position 15, you MUST extract 15 entries
- Do NOT try to "correct" ID numbers or other values - extract EXACTLY what you see
- Do NOT assume sequential patterns in ID numbers, marks, or other fields
- Each row is independent - read what's printed for THAT specific row
- If text is blurry or unclear, do your best but mark confidence lower

FINAL CHECK:
Count the highest Position number you see. That's how many entries you need.
If Position goes up to 15, your JSON must have 15 entries.

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

IMPORTANT:
- Return ONLY the JSON, no other text
- Use null for missing fields
- Extract EXACTLY what you see - do NOT try to fix or correct values
- Confidence should be 0-1 (how certain you are about each value)`;

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
        max_tokens: 8000,
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
