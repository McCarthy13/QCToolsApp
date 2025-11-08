/**
 * Schedule Scanner using AI Vision
 * 
 * Uses camera to capture paper schedules and AI to parse them into structured data
 */

import { getOpenAIClient } from './openai';
import { extractJobNumber } from '../utils/jobNumberValidation';

export interface ParsedScheduleEntry {
  formBed?: string; // User-assigned only, not from AI
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
    const prompt = `You are analyzing a daily production schedule for a precast concrete plant. Extract ALL individual pieces from this image as SEPARATE entries.

${options?.date ? `Expected Date: ${options.date.toLocaleDateString()}` : ''}
${options?.department ? `Department: ${options.department}` : ''}

CRITICAL INSTRUCTIONS:
- IGNORE all highlighter marks, pen markups, handwritten notes, or any annotations on the paper
- ONLY extract the PRINTED/TYPED text from the original schedule
- Do NOT try to interpret what the markups mean
- Focus on extracting data from the table columns

- Create ONE entry per piece (if there are 5 pieces with marks M1-M5, create 5 separate entries)
- Extract the ID number from the "ID" column for each piece
- Extract the Mark number (M1, M2, M3, etc) individually for each piece
- Do NOT group pieces together
- Do NOT extract form/bed names - ignore any bed/form columns (user will assign these manually)

COLUMN EXTRACTION RULES:

1. JOB COLUMN:
   - Extract ONLY the numeric digits
   - IGNORE any letters like "E" or "D"
   - Example: "E255096" → extract "255096"

2. MARK COLUMN:
   - Extract mark identifier (H1, H2, M1, M2, etc.)

3. ID COLUMN:
   - Extract the ID number for each piece
   - IGNORE any handwritten IDs

4. LENGTH 1 COLUMN:
   - Extract in feet'-whole_inch fraction_inch" format
   - Example: 28'-6 1/2" or 30'-0"
   - Be precise with fractions (1/2, 1/4, 3/4, 1/8, etc.)

5. LENGTH 2 COLUMN:
   - Extract in feet'-whole_inch fraction_inch" format
   - Same format as Length 1

6. CUMULATIVE LENGTH COLUMN:
   - IGNORE this column completely

7. WIDTH COLUMN:
   - Extract width value in INCHES (numeric value only)
   - Example: "48" → 48

8. ANGLE COLUMN:
   - Extract angle value in DEGREES (numeric value only)
   - Example: "0" → 0

9. CUTBACK COLUMN:
   - Extract in feet'-whole_inch fraction_inch" format
   - Same format as Length 1 and Length 2
   - Example: 0'-6" or 1'-3 1/2"

For each INDIVIDUAL piece in the schedule, extract:
- Job Number (ONLY numeric digits from Job column)
- Mark Number (from Mark column: H1, M1, etc.)
- ID Number (from ID column)
- Length 1 (in feet'-inch fraction" format)
- Length 2 (in feet'-inch fraction" format)
- Width (numeric value in inches)
- Angle (numeric value in degrees)
- Cutback (in feet'-inch fraction" format)

Return ONLY a valid JSON object with this structure:
{
  "date": "date from schedule if visible",
  "entries": [
    {
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
  ]
}

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

    // Call AI with vision
    const client = getOpenAIClient();
    const response = await client.chat.completions.create({
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
      temperature: 0.1,
      max_tokens: 4000,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

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

    const client = getOpenAIClient();
    const extractResponse = await client.chat.completions.create({
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
    });

    const extractedText = extractResponse.choices[0]?.message?.content || '';

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

    const structureResponse = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: structurePrompt }],
      temperature: 0.1,
      max_tokens: 2000,
    });

    const content = structureResponse.choices[0]?.message?.content || '{}';
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
