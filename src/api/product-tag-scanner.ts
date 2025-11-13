/**
 * Product Tag Scanner using AI Vision
 *
 * Uses camera to capture product tags and AI to parse specific fields
 */

/**
 * Compress an image blob for faster upload
 * Reduces resolution and quality while maintaining readability for OCR
 */
async function compressImage(blob: Blob): Promise<Blob> {
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
    console.log('[Product Tag Scanner] Starting image conversion, URI:', imageUri);

    // Convert and compress image to base64
    let base64Image: string;

    try {
      // Try fetching the image first
      const response = await fetch(imageUri);
      console.log('[Product Tag Scanner] Fetch response status:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      console.log('[Product Tag Scanner] Original blob size:', blob.size, 'type:', blob.type);

      // Compress image before converting to base64
      const compressedBlob = await compressImage(blob);
      console.log('[Product Tag Scanner] Compressed blob size:', compressedBlob.size, 'reduction:',
        Math.round((1 - compressedBlob.size / blob.size) * 100) + '%');

      base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          console.log('[Product Tag Scanner] FileReader complete, data length:', base64.length);
          // Remove data URL prefix
          const base64Data = base64.split(',')[1] || base64;
          resolve(base64Data);
        };
        reader.onerror = (error) => {
          console.error('[Product Tag Scanner] FileReader error:', error);
          reject(error);
        };
        reader.readAsDataURL(compressedBlob);
      });
    } catch (fetchError) {
      console.error('[Product Tag Scanner] Fetch/conversion error:', fetchError);

      // If imageUri is already a data URL, extract the base64 part
      if (imageUri.startsWith('data:')) {
        console.log('[Product Tag Scanner] Image is already a data URL, extracting base64...');
        base64Image = imageUri.split(',')[1] || imageUri;
      } else {
        throw new Error(`Failed to load image: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
      }
    }

    console.log('[Product Tag Scanner] Base64 conversion complete, length:', base64Image.length);

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
   - Format on tag is MM.DD.YYYY (e.g., "09.12.2025" means September 12th, 2025)
   - Simply convert dots to forward slashes
   - Example: "09.12.2025" → "09/12/2025" (September 12th, 2025)
   - Example: "12.09.2025" → "12/09/2025" (December 9th, 2025)
   - IMPORTANT: First number is MONTH, second is DAY, third is YEAR - just replace dots with slashes

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
- Pour Date: MM.DD.YYYY (09.12.2025) → convert to MM/DD/YYYY (09/12/2025)

Return ONLY a valid JSON object with this structure:
{
  "projectNumber": "255096",
  "markNumber": "H105",
  "idNumber": "1350951",
  "span": {
    "feet": 28,
    "inches": 5.0
  },
  "pourDate": "09/12/2025",
  "strandPattern": "126-70",
  "productWidth": 48
}

IMPORTANT:
- Return null for any field you cannot find
- Be precise with numbers - don't guess
- Always append "-70" to the strand pattern number
- Pour date format: MM.DD.YYYY on tag → MM/DD/YYYY in output (just replace dots with slashes)
- For span inches: if you see "5\"", that means 5.0 inches (decimal)
- Extract ONLY the width (second number) from "8 x 48" pattern

Return ONLY the JSON, no other text.`;

    console.log('[Product Tag Scanner] Starting API call...');

    // For deployed web builds, use our Firebase Cloud Function proxy
    // This avoids SSL certificate issues with the direct proxy URL
    const isWeb = typeof window !== 'undefined';

    const apiUrl = isWeb
      ? 'https://us-central1-precast-qc-tools-web-app.cloudfunctions.net/openaiVisionProxy'
      : (typeof process !== 'undefined' && process.env?.OPENAI_BASE_URL)
        ? `${process.env.OPENAI_BASE_URL}/chat/completions`
        : 'https://api.openai.com.proxy.vibecodeapp.com/v1/chat/completions';

    const apiKey = isWeb ? 'not-needed-for-cloud-function' : 'vibecode-proxy-key';

    console.log('[Product Tag Scanner] Platform:', isWeb ? 'web' : 'native');
    console.log('[Product Tag Scanner] API URL:', apiUrl);
    console.log('[Product Tag Scanner] Making fetch request...');

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Call OpenAI API using fetch
    // For web, the Cloud Function handles the Authorization header
    const requestBody = {
      model: 'gpt-4o-mini', // Using mini for faster processing
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: 'high', // Changed to 'high' for better OCR accuracy
              },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 300, // Reduced from 1000 for faster response
    };

    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    };

    // Add Authorization header only for non-web platforms
    if (!isWeb) {
      (fetchOptions.headers as Record<string, string>)['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(apiUrl, fetchOptions);

    clearTimeout(timeoutId);
    console.log('[Product Tag Scanner] Fetch completed, status:', response.status);
    console.log('[Product Tag Scanner] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Product Tag Scanner] API Error:', response.status, errorText);

      // Show alert to user on web
      if (typeof window !== 'undefined') {
        alert(`API Error (${response.status}): ${errorText.substring(0, 200)}`);
      }

      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('[Product Tag Scanner] Full API response:', JSON.stringify(result, null, 2));

    // Parse the response
    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('[Product Tag Scanner] Raw AI response:', content);

    // Extract JSON from response (in case there's extra text)
    let jsonMatch = content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;

    const parsed = JSON.parse(jsonStr);

    console.log('[Product Tag Scanner] Parsed data:', parsed);

    return {
      success: true,
      data: parsed,
      rawText: content,
    };
  } catch (error) {
    console.error('Product tag parsing error:', error);

    // Show detailed error to user on web for debugging
    if (typeof window !== 'undefined') {
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Scanner Error: ${errorMsg}`);
    }

    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timed out after 30 seconds. Please try again.',
      };
    }

    // Provide helpful error message for 401 errors
    if (error instanceof Error && error.message.includes('401')) {
      return {
        success: false,
        error: 'OpenAI API authentication failed. Please check your API key configuration.',
      };
    }

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
