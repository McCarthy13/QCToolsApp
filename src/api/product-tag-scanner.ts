/**
 * Product Tag Scanner using AI Vision
 *
 * Uses camera to capture product tags and AI to parse specific fields
 */

import { getOpenAIClient } from './openai';

export interface ProductTagData {
  projectName?: string;
  projectNumber?: string;
  markNumber?: string;
  idNumber?: string;
  span?: {
    feet: number;
    inches: number;
  };
  pourDate?: string;
  strandPattern?: string;
  productWidth?: number; // Width extracted from "8 x 48" pattern
  slippageIdentifier?: string;
  camberCalculator?: string;
}

export interface ProductTagParseResult {
  success: boolean;
  data?: ProductTagData;
  rawText?: string;
  error?: string;
}

/**
 * Parse a product tag image using AI vision
 * Extracts ALL product details from the tag
 */
export async function parseProductTag(
  imageUri: string
): Promise<ProductTagParseResult> {
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

    // Create prompt for AI to parse the product tag - extract ALL fields
    const prompt = `You are analyzing a product tag from a precast concrete hollow-core plank. Extract ALL the following information from the tag.

FIELD EXTRACTION RULES (CRITICAL - FOLLOW EXACTLY):

1. JOB NUMBER (Project Number):
   - Usually a 6-digit number like "255096"
   - Extract as-is, numeric only

2. MARK NUMBER:
   - Format like "H105", "M1", "M2", etc.
   - Include the letter prefix (H, M, etc.)

3. SPAN:
   - Format like "28'-5\"" or "33'-2.5\""
   - First number is FEET
   - Second number (after apostrophe) is INCHES as DECIMAL (e.g., 5" means 5.0 inches, 2.5" means 2.5 inches)
   - Return as separate feet and inches values

4. ID NUMBER:
   - Usually a 7-digit number like "1350951"
   - Extract as-is

5. WIDTH (from "8 x 48" pattern):
   - Look for pattern like "8 x 48" or "8 X 48"
   - Extract ONLY the second number (48) - this is the width
   - The first number (8) should be IGNORED for now

6. STRAND PATTERN:
   - Look for a 2-3 digit number like "126" or "107" or "77" or "148"
   - ALWAYS append "-70" to this number
   - Example: if you see "126", return "126-70"
   - Example: if you see "107", return "107-70"

7. POUR DATE:
   - Format may be like "09.12.2025" (DD.MM.YYYY European format)
   - Convert to MM/DD/YYYY format
   - Example: "09.12.2025" → "12/09/2025"

8. IGNORE THESE:
   - Any "E" or "D" letter standing alone (skip it)
   - Any "#" followed by numbers at the top (internal tracking)
   - The first number in the "8 x 48" pattern (the height)

LAYOUT EXAMPLE:
The tag typically shows:
- Top: tracking number (ignore)
- Job Number: 6 digits (255096)
- Letter E or D (ignore)
- Mark Number: letter+digits (H105)
- Span: feet'inches" format (28'-5")
- ID Number: 7 digits (1350951)
- Size: "8 x 48" pattern (extract only 48)
- Strand number: 2-3 digits (126) → convert to "126-70"
- Pour Date: DD.MM.YYYY (09.12.2025) → convert to MM/DD/YYYY

Return ONLY a valid JSON object with this structure:
{
  "projectNumber": "255096",
  "markNumber": "H105",
  "idNumber": "1350951",
  "span": {
    "feet": 28,
    "inches": 5.0
  },
  "pourDate": "12/09/2025",
  "strandPattern": "126-70",
  "productWidth": 48
}

IMPORTANT:
- Return null for any field you cannot find
- Be precise with numbers - don't guess
- Always append "-70" to the strand pattern number
- Convert pour date from DD.MM.YYYY to MM/DD/YYYY
- For span inches: if you see "5\"", that means 5.0 inches (decimal)
- Extract ONLY the width (second number) from "8 x 48" pattern

Return ONLY the JSON, no other text.`;

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
      max_tokens: 1000,
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
      data: parsed,
      rawText: content,
    };
  } catch (error) {
    console.error('Product tag parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse product tag',
    };
  }
}

/**
 * Format span for display (e.g., "33'-2.5\"")
 */
export function formatSpanForDisplay(feet: number, inches: number): string {
  return `${feet}'-${inches}"`;
}

/**
 * Parse span from display format back to feet and inches
 */
export function parseSpanFromDisplay(spanStr: string): { feet: number; inches: number } | null {
  const match = spanStr.match(/^(\d+)'-(\d+(?:\.\d+)?)"/);
  if (match) {
    return {
      feet: parseInt(match[1], 10),
      inches: parseFloat(match[2]),
    };
  }
  return null;
}
