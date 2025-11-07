import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { SlippageData, SlippageConfig } from '../state/slippageHistoryStore';
import { parseMeasurementInput, decimalToFraction } from './cn';

interface PDFGenerationParams {
  slippages: SlippageData[];
  config: SlippageConfig;
  slippageStats: {
    totalSlippage: number;
    totalSlippageEnd1: number;
    totalSlippageEnd2: number;
    totalAvgSlippage: number;
    totalAvgSlippageEnd1: number;
    totalAvgSlippageEnd2: number;
    anyValueExceeds: boolean;
    anyEnd1Exceeds: boolean;
    anyEnd2Exceeds: boolean;
  };
  userEmail: string;
  userName: string;
  crossSectionImageUri?: string;
  getStrandSize?: (strandId: string) => string;
}

export async function generateSlippagePDF(params: PDFGenerationParams): Promise<string | null> {
  const {
    slippages,
    config,
    slippageStats,
    userEmail,
    userName,
    crossSectionImageUri,
    getStrandSize,
  } = params;

  try {
    // Convert image URI to base64 data URI if provided
    let base64Image: string | undefined;
    if (crossSectionImageUri) {
      try {
        console.log('[PDF Generator] Converting image to base64:', crossSectionImageUri);
        const fileInfo = await FileSystem.getInfoAsync(crossSectionImageUri);
        console.log('[PDF Generator] Image file info:', fileInfo);

        if (!fileInfo.exists) {
          console.error('[PDF Generator] Image file does not exist');
          throw new Error('Image file does not exist');
        }

        const base64 = await FileSystem.readAsStringAsync(crossSectionImageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        // Check if base64 string is too large (> 5MB)
        if (base64.length > 5 * 1024 * 1024) {
          console.warn('[PDF Generator] Image too large, skipping');
          base64Image = undefined;
        } else {
          base64Image = `data:image/png;base64,${base64}`;
          console.log('[PDF Generator] Image converted successfully, length:', base64.length);
        }
      } catch (error) {
        console.error('[PDF Generator] Error converting image to base64:', error);
        // Continue without the image if conversion fails
        base64Image = undefined;
      }
    } else {
      console.log('[PDF Generator] No cross-section image provided');
    }

    // Build HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              padding: 30px;
              color: #1f2937;
              line-height: 1.6;
              background-color: #ffffff;
            }

            .header {
              border-bottom: 3px solid #2563eb;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }

            h1 {
              font-size: 28px;
              color: #1e40af;
              margin-bottom: 5px;
            }

            .subtitle {
              color: #6b7280;
              font-size: 12px;
            }

            .section {
              margin-bottom: 25px;
            }

            h2 {
              font-size: 18px;
              color: #374151;
              margin-bottom: 12px;
              padding-bottom: 5px;
              border-bottom: 2px solid #e5e7eb;
            }

            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
              margin-bottom: 15px;
            }

            .info-item {
              padding: 8px;
              background: #f9fafb;
              border-left: 3px solid #2563eb;
            }

            .info-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .info-value {
              font-size: 14px;
              color: #111827;
              font-weight: 600;
              margin-top: 2px;
            }

            ${crossSectionImageUri ? `
            .cross-section {
              text-align: center;
              margin: 20px 0;
              padding: 20px;
              background: #ffffff;
              border-radius: 8px;
              border: 2px solid #e5e7eb;
            }

            .cross-section img {
              max-width: 100%;
              height: auto;
              border-radius: 4px;
            }

            .cross-section-label {
              font-size: 14px;
              color: #374151;
              margin-bottom: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            ` : ''}

            .stats-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }

            .stat-card {
              padding: 15px;
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              border-radius: 8px;
              border: 2px solid #d1d5db;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
            }

            .stat-label {
              font-size: 11px;
              color: #4b5563;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 600;
            }

            .stat-value {
              font-size: 18px;
              color: #1e40af;
              font-weight: 700;
              margin-top: 6px;
            }

            .stat-value-small {
              font-size: 13px;
              color: #6b7280;
              margin-top: 3px;
              font-style: italic;
            }

            .strand-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            .strand-table th {
              background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
              padding: 12px;
              text-align: left;
              font-size: 12px;
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 700;
              border-bottom: 3px solid #1e3a8a;
            }

            .strand-table td {
              padding: 12px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 13px;
            }

            .strand-table tr:nth-child(even) {
              background: #f9fafb;
            }

            .strand-table tr:hover {
              background: #eff6ff;
            }

            .strand-id {
              font-weight: 700;
              color: #1e40af;
            }

            .strand-total {
              font-weight: 700;
              color: #047857;
            }

            .warning-box {
              background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
              border-left: 5px solid #f59e0b;
              padding: 15px;
              margin: 15px 0;
              border-radius: 6px;
              box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
            }

            .warning-text {
              font-size: 13px;
              color: #92400e;
              font-weight: 700;
            }

            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e5e7eb;
              font-size: 11px;
              color: #6b7280;
            }

            .footer-item {
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <!-- Header -->
          <div class="header">
            <h1>Slippage Report</h1>
            <div class="subtitle">
              ${config.projectName || 'Unnamed Project'} • Generated ${new Date().toLocaleDateString()}
            </div>
          </div>

          <!-- Product Details -->
          <div class="section">
            <h2>Product Details</h2>
            <div class="info-grid">
              ${config.projectName ? `
              <div class="info-item">
                <div class="info-label">Project Name</div>
                <div class="info-value">${config.projectName}</div>
              </div>
              ` : ''}
              ${config.projectNumber ? `
              <div class="info-item">
                <div class="info-label">Project Number</div>
                <div class="info-value">${config.projectNumber}</div>
              </div>
              ` : ''}
              ${config.markNumber ? `
              <div class="info-item">
                <div class="info-label">Mark Number</div>
                <div class="info-value">${config.markNumber}</div>
              </div>
              ` : ''}
              ${config.idNumber ? `
              <div class="info-item">
                <div class="info-label">ID Number</div>
                <div class="info-value">${config.idNumber}</div>
              </div>
              ` : ''}
              ${config.span ? `
              <div class="info-item">
                <div class="info-label">Span</div>
                <div class="info-value">${config.span}"</div>
              </div>
              ` : ''}
              <div class="info-item">
                <div class="info-label">Product Type</div>
                <div class="info-value">${config.productType}</div>
              </div>
              ${config.productWidth && config.productSide ? `
              <div class="info-item">
                <div class="info-label">Product Width (Cut)</div>
                <div class="info-value">${config.productWidth}"</div>
              </div>
              <div class="info-item">
                <div class="info-label">Product Side</div>
                <div class="info-value">${config.productSide} (${config.productSide === 'L1' ? 'Left side' : 'Right side'})</div>
              </div>
              ` : ''}
            </div>
          </div>

          ${base64Image ? `
          <!-- Cross Section -->
          <div class="section">
            <h2>Cross Section with Strand Pattern</h2>
            <div class="cross-section">
              <div class="cross-section-label">Strand Arrangement & Cut Width</div>
              <img src="${base64Image}" alt="Cross Section Diagram" />
            </div>
          </div>
          ` : ''}

          <!-- Overall Statistics -->
          <div class="section">
            <h2>Overall Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Slippage (All Values)</div>
                <div class="stat-value">
                  ${slippageStats.anyValueExceeds ? '>' : ''}${slippageStats.totalSlippage.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${slippageStats.anyValueExceeds ? '>' : ''}${decimalToFraction(slippageStats.totalSlippage)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average Slippage (All Values)</div>
                <div class="stat-value">
                  ${slippageStats.anyValueExceeds ? '>' : ''}${slippageStats.totalAvgSlippage.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${slippageStats.anyValueExceeds ? '>' : ''}${decimalToFraction(slippageStats.totalAvgSlippage)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Slippage END 1</div>
                <div class="stat-value">
                  ${slippageStats.anyEnd1Exceeds ? '>' : ''}${slippageStats.totalSlippageEnd1.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${slippageStats.anyEnd1Exceeds ? '>' : ''}${decimalToFraction(slippageStats.totalSlippageEnd1)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average Slippage END 1</div>
                <div class="stat-value">
                  ${slippageStats.anyEnd1Exceeds ? '>' : ''}${slippageStats.totalAvgSlippageEnd1.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${slippageStats.anyEnd1Exceeds ? '>' : ''}${decimalToFraction(slippageStats.totalAvgSlippageEnd1)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total Slippage END 2</div>
                <div class="stat-value">
                  ${slippageStats.anyEnd2Exceeds ? '>' : ''}${slippageStats.totalSlippageEnd2.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${slippageStats.anyEnd2Exceeds ? '>' : ''}${decimalToFraction(slippageStats.totalSlippageEnd2)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average Slippage END 2</div>
                <div class="stat-value">
                  ${slippageStats.anyEnd2Exceeds ? '>' : ''}${slippageStats.totalAvgSlippageEnd2.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${slippageStats.anyEnd2Exceeds ? '>' : ''}${decimalToFraction(slippageStats.totalAvgSlippageEnd2)}
                </div>
              </div>
            </div>

            ${slippageStats.anyValueExceeds ? `
            <div class="warning-box">
              <div class="warning-text">⚠ WARNING: Contains values exceeding 1"</div>
            </div>
            ` : ''}
          </div>

          <!-- Individual Strand Data -->
          <div class="section">
            <h2>Slippage by Strand</h2>
            <table class="strand-table">
              <thead>
                <tr>
                  <th>Strand</th>
                  <th>END 1</th>
                  <th>END 2</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${slippages.map((strand) => {
                  const end1Value = parseMeasurementInput(strand.leftSlippage);
                  const end2Value = parseMeasurementInput(strand.rightSlippage);
                  // Use adjusted values: 1.0 if exceeds, otherwise use parsed value
                  const e1 = strand.leftExceedsOne ? 1.0 : (end1Value ?? 0);
                  const e2 = strand.rightExceedsOne ? 1.0 : (end2Value ?? 0);
                  const strandTotal = e1 + e2;
                  const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;
                  const strandSize = getStrandSize ? getStrandSize(strand.strandId) : '';

                  return `
                    <tr>
                      <td class="strand-id">
                        Strand ${strand.strandId}${strandSize ? ` (${strandSize})` : ''}
                      </td>
                      <td>
                        <span style="color: #047857; font-weight: 600;">
                          ${strand.leftExceedsOne ? '>1.000' : (end1Value !== null ? end1Value.toFixed(3) : '0.000')}"
                        </span>
                        <span style="color: #6b7280; font-size: 11px; margin-left: 5px;">
                          (≈${strand.leftExceedsOne ? '>1' : (end1Value !== null ? decimalToFraction(end1Value) : '0')})
                        </span>
                      </td>
                      <td>
                        <span style="color: #6d28d9; font-weight: 600;">
                          ${strand.rightExceedsOne ? '>1.000' : (end2Value !== null ? end2Value.toFixed(3) : '0.000')}"
                        </span>
                        <span style="color: #6b7280; font-size: 11px; margin-left: 5px;">
                          (≈${strand.rightExceedsOne ? '>1' : (end2Value !== null ? decimalToFraction(end2Value) : '0')})
                        </span>
                      </td>
                      <td class="strand-total">
                        ${hasExceeds ? '>' : ''}${strandTotal.toFixed(3)}"
                        <span style="color: #6b7280; font-size: 11px; margin-left: 5px;">
                          (≈${hasExceeds ? '>' : ''}${decimalToFraction(strandTotal)})
                        </span>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Footer -->
          <div class="footer">
            <div class="footer-item"><strong>Generated by:</strong> ${userName} (${userEmail})</div>
            <div class="footer-item"><strong>Date:</strong> ${new Date().toLocaleString()}</div>
            <div class="footer-item"><strong>Tool:</strong> Slippage Identifier Tool</div>
          </div>
        </body>
      </html>
    `;

    // Generate PDF using expo-print
    console.log('[PDF Generator] Calling expo-print with HTML length:', htmlContent.length);

    let uri: string;
    try {
      const result = await Print.printToFileAsync({
        html: htmlContent,
        width: 612, // 8.5 inches in points
        height: 792, // 11 inches in points
      });
      uri = result.uri;
      console.log('[PDF Generator] PDF created at:', uri);
    } catch (printError) {
      console.error('[PDF Generator] Error in printToFileAsync:', printError);

      // Try again without the image if it was included
      if (base64Image) {
        console.log('[PDF Generator] Retrying without image...');
        base64Image = undefined;

        // Regenerate HTML without image
        const simpleHtml = htmlContent.replace(/<img[^>]*>/g, '').replace(/data:image[^"']*/g, '');

        const result = await Print.printToFileAsync({
          html: simpleHtml,
          width: 612,
          height: 792,
        });
        uri = result.uri;
        console.log('[PDF Generator] PDF created without image at:', uri);
      } else {
        throw printError;
      }
    }

    return uri;
  } catch (error) {
    console.error('[PDF Generator] Error generating PDF:', error);
    if (error instanceof Error) {
      console.error('[PDF Generator] Error stack:', error.stack);
    }
    return null;
  }
}

export async function sharePDF(filePath: string): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Slippage Report',
        UTI: 'com.adobe.pdf',
      });
    } else {
      console.error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw error;
  }
}
