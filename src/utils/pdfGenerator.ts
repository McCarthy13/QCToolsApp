import { generatePDF } from 'react-native-html-to-pdf';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
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
    // Build HTML content for the PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
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
              padding: 15px;
              background: #f9fafb;
              border-radius: 8px;
            }

            .cross-section img {
              max-width: 100%;
              height: auto;
            }

            .cross-section-label {
              font-size: 12px;
              color: #6b7280;
              margin-bottom: 10px;
              font-weight: 600;
            }
            ` : ''}

            .stats-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              margin-bottom: 20px;
            }

            .stat-card {
              padding: 12px;
              background: #f3f4f6;
              border-radius: 6px;
              border: 1px solid #d1d5db;
            }

            .stat-label {
              font-size: 11px;
              color: #6b7280;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .stat-value {
              font-size: 16px;
              color: #111827;
              font-weight: 700;
              margin-top: 4px;
            }

            .stat-value-small {
              font-size: 12px;
              color: #6b7280;
              margin-top: 2px;
            }

            .strand-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            .strand-table th {
              background: #f3f4f6;
              padding: 10px;
              text-align: left;
              font-size: 11px;
              color: #374151;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              border-bottom: 2px solid #d1d5db;
            }

            .strand-table td {
              padding: 10px;
              border-bottom: 1px solid #e5e7eb;
              font-size: 12px;
            }

            .strand-table tr:hover {
              background: #f9fafb;
            }

            .strand-id {
              font-weight: 700;
              color: #111827;
            }

            .strand-total {
              font-weight: 600;
              color: #1e40af;
            }

            .warning-box {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 12px;
              margin: 15px 0;
              border-radius: 4px;
            }

            .warning-text {
              font-size: 12px;
              color: #92400e;
              font-weight: 600;
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
              ${config.productWidth && config.offcutSide ? `
              <div class="info-item">
                <div class="info-label">Product Width (Cut)</div>
                <div class="info-value">${config.productWidth}"</div>
              </div>
              <div class="info-item">
                <div class="info-label">Offcut Side</div>
                <div class="info-value">${config.offcutSide} (${config.offcutSide === 'L1' ? 'Left removed' : 'Right removed'})</div>
              </div>
              ` : ''}
            </div>
          </div>

          ${crossSectionImageUri ? `
          <!-- Cross Section -->
          <div class="section">
            <h2>Cross Section</h2>
            <div class="cross-section">
              <div class="cross-section-label">Cross Section with Slippage Values</div>
              <img src="${crossSectionImageUri}" alt="Cross Section Diagram" />
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
                  const e1 = end1Value ?? 0;
                  const e2 = end2Value ?? 0;
                  const strandTotal = e1 + e2;
                  const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;
                  const strandSize = getStrandSize ? getStrandSize(strand.strandId) : '';

                  return `
                    <tr>
                      <td class="strand-id">
                        Strand ${strand.strandId}${strandSize ? ` (${strandSize})` : ''}
                      </td>
                      <td>
                        ${strand.leftExceedsOne ? '>' : ''}${end1Value !== null ? end1Value.toFixed(3) : '0.000'}"
                        <span style="color: #9ca3af; font-size: 10px;">
                          (≈${strand.leftExceedsOne ? '>' : ''}${end1Value !== null ? decimalToFraction(end1Value) : '0'})
                        </span>
                      </td>
                      <td>
                        ${strand.rightExceedsOne ? '>' : ''}${end2Value !== null ? end2Value.toFixed(3) : '0.000'}"
                        <span style="color: #9ca3af; font-size: 10px;">
                          (≈${strand.rightExceedsOne ? '>' : ''}${end2Value !== null ? decimalToFraction(end2Value) : '0'})
                        </span>
                      </td>
                      <td class="strand-total">
                        ${hasExceeds ? '>' : ''}${strandTotal.toFixed(3)}"
                        <span style="color: #9ca3af; font-size: 10px;">
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

    // Generate PDF
    const options = {
      html: htmlContent,
      fileName: `Slippage_Report_${config.projectName || 'Unnamed'}_${Date.now()}`,
      directory: 'Documents',
    };

    const file = await generatePDF(options);

    return file.filePath || null;
  } catch (error) {
    console.error('Error generating PDF:', error);
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
