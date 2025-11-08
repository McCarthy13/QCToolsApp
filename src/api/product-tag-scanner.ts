/**
 * Product Tag Scanner using AI Vision
 *
 * Uses camera to capture product tags and AI to parse specific fields
 */

import { getOpenAIClient } from './openai';

export interface ProductTagData {
  span?: {
    feet: number;
    inches: number;
  };
  pourDate?: string;
  projectName?: string;
  projectNumber?: string;
  markNumber?: string;
  idNumber?: string;
  strandPattern?: string;
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
 * Extracts span (in feet and decimal inches) and pour date
 */
export async function parseProductTag(
  imageUri: string,
  targetFields?: Array<'span' | 'pourDate' | 'projectInfo' | 'slippageIdentifier' | 'camberCalculator'>
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

    // Determine what fields to extract
    const fields = targetFields || ['span', 'pourDate', 'projectInfo', 'slippageIdentifier', 'camberCalculator'];

    // Create prompt for AI to parse the product tag
    const prompt = `You are analyzing a product tag from a precast concrete hollow-core plank. Extract the following information from the tag:

${fields.includes('span') ? `
- SPAN: Look for the span measurement. It should be in format like "33'-2.5\"" where:
  * 33 is the feet
  * 2.5 is the whole and decimal inch value (NOT a fraction)
  * Example formats: "33'-2.5\"", "27'-6.5\"", "30'-0\"", etc.
` : ''}

${fields.includes('pourDate') ? `
- POUR DATE: Look for a date field labeled as "Pour Date" or similar
  * Extract in MM/DD/YYYY format
` : ''}

${fields.includes('projectInfo') ? `
- PROJECT INFO: Look for project name, project number, mark number, ID number
` : ''}

${fields.includes('slippageIdentifier') ? `
- SLIPPAGE IDENTIFIER: Look for any field labeled "Slippage Identifier" or similar
` : ''}

${fields.includes('camberCalculator') ? `
- CAMBER CALCULATOR: Look for any field labeled "Camber Calculator" or similar
` : ''}

IMPORTANT:
- The span inches value is a DECIMAL, not a fraction (e.g., 2.5 means 2.5 inches, NOT 2 and 1/2)
- Be precise with measurements
- Return null for any field you cannot find or are not confident about

Return ONLY a valid JSON object with this structure:
{
  "span": {
    "feet": 33,
    "inches": 2.5
  },
  "pourDate": "12/15/2024",
  "projectName": "Project Name",
  "projectNumber": "12345",
  "markNumber": "M1",
  "idNumber": "ID123",
  "strandPattern": "107-70",
  "slippageIdentifier": "value if present",
  "camberCalculator": "value if present"
}

Return ONLY the JSON, no other text. Use null for any missing fields.`;

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
