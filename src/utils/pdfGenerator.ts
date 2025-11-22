import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { SlippageData, SlippageConfig } from '../state/slippageHistoryStore';
import { parseMeasurementInput, decimalToFraction, formatSpanForPDF } from './cn';
import { StrandPatternComparison, formatComparisonForPDF } from './strandPatternComparison';

// Web-only PDF generation using jsPDF
let jsPDF: any = null;
let html2canvas: any = null;
let librariesLoading: Promise<void> | null = null;

// Dynamically import jsPDF and html2canvas only on web
if (Platform.OS === 'web') {
  librariesLoading = (async () => {
    try {
      const jsPDFModule = await import('jspdf');
      jsPDF = jsPDFModule.jsPDF;
      console.log('[PDF Generator] jsPDF loaded successfully');

      const html2canvasModule = await import('html2canvas');
      html2canvas = html2canvasModule.default;
      console.log('[PDF Generator] html2canvas loaded successfully');
    } catch (err) {
      console.error('[PDF Generator] Failed to load PDF libraries:', err);
      throw err;
    }
  })();
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
  bottomPatternComparison?: StrandPatternComparison | null;
  topPatternComparison?: StrandPatternComparison | null;
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
    bottomPatternComparison,
    topPatternComparison,
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
            @page {
              size: letter;
              margin: 0;
            }

            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body, .pdf-container {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              padding: 12px 18px;
              color: #1f2937;
              line-height: 1.3;
              background-color: #ffffff;
              font-size: 9px;
              word-spacing: 0.2em;
              letter-spacing: 0.02em;
              max-width: 612px;
              overflow: hidden;
            }

            /* Responsive font and layout sizing */
            @media screen and (min-width: 768px) {
              /* Tablets - slightly larger text */
              body, .pdf-container {
                font-size: 10px;
                padding: 16px 24px;
              }
              h1 {
                font-size: 16px !important;
              }
              h2 {
                font-size: 11px !important;
              }
              .strand-table th {
                font-size: 8px !important;
              }
              .strand-table td {
                font-size: 8.5px !important;
              }
            }

            @media screen and (min-width: 1024px) {
              /* Desktop - much larger text for readability */
              body, .pdf-container {
                font-size: 12px;
                padding: 20px 30px;
                max-width: 800px;
              }
              h1 {
                font-size: 20px !important;
              }
              h2 {
                font-size: 14px !important;
              }
              .strand-table th {
                font-size: 10px !important;
                padding: 5px 6px !important;
              }
              .strand-table td {
                font-size: 11px !important;
                padding: 5px 6px !important;
              }
              .info-label {
                font-size: 8px !important;
              }
              .info-value {
                font-size: 10px !important;
              }
              .stat-label {
                font-size: 8px !important;
              }
              .stat-value {
                font-size: 11px !important;
              }
            }

            .header {
              border-bottom: 2px solid #2563eb;
              padding-bottom: 3px;
              margin-bottom: 4px;
            }

            h1 {
              font-size: 14px;
              color: #1e40af;
              margin-bottom: 2px;
              line-height: 1.3;
              letter-spacing: 0.05em;
              word-spacing: 0.2em;
            }

            .subtitle {
              color: #6b7280;
              font-size: 7.5px;
              line-height: 1.3;
              word-spacing: 0.15em;
              letter-spacing: 0.02em;
            }

            .section {
              margin-bottom: 4px;
            }

            h2 {
              font-size: 9px;
              color: #374151;
              margin-bottom: 2px;
              padding-bottom: 2px;
              border-bottom: 1px solid #e5e7eb;
              line-height: 1.3;
              letter-spacing: 0.05em;
              word-spacing: 0.2em;
            }

            .info-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 3px;
              margin-bottom: 3px;
            }

            .info-item {
              padding: 3px 4px;
              background: #f9fafb;
              border-left: 2px solid #2563eb;
            }

            .info-label {
              font-size: 6.5px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              word-spacing: 0.2em;
              line-height: 1.3;
              margin-bottom: 1px;
            }

            .info-value {
              font-size: 8px;
              color: #111827;
              font-weight: 600;
              margin-top: 1px;
              line-height: 1.3;
              letter-spacing: 0.03em;
              word-spacing: 0.15em;
            }

            .info-value-sub {
              font-size: 6.5px;
              color: #6b7280;
              font-style: italic;
              margin-top: 1px;
              line-height: 1.3;
              letter-spacing: 0.02em;
            }

            ${crossSectionImageUri ? `
            .cross-section {
              text-align: center;
              margin: 4px auto;
              padding: 4px;
              background: #ffffff;
              border-radius: 3px;
              border: 1px solid #e5e7eb;
              display: flex;
              justify-content: center;
              align-items: center;
            }

            .cross-section img {
              max-width: 95%;
              max-height: 180px;
              height: auto;
              border-radius: 2px;
              display: block;
              margin: 0 auto;
            }

            /* Responsive sizing for different devices */
            @media screen and (min-width: 768px) {
              /* Tablets and larger - increase cross-section size */
              .cross-section img {
                max-height: 300px;
                max-width: 90%;
              }
            }

            @media screen and (min-width: 1024px) {
              /* Desktop - significantly larger cross-section */
              .cross-section {
                padding: 8px;
              }
              .cross-section img {
                max-height: 500px;
                max-width: 85%;
              }
            }

            @media screen and (max-width: 767px) {
              /* Mobile devices - ensure cross-section fits with legend */
              .cross-section {
                padding: 2px;
                margin: 2px auto;
              }
              .cross-section img {
                max-height: 180px;
                max-width: 100%;
              }
            }
            ` : ''}

            .stats-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 3px;
              margin-bottom: 4px;
            }

            .stat-card {
              padding: 3px 4px;
              background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
              border-radius: 4px;
              border: 1px solid #d1d5db;
            }

            .stat-label {
              font-size: 6px;
              color: #4b5563;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              word-spacing: 0.2em;
              font-weight: 600;
              margin-bottom: 1px;
              line-height: 1.3;
            }

            .stat-value {
              font-size: 8.5px;
              color: #1e40af;
              font-weight: 700;
              margin-top: 1px;
              line-height: 1.2;
              letter-spacing: 0.02em;
            }

            .stat-value-small {
              font-size: 6.5px;
              color: #6b7280;
              margin-top: 1px;
              font-style: italic;
              line-height: 1.3;
              letter-spacing: 0.01em;
            }

            .strand-table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-top: 3px;
            }

            .strand-table th {
              background: #000000;
              padding: 3px 4px;
              text-align: left;
              font-size: 6.5px;
              color: #ffffff;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              word-spacing: 0.2em;
              font-weight: 700;
              border-bottom: 2px solid #000000;
              line-height: 1.4;
              vertical-align: middle;
              white-space: nowrap;
            }

            .strand-table td {
              padding: 3px 4px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 7px;
              line-height: 1.4;
              vertical-align: middle;
              letter-spacing: 0.02em;
              word-spacing: 0.1em;
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
              margin: 5px 0;
              border-radius: 3px;
            }

            .warning-text {
              font-size: 7.5px;
              color: #92400e;
              font-weight: 700;
              line-height: 1.4;
              letter-spacing: 0.02em;
              word-spacing: 0.15em;
            }

            .footer {
              margin-top: 5px;
              padding-top: 3px;
              border-top: 1px solid #e5e7eb;
              font-size: 6px;
              color: #6b7280;
              line-height: 1.4;
              letter-spacing: 0.02em;
              word-spacing: 0.15em;
            }

            .footer-item {
              margin-bottom: 1px;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <div class="pdf-container">
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

          <!-- Design vs Cast Pattern Comparison -->
          ${(bottomPatternComparison || topPatternComparison) ? `
          <div class="section">
            <h2>Design vs Cast Pattern Analysis</h2>

            ${bottomPatternComparison ? `
              <div style="margin-bottom: 6px;">
                <div style="padding: 5px 6px; border-radius: 4px; background: ${bottomPatternComparison.hasDifferences ? '#FEE2E2' : '#D1FAE5'}; border: 1px solid ${bottomPatternComparison.hasDifferences ? '#FCA5A5' : '#6EE7B7'};">
                  <div style="font-size: 8px; font-weight: 700; color: ${bottomPatternComparison.hasDifferences ? '#991B1B' : '#047857'}; margin-bottom: 3px;">
                    Bottom Strands: ${bottomPatternComparison.hasDifferences ? '⚠ DIFFERENCES FOUND' : '✓ PATTERNS MATCH'}
                  </div>
                  <div style="font-size: 7px; color: #4B5563; margin-bottom: 2px;">
                    <strong>Design:</strong> ${bottomPatternComparison.designPatternName || 'Not specified'}
                  </div>
                  <div style="font-size: 7px; color: #4B5563; margin-bottom: 3px;">
                    <strong>Cast:</strong> ${bottomPatternComparison.castPatternName || 'Not specified'}
                  </div>
                  <div style="font-size: 7.5px; color: ${bottomPatternComparison.hasDifferences ? '#7F1D1D' : '#065F46'}; font-weight: ${bottomPatternComparison.hasDifferences ? '600' : 'normal'};">
                    ${bottomPatternComparison.summary}
                  </div>
                  ${bottomPatternComparison.hasDifferences && bottomPatternComparison.differences.length > 0 ? formatComparisonForPDF(bottomPatternComparison) : ''}
                </div>
              </div>
            ` : ''}

            ${topPatternComparison ? `
              <div style="margin-bottom: 6px;">
                <div style="padding: 5px 6px; border-radius: 4px; background: ${topPatternComparison.hasDifferences ? '#FEE2E2' : '#D1FAE5'}; border: 1px solid ${topPatternComparison.hasDifferences ? '#FCA5A5' : '#6EE7B7'};">
                  <div style="font-size: 8px; font-weight: 700; color: ${topPatternComparison.hasDifferences ? '#991B1B' : '#047857'}; margin-bottom: 3px;">
                    Top Strands: ${topPatternComparison.hasDifferences ? '⚠ DIFFERENCES FOUND' : '✓ PATTERNS MATCH'}
                  </div>
                  <div style="font-size: 7px; color: #4B5563; margin-bottom: 2px;">
                    <strong>Design:</strong> ${topPatternComparison.designPatternName || 'Not specified'}
                  </div>
                  <div style="font-size: 7px; color: #4B5563; margin-bottom: 3px;">
                    <strong>Cast:</strong> ${topPatternComparison.castPatternName || 'Not specified'}
                  </div>
                  <div style="font-size: 7.5px; color: ${topPatternComparison.hasDifferences ? '#7F1D1D' : '#065F46'}; font-weight: ${topPatternComparison.hasDifferences ? '600' : 'normal'};">
                    ${topPatternComparison.summary}
                  </div>
                  ${topPatternComparison.hasDifferences && topPatternComparison.differences.length > 0 ? formatComparisonForPDF(topPatternComparison) : ''}
                </div>
              </div>
            ` : ''}
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
                        <td style="font-weight: 700; color: #059669;">
                          Bottom Strand ${strandNum}${strandSize ? ` (${strandSize})` : ''}
                        </td>
                        <td>
                          <span style="color: #111827; font-weight: 600;">
                            ${strand.leftExceedsOne ? '>1.000' : (end1Value !== null ? end1Value.toFixed(3) : '0.000')}"
                          </span>
                          <span style="color: #6b7280; font-size: 11px; margin-left: 5px;">
                            (≈${strand.leftExceedsOne ? '>1' : (end1Value !== null ? decimalToFraction(end1Value) : '0')})
                          </span>
                        </td>
                        <td>
                          <span style="color: #111827; font-weight: 600;">
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
                        <td style="font-weight: 700; color: #2563eb;">
                          Top Strand ${strandNum}${strandSize ? ` (${strandSize})` : ''}
                        </td>
                        <td>
                          <span style="color: #111827; font-weight: 600;">
                            ${strand.leftExceedsOne ? '>1.000' : (end1Value !== null ? end1Value.toFixed(3) : '0.000')}"
                          </span>
                          <span style="color: #6b7280; font-size: 11px; margin-left: 5px;">
                            (≈${strand.leftExceedsOne ? '>1' : (end1Value !== null ? decimalToFraction(end1Value) : '0')})
                          </span>
                        </td>
                        <td>
                          <span style="color: #111827; font-weight: 600;">
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
          </div>
        </body>
      </html>
    `;

    // Generate PDF
    console.log('[PDF Generator] Generating PDF...');
    console.log('[PDF Generator] Platform:', Platform.OS);

    // Check if we're on web
    const isWeb = Platform.OS === 'web';

    if (isWeb) {
      console.log('[PDF Generator] Web platform detected - using jsPDF for direct PDF download...');

      // Wait for libraries to load if they haven't already
      if (librariesLoading) {
        try {
          console.log('[PDF Generator] Waiting for libraries to load...');
          await librariesLoading;
          console.log('[PDF Generator] Libraries loaded successfully');
        } catch (err) {
          console.error('[PDF Generator] Failed to load libraries:', err);
          console.log('[PDF Generator] Falling back to print dialog');
          await Print.printAsync({ html: htmlContent });
          return 'web-print-dialog-opened';
        }
      }

      if (!jsPDF || !html2canvas) {
        console.error('[PDF Generator] Libraries not available, falling back to print dialog');
        await Print.printAsync({ html: htmlContent });
        return 'web-print-dialog-opened';
      }

      try {
        console.log('[PDF Generator] Creating temporary element for rendering...');
        console.log('[PDF Generator] Has base64Image:', !!base64Image);
        if (base64Image) {
          console.log('[PDF Generator] Image data length:', base64Image.length);
          console.log('[PDF Generator] Image prefix:', base64Image.substring(0, 50));
        }

        // Create a temporary div to render the HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.width = '612px'; // Letter width in points (8.5" at 72dpi)
        tempDiv.style.backgroundColor = 'white';
        document.body.appendChild(tempDiv);

        // Wait for images to load if there's a base64 image
        if (base64Image) {
          console.log('[PDF Generator] Waiting for image to load...');
          const images = tempDiv.querySelectorAll('img');
          if (images.length > 0) {
            console.log('[PDF Generator] Found', images.length, 'images in HTML');
            await Promise.all(
              Array.from(images).map(img => {
                return new Promise((resolve) => {
                  if (img.complete) {
                    console.log('[PDF Generator] Image already loaded');
                    resolve(true);
                  } else {
                    img.onload = () => {
                      console.log('[PDF Generator] Image loaded successfully');
                      resolve(true);
                    };
                    img.onerror = () => {
                      console.error('[PDF Generator] Image failed to load');
                      resolve(false);
                    };
                    // Timeout after 5 seconds
                    setTimeout(() => resolve(false), 5000);
                  }
                });
              })
            );
          }
        }

        // Wait a moment for styles to apply
        await new Promise(resolve => setTimeout(resolve, 200));

        console.log('[PDF Generator] Rendering HTML to canvas...');

        // Convert HTML to canvas with better error handling
        const canvas = await html2canvas(tempDiv, {
          scale: 2, // Higher quality
          useCORS: true,
          allowTaint: true,
          logging: true, // Enable logging to debug
          backgroundColor: '#ffffff',
          onclone: (clonedDoc: Document) => {
            console.log('[PDF Generator] Document cloned for rendering');
            // Ensure images are visible in the clone
            const clonedImages = clonedDoc.querySelectorAll('img');
            console.log('[PDF Generator] Found', clonedImages.length, 'images in cloned document');
          },
        });

        console.log('[PDF Generator] Canvas created successfully');
        console.log('[PDF Generator] Canvas dimensions:', canvas.width, 'x', canvas.height);

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

        // Save the PDF with custom naming format: Slippage Report Project # - Mark # - ID #
        let filename = 'Slippage-Report';
        if (config.projectNumber || config.markNumber || config.idNumber) {
          const parts = [
            config.projectNumber,
            config.markNumber,
            config.idNumber
          ].filter(part => part && part.trim() !== '');

          if (parts.length > 0) {
            filename = 'Slippage Report ' + parts.join(' - ');
          }
        }

        // Add timestamp if no custom name available
        if (filename === 'Slippage-Report') {
          filename = `${filename}-${Date.now()}`;
        }

        pdf.save(`${filename}.pdf`);

        // Cleanup
        document.body.removeChild(tempDiv);

        console.log('[PDF Generator] PDF downloaded successfully');
        return 'web-pdf-downloaded';
      } catch (error: any) {
        console.error('[PDF Generator] PDF generation failed:', error);
        console.error('[PDF Generator] Error name:', error?.name);
        console.error('[PDF Generator] Error message:', error?.message);
        if (error?.stack) {
          console.error('[PDF Generator] Error stack:', error.stack);
        }

        // Try to clean up the temp div if it exists
        try {
          const existingTempDiv = document.querySelector('[style*="-9999px"]');
          if (existingTempDiv) {
            document.body.removeChild(existingTempDiv);
          }
        } catch (cleanupError) {
          console.error('[PDF Generator] Cleanup failed:', cleanupError);
        }

        console.log('[PDF Generator] Falling back to print dialog');
        await Print.printAsync({ html: htmlContent });
        return 'web-print-dialog-opened';
      }
    }

    // For native platforms (iOS/Android), generate actual PDF file
    let uri: string;
    try {
      console.log('[PDF Generator] Starting PDF generation...');
      console.log('[PDF Generator] HTML length:', htmlContent.length, 'characters');
      console.log('[PDF Generator] Has base64 image:', !!base64Image);

      // Validate HTML before printing
      if (!htmlContent || htmlContent.length === 0) {
        throw new Error('HTML content is empty');
      }

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

      // Check if error is related to image or memory issues
      const errorMessage = printError?.message?.toLowerCase() || '';
      const isImageError = base64Image && (
        errorMessage.includes('c++') ||
        errorMessage.includes('exception') ||
        errorMessage.includes('image') ||
        errorMessage.includes('memory') ||
        errorMessage.includes('printing did not complete')
      );

      if (isImageError) {
        console.log('[PDF Generator] Detected potential image-related error, retrying without image...');
        base64Image = undefined;

        // Regenerate HTML without image sections
        const htmlWithoutImage = htmlContent
          .replace(/<img[^>]*>/gi, '')
          .replace(/data:image\/[^"'\s]*/gi, '')
          .replace(/<!-- Cross Section -->[\s\S]*?<\/div>\s*<\/div>/i, '');

        console.log('[PDF Generator] Retrying without image, HTML length:', htmlWithoutImage.length);

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
          throw new Error('Failed to generate PDF even without images: ' + (retryError as Error)?.message);
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
