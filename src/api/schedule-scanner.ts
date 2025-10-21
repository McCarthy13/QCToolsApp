/**
 * Schedule Scanner using AI Vision
 * 
 * Uses camera to capture paper schedules and AI to parse them into structured data
 */

import { getOpenAIClient } from './openai';

export interface ParsedScheduleEntry {
  formBed?: string; // Optional - user will assign manually
  jobNumber: string;
  jobName?: string;
  idNumber?: string; // ID column from schedule
  markNumber?: string; // Single mark (M1, M2, etc)
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

IMPORTANT INSTRUCTIONS:
- Create ONE entry per piece (if there are 5 pieces with marks M1-M5, create 5 separate entries)
- Extract the ID number from the "ID" column for each piece
- Extract the Mark number (M1, M2, M3, etc) individually for each piece
- Do NOT group pieces together
- Form/Bed name may be unclear - extract if visible but user will verify

For each INDIVIDUAL piece in the schedule, extract:
- Form/Bed name (if visible, may be unclear)
- Job Number
- Job Name (if visible)
- ID Number (from ID column - this is critical)
- Mark Number (single mark like M1, M2, not ranges like M1-M5)
- Product Type (beam, slab, column, etc.)
- Concrete Yards (for this specific piece)
- Mix Design (PSI rating if visible)
- Scheduled Time
- Any special notes

Return ONLY a valid JSON object with this structure:
{
  "date": "date from schedule if visible",
  "entries": [
    {
      "formBed": "BL1 or unclear",
      "jobNumber": "12345",
      "jobName": "Project Name",
      "idNumber": "ID from ID column",
      "markNumber": "M1",
      "productType": "Beam",
      "concreteYards": 2.5,
      "mixDesign": "6000 PSI",
      "scheduledTime": "8:00 AM",
      "notes": "any special instructions",
      "department": "Precast",
      "confidence": 0.95
    },
    {
      "formBed": "BL1 or unclear",
      "jobNumber": "12345",
      "jobName": "Project Name",
      "idNumber": "another ID",
      "markNumber": "M2",
      "productType": "Beam",
      "concreteYards": 2.5,
      "mixDesign": "6000 PSI",
      "scheduledTime": "8:00 AM",
      "notes": "",
      "confidence": 0.95
    }
  ]
}

CRITICAL:
- Return ONLY the JSON, no other text
- Use null for missing fields
- ONE entry per individual piece, not grouped
- Extract ID numbers carefully from the ID column
- If 5 pieces share the same job but have different marks (M1-M5), create 5 entries
- Confidence should be 0-1 (how certain you are about the data)
- Be precise with numbers (job numbers, ID numbers, yards)`;

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

    return {
      success: true,
      entries: parsed.entries || [],
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
      "formBed": "form name or null",
      "jobNumber": "job number",
      "idNumber": "ID from ID column",
      "markNumber": "single mark like M1, M2",
      "concreteYards": number,
      "confidence": 0-1
    }
  ]
}

IMPORTANT: Create separate entries for each piece, extract ID numbers from ID column.`;

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
