import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { SlippageData, SlippageConfig } from '../state/slippageHistoryStore';
import { parseMeasurementInput, decimalToFraction, formatSpanForPDF } from './cn';

// Web-only PDF generation using jsPDF
let jsPDF: any = null;
let html2canvas: any = null;

// Dynamically import jsPDF and html2canvas only on web
if (typeof window !== 'undefined') {
  import('jspdf').then(module => { jsPDF = module.jsPDF; });
  import('html2canvas').then(module => { html2canvas = module.default; });
}

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
  strandPatternName?: string;
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
    strandPatternName,
  } = params;

  try {
    // Separate bottom and top strand slippages
    const bottomStrands = slippages.filter(s => s.strandId.startsWith('B'));
    const topStrands = slippages.filter(s => s.strandId.startsWith('T'));

    // Calculate bottom strand statistics
    const bottomStats = (() => {
      const values = bottomStrands.map(s => {
        const e1Raw = parseMeasurementInput(s.leftSlippage);
        const e2Raw = parseMeasurementInput(s.rightSlippage);
        const e1 = s.leftExceedsOne ? 1.0 : (e1Raw ?? 0);
        const e2 = s.rightExceedsOne ? 1.0 : (e2Raw ?? 0);
        return {
          e1, e2,
          e1Exceeds: s.leftExceedsOne,
          e2Exceeds: s.rightExceedsOne,
          total: e1 + e2,
        };
      });

      const totalE1 = values.reduce((sum, v) => sum + v.e1, 0);
      const totalE2 = values.reduce((sum, v) => sum + v.e2, 0);
      const totalBoth = values.reduce((sum, v) => sum + v.total, 0);
      const count = values.length;
      const anyE1Exceeds = values.some(v => v.e1Exceeds);
      const anyE2Exceeds = values.some(v => v.e2Exceeds);
      const anyExceeds = anyE1Exceeds || anyE2Exceeds;

      return {
        totalE1,
        totalE2,
        totalBoth,
        avgE1: count > 0 ? totalE1 / count : 0,
        avgE2: count > 0 ? totalE2 / count : 0,
        avgBoth: count > 0 ? totalBoth / count : 0,
        anyE1Exceeds,
        anyE2Exceeds,
        anyExceeds,
      };
    })();

    // Calculate top strand statistics
    const topStats = (() => {
      const values = topStrands.map(s => {
        const e1Raw = parseMeasurementInput(s.leftSlippage);
        const e2Raw = parseMeasurementInput(s.rightSlippage);
        const e1 = s.leftExceedsOne ? 1.0 : (e1Raw ?? 0);
        const e2 = s.rightExceedsOne ? 1.0 : (e2Raw ?? 0);
        return {
          e1, e2,
          e1Exceeds: s.leftExceedsOne,
          e2Exceeds: s.rightExceedsOne,
          total: e1 + e2,
        };
      });

      const totalE1 = values.reduce((sum, v) => sum + v.e1, 0);
      const totalE2 = values.reduce((sum, v) => sum + v.e2, 0);
      const totalBoth = values.reduce((sum, v) => sum + v.total, 0);
      const count = values.length;
      const anyE1Exceeds = values.some(v => v.e1Exceeds);
      const anyE2Exceeds = values.some(v => v.e2Exceeds);
      const anyExceeds = anyE1Exceeds || anyE2Exceeds;

      return {
        totalE1,
        totalE2,
        totalBoth,
        avgE1: count > 0 ? totalE1 / count : 0,
        avgE2: count > 0 ? totalE2 / count : 0,
        avgBoth: count > 0 ? totalBoth / count : 0,
        anyE1Exceeds,
        anyE2Exceeds,
        anyExceeds,
      };
    })();
    // Convert image URI to base64 data URI if provided
    let base64Image: string | undefined;
    const isWebEnv = typeof window !== 'undefined' && typeof document !== 'undefined';

    if (crossSectionImageUri) {
      try {
        console.log('[PDF Generator] Converting image to base64:', crossSectionImageUri);

        if (isWebEnv) {
          // On web, the URI is already a data URI or blob URL from captureRef
          // Check if it's already a data URI
          if (crossSectionImageUri.startsWith('data:')) {
            base64Image = crossSectionImageUri;
            console.log('[PDF Generator] Using data URI directly for web');
          } else if (crossSectionImageUri.startsWith('blob:')) {
            // Convert blob URL to data URI
            console.log('[PDF Generator] Converting blob URL to data URI...');
            const response = await fetch(crossSectionImageUri);
            const blob = await response.blob();
            const reader = new FileReader();
            base64Image = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            console.log('[PDF Generator] Blob converted to data URI');
          } else {
            console.warn('[PDF Generator] Unknown URI format on web:', crossSectionImageUri);
            base64Image = crossSectionImageUri; // Try to use it anyway
          }
        } else {
          // Native platform - use FileSystem
          const fileInfo = await FileSystem.getInfoAsync(crossSectionImageUri);
          console.log('[PDF Generator] Image file info:', fileInfo);

          if (!fileInfo.exists) {
            console.error('[PDF Generator] Image file does not exist');
            throw new Error('Image file does not exist');
          }

          // Read the image as base64
          const base64 = await FileSystem.readAsStringAsync(crossSectionImageUri, {
            encoding: FileSystem.EncodingType.Base64,
          });

          // More aggressive size limits to prevent C++ exceptions
          const maxSizeBytes = 2 * 1024 * 1024; // 2MB limit (reduced from 5MB)
          if (base64.length > maxSizeBytes) {
            console.warn('[PDF Generator] Image too large (>2MB), skipping to prevent errors');
            base64Image = undefined;
          } else {
            // Validate base64 string
            if (!base64 || base64.length === 0) {
              console.warn('[PDF Generator] Invalid base64 data, skipping image');
              base64Image = undefined;
            } else {
              base64Image = `data:image/png;base64,${base64}`;
              console.log('[PDF Generator] Image converted successfully, size:', Math.round(base64.length / 1024), 'KB');
            }
          }
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
              padding: 20px 30px;
              color: #1f2937;
              line-height: 1.2;
              background-color: #ffffff;
              font-size: 10px;
            }

            .header {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 4px;
              margin-bottom: 8px;
            }

            h1 {
              font-size: 18px;
              color: #1e40af;
              margin-bottom: 2px;
            }

            .subtitle {
              color: #6b7280;
              font-size: 9px;
            }

            .section {
              margin-bottom: 8px;
            }

            h2 {
              font-size: 12px;
              color: #374151;
              margin-bottom: 4px;
              padding-bottom: 2px;
              border-bottom: 1px solid #e5e7eb;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 4px;
              margin-bottom: 4px;
            }

            .info-item {
              padding: 3px 4px;
              background: #f9fafb;
              border-left: 2px solid #2563eb;
            }

            .info-label {
              font-size: 7px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.3px;
            }

            .info-value {
              font-size: 9px;
              color: #111827;
              font-weight: 600;
              margin-top: 1px;
            }

            .info-value-sub {
              font-size: 7px;
              color: #6b7280;
              font-style: italic;
              margin-top: 1px;
            }

            ${crossSectionImageUri ? `
            .cross-section {
              text-align: center;
              margin: 6px 0;
              padding: 6px;
              background: #ffffff;
              border-radius: 4px;
              border: 1px solid #e5e7eb;
            }

            .cross-section img {
              max-width: 100%;
              max-height: 120px;
              height: auto;
              border-radius: 2px;
            }
            ` : ''}

            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 4px;
              margin-bottom: 6px;
            }

            .stat-card {
              padding: 4px 6px;
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              border-radius: 4px;
              border: 1px solid #d1d5db;
            }

            .stat-label {
              font-size: 7px;
              color: #4b5563;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              font-weight: 600;
              margin-bottom: 2px;
            }

            .stat-value {
              font-size: 11px;
              color: #1e40af;
              font-weight: 700;
              margin-top: 2px;
            }

            .stat-value-small {
              font-size: 8px;
              color: #6b7280;
              margin-top: 1px;
              font-style: italic;
            }

            .strand-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 4px;
            }

            .strand-table th {
              background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
              padding: 3px 4px;
              text-align: left;
              font-size: 8px;
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              font-weight: 700;
              border-bottom: 1px solid #1e3a8a;
            }

            .strand-table td {
              padding: 3px 4px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 8px;
            }

            .strand-table tr:nth-child(even) {
              background: #f9fafb;
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
              border-left: 3px solid #f59e0b;
              padding: 4px 6px;
              margin: 6px 0;
              border-radius: 3px;
            }

            .warning-text {
              font-size: 8px;
              color: #92400e;
              font-weight: 700;
            }

            .footer {
              margin-top: 8px;
              padding-top: 6px;
              border-top: 1px solid #e5e7eb;
              font-size: 7px;
              color: #6b7280;
            }

            .footer-item {
              margin-bottom: 2px;
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
              <div class="info-item">
                <div class="info-label">Project Number</div>
                <div class="info-value">${config.projectNumber || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Project Name</div>
                <div class="info-value">${config.projectName || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Mark Number</div>
                <div class="info-value">${config.markNumber || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">ID Number</div>
                <div class="info-value">${config.idNumber || ''}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Product Type</div>
                <div class="info-value">${config.productType}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Strand Pattern</div>
                <div class="info-value">${strandPatternName || config.strandPattern}</div>
              </div>
              ${config.span ? (() => {
                const spanFormatted = formatSpanForPDF(config.span);
                return `
              <div class="info-item">
                <div class="info-label">Span</div>
                <div class="info-value">${spanFormatted.main}</div>
                <div class="info-value-sub">${spanFormatted.fraction}</div>
              </div>
                `;
              })() : `
              <div class="info-item">
                <div class="info-label">Span</div>
                <div class="info-value">-</div>
              </div>
              `}
              <div class="info-item">
                <div class="info-label">Width${config.productWidth ? ' (Cut)' : ''}</div>
                <div class="info-value">${config.productWidth ? `${config.productWidth}"` : '-'}</div>
              </div>
            </div>
          </div>

          ${base64Image ? `
          <!-- Cross Section -->
          <div class="section">
            <h2>Cross Section with Strand Pattern</h2>
            <div class="cross-section">
              <img src="${base64Image}" alt="Cross Section Diagram" />
            </div>
          </div>
          ` : ''}

          <!-- Bottom Strand Statistics -->
          ${bottomStrands.length > 0 ? `
          <div class="section">
            <h2 style="color: #059669;">Bottom Strand Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Slippage (Both Ends)</div>
                <div class="stat-value">
                  ${bottomStats.anyExceeds ? '>' : ''}${bottomStats.totalBoth.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${bottomStats.anyExceeds ? '>' : ''}${decimalToFraction(bottomStats.totalBoth)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total E1 Slippage</div>
                <div class="stat-value">
                  ${bottomStats.anyE1Exceeds ? '>' : ''}${bottomStats.totalE1.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${bottomStats.anyE1Exceeds ? '>' : ''}${decimalToFraction(bottomStats.totalE1)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total E2 Slippage</div>
                <div class="stat-value">
                  ${bottomStats.anyE2Exceeds ? '>' : ''}${bottomStats.totalE2.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${bottomStats.anyE2Exceeds ? '>' : ''}${decimalToFraction(bottomStats.totalE2)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average Slippage (Both Ends)</div>
                <div class="stat-value">
                  ${bottomStats.anyExceeds ? '>' : ''}${bottomStats.avgBoth.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${bottomStats.anyExceeds ? '>' : ''}${decimalToFraction(bottomStats.avgBoth)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average E1 Slippage</div>
                <div class="stat-value">
                  ${bottomStats.anyE1Exceeds ? '>' : ''}${bottomStats.avgE1.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${bottomStats.anyE1Exceeds ? '>' : ''}${decimalToFraction(bottomStats.avgE1)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average E2 Slippage</div>
                <div class="stat-value">
                  ${bottomStats.anyE2Exceeds ? '>' : ''}${bottomStats.avgE2.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${bottomStats.anyE2Exceeds ? '>' : ''}${decimalToFraction(bottomStats.avgE2)}
                </div>
              </div>
            </div>
            ${bottomStats.anyExceeds ? `
            <div class="warning-box">
              <div class="warning-text">⚠ WARNING: Bottom strands contain values exceeding 1"</div>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <!-- Top Strand Statistics -->
          ${topStrands.length > 0 ? `
          <div class="section">
            <h2 style="color: #2563eb;">Top Strand Statistics</h2>
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-label">Total Slippage (Both Ends)</div>
                <div class="stat-value">
                  ${topStats.anyExceeds ? '>' : ''}${topStats.totalBoth.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${topStats.anyExceeds ? '>' : ''}${decimalToFraction(topStats.totalBoth)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total E1 Slippage</div>
                <div class="stat-value">
                  ${topStats.anyE1Exceeds ? '>' : ''}${topStats.totalE1.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${topStats.anyE1Exceeds ? '>' : ''}${decimalToFraction(topStats.totalE1)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Total E2 Slippage</div>
                <div class="stat-value">
                  ${topStats.anyE2Exceeds ? '>' : ''}${topStats.totalE2.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${topStats.anyE2Exceeds ? '>' : ''}${decimalToFraction(topStats.totalE2)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average Slippage (Both Ends)</div>
                <div class="stat-value">
                  ${topStats.anyExceeds ? '>' : ''}${topStats.avgBoth.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${topStats.anyExceeds ? '>' : ''}${decimalToFraction(topStats.avgBoth)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average E1 Slippage</div>
                <div class="stat-value">
                  ${topStats.anyE1Exceeds ? '>' : ''}${topStats.avgE1.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${topStats.anyE1Exceeds ? '>' : ''}${decimalToFraction(topStats.avgE1)}
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-label">Average E2 Slippage</div>
                <div class="stat-value">
                  ${topStats.anyE2Exceeds ? '>' : ''}${topStats.avgE2.toFixed(3)}"
                </div>
                <div class="stat-value-small">
                  ≈${topStats.anyE2Exceeds ? '>' : ''}${decimalToFraction(topStats.avgE2)}
                </div>
              </div>
            </div>
            ${topStats.anyExceeds ? `
            <div class="warning-box">
              <div class="warning-text">⚠ WARNING: Top strands contain values exceeding 1"</div>
            </div>
            ` : ''}
          </div>
          ` : ''}

          <!-- Individual Strand Data -->
          <div class="section">
            <h2>Slippage by Strand</h2>

            ${slippages.some(s => s.strandId.startsWith('B')) ? `
              <h3 style="font-size: 13px; color: #059669; margin: 10px 0 5px 0; font-weight: 600;">Bottom Strands</h3>
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
                  ${slippages.filter(s => s.strandId.startsWith('B')).map((strand) => {
                    const end1Value = parseMeasurementInput(strand.leftSlippage);
                    const end2Value = parseMeasurementInput(strand.rightSlippage);
                    // Use adjusted values: 1.0 if exceeds, otherwise use parsed value
                    const e1 = strand.leftExceedsOne ? 1.0 : (end1Value ?? 0);
                    const e2 = strand.rightExceedsOne ? 1.0 : (end2Value ?? 0);
                    const strandTotal = e1 + e2;
                    const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;
                    const strandSize = getStrandSize ? getStrandSize(strand.strandId) : '';
                    const strandNum = strand.strandId.substring(1);

                    return `
                      <tr>
                        <td class="strand-id">
                          Bottom Strand ${strandNum}${strandSize ? ` (${strandSize})` : ''}
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
            ` : ''}

            ${slippages.some(s => s.strandId.startsWith('T')) ? `
              <h3 style="font-size: 13px; color: #2563eb; margin: 15px 0 5px 0; font-weight: 600;">Top Strands</h3>
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
                  ${slippages.filter(s => s.strandId.startsWith('T')).map((strand) => {
                    const end1Value = parseMeasurementInput(strand.leftSlippage);
                    const end2Value = parseMeasurementInput(strand.rightSlippage);
                    // Use adjusted values: 1.0 if exceeds, otherwise use parsed value
                    const e1 = strand.leftExceedsOne ? 1.0 : (end1Value ?? 0);
                    const e2 = strand.rightExceedsOne ? 1.0 : (end2Value ?? 0);
                    const strandTotal = e1 + e2;
                    const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;
                    const strandSize = getStrandSize ? getStrandSize(strand.strandId) : '';
                    const strandNum = strand.strandId.substring(1);

                    return `
                      <tr>
                        <td class="strand-id">
                          Top Strand ${strandNum}${strandSize ? ` (${strandSize})` : ''}
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
            ` : ''}
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

    // Generate PDF
    console.log('[PDF Generator] Generating PDF...');
    console.log('[PDF Generator] Platform:', Platform.OS);

    // Check if we're on web
    const isWeb = typeof window !== 'undefined' && typeof document !== 'undefined';

    if (isWeb) {
      console.log('[PDF Generator] Web platform detected - using jsPDF for direct PDF download...');

      // Wait for both libraries to load
      let attempts = 0;
      while ((!jsPDF || !html2canvas) && attempts < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!jsPDF || !html2canvas) {
        console.error('[PDF Generator] Libraries not loaded, falling back to print dialog');
        await Print.printAsync({ html: htmlContent });
        return 'web-print-dialog-opened';
      }

      try {
        console.log('[PDF Generator] Creating temporary element for rendering...');

        // Create a temporary div to render the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '816px'; // Letter width at 96dpi
        tempDiv.style.backgroundColor = 'white';
        document.body.appendChild(tempDiv);

        // Wait a moment for styles to apply
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('[PDF Generator] Rendering HTML to canvas...');

        // Convert HTML to canvas
        const canvas = await html2canvas(tempDiv, {
          scale: 2, // Higher quality
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
        });

        console.log('[PDF Generator] Creating PDF from canvas...');

        // Create PDF and add the canvas as an image
        const pdf = new jsPDF('p', 'pt', 'letter');
        const imgData = canvas.toDataURL('image/png');

        const pdfWidth = 612; // 8.5 inches in points
        const pdfHeight = 792; // 11 inches in points

        // Calculate dimensions to fit the content
        const imgWidth = pdfWidth;
        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        // If content is longer than one page, split it
        let heightLeft = imgHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // Add additional pages if needed
        while (heightLeft > 0) {
          position = heightLeft - imgHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
          heightLeft -= pdfHeight;
        }

        // Save the PDF
        pdf.save(`Slippage-Report-${Date.now()}.pdf`);

        // Cleanup
        document.body.removeChild(tempDiv);

        console.log('[PDF Generator] PDF downloaded successfully');
        return 'web-pdf-downloaded';
      } catch (error: any) {
        console.error('[PDF Generator] PDF generation failed:', error);
        console.log('[PDF Generator] Falling back to print dialog');
        await Print.printAsync({ html: htmlContent });
        return 'web-print-dialog-opened';
      }
    }

    // For native platforms (iOS/Android), generate actual PDF file
    let uri: string;
    try {
      // First attempt: try with image if available
      const result = await Print.printToFileAsync({
        html: htmlContent,
        width: 612, // 8.5 inches in points
        height: 792, // 11 inches in points
      });
      uri = result.uri;
      console.log('[PDF Generator] PDF created successfully at:', uri);
    } catch (printError: any) {
      console.error('[PDF Generator] First attempt failed:', printError);
      console.error('[PDF Generator] Error message:', printError?.message);
      console.error('[PDF Generator] Error name:', printError?.name);

      // If the error is a C++ exception or related to image processing, try without image
      if (base64Image && (
        printError?.message?.includes('C++') ||
        printError?.message?.includes('exception') ||
        printError?.message?.includes('image') ||
        printError?.message?.includes('memory')
      )) {
        console.log('[PDF Generator] Detected image-related error, retrying without image...');
        base64Image = undefined;

        // Regenerate HTML without image sections
        const htmlWithoutImage = htmlContent
          .replace(/<img[^>]*>/gi, '')
          .replace(/data:image\/[^"'\s]*/gi, '')
          .replace(/<!-- Cross Section -->[\s\S]*?<\/div>\s*<\/div>/i, '');

        try {
          const retryResult = await Print.printToFileAsync({
            html: htmlWithoutImage,
            width: 612,
            height: 792,
          });
          uri = retryResult.uri;
          console.log('[PDF Generator] PDF created successfully without image at:', uri);
        } catch (retryError) {
          console.error('[PDF Generator] Retry failed:', retryError);
          throw new Error('Failed to generate PDF even without images');
        }
      } else {
        // If it's not an image-related error, throw the original error
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
