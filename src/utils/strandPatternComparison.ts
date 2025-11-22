import { CustomStrandPattern } from '../state/strandPatternStore';

export interface StrandDifference {
  strandIndex: number; // 1-based strand number
  position: 'Bottom' | 'Top';
  issueType: 'missing_in_cast' | 'missing_in_design' | 'size_mismatch' | 'location_mismatch';
  designSize?: string;
  castSize?: string;
  designLocation?: { x: number; y: number };
  castLocation?: { x: number; y: number };
  description: string;
}

export interface StrandPatternComparison {
  hasDesignPattern: boolean;
  hasCastPattern: boolean;
  designPatternName?: string;
  castPatternName?: string;
  designPatternId?: string;
  castPatternId?: string;
  differences: StrandDifference[];
  hasDifferences: boolean;
  summary: string;
}

/**
 * Compares design and cast strand patterns and identifies differences
 * @param designPattern - The design strand pattern (expected pattern)
 * @param castPattern - The cast strand pattern (actual pattern)
 * @param position - Whether this is a 'Bottom' or 'Top' strand comparison
 * @returns Comparison results with identified differences
 */
export function compareStrandPatterns(
  designPattern: CustomStrandPattern | undefined,
  castPattern: CustomStrandPattern | undefined,
  position: 'Bottom' | 'Top'
): StrandPatternComparison {
  const result: StrandPatternComparison = {
    hasDesignPattern: !!designPattern,
    hasCastPattern: !!castPattern,
    designPatternName: designPattern?.name,
    castPatternName: castPattern?.name,
    designPatternId: designPattern?.id,
    castPatternId: castPattern?.id,
    differences: [],
    hasDifferences: false,
    summary: '',
  };

  // If both patterns are missing or identical, no comparison needed
  if (!designPattern && !castPattern) {
    result.summary = `No ${position.toLowerCase()} strand pattern specified`;
    return result;
  }

  if (!designPattern) {
    result.summary = `No design pattern specified for ${position.toLowerCase()} strands`;
    return result;
  }

  if (!castPattern) {
    result.summary = `No cast pattern specified for ${position.toLowerCase()} strands`;
    return result;
  }

  // If the patterns are the same, no differences
  if (designPattern.id === castPattern.id) {
    result.summary = `Design and cast patterns match (${designPattern.name})`;
    return result;
  }

  // Compare strand counts
  const designStrandCount =
    designPattern.strand_3_8 + designPattern.strand_1_2 + designPattern.strand_0_6;
  const castStrandCount =
    castPattern.strand_3_8 + castPattern.strand_1_2 + castPattern.strand_0_6;

  // Compare strand sizes
  const designSizes = designPattern.strandSizes || [];
  const castSizes = castPattern.strandSizes || [];

  const maxLength = Math.max(designSizes.length, castSizes.length);

  for (let i = 0; i < maxLength; i++) {
    const strandIndex = i + 1;
    const designSize = designSizes[i];
    const castSize = castSizes[i];
    const designCoord = designPattern.strandCoordinates?.[i];
    const castCoord = castPattern.strandCoordinates?.[i];

    // Check for missing strands
    if (designSize && !castSize) {
      result.differences.push({
        strandIndex,
        position,
        issueType: 'missing_in_cast',
        designSize: designSize ? `${designSize}"` : undefined,
        description: `${position} Strand ${strandIndex} (${designSize}") exists in design but missing in cast pattern`,
      });
    } else if (!designSize && castSize) {
      result.differences.push({
        strandIndex,
        position,
        issueType: 'missing_in_design',
        castSize: castSize ? `${castSize}"` : undefined,
        description: `${position} Strand ${strandIndex} (${castSize}") exists in cast but missing in design pattern`,
      });
    } else if (designSize && castSize) {
      // Check for size mismatch
      if (designSize !== castSize) {
        result.differences.push({
          strandIndex,
          position,
          issueType: 'size_mismatch',
          designSize: `${designSize}"`,
          castSize: `${castSize}"`,
          description: `${position} Strand ${strandIndex} size mismatch: Design=${designSize}", Cast=${castSize}"`,
        });
      }

      // Check for location mismatch (if coordinates are available)
      if (designCoord && castCoord) {
        const xDiff = Math.abs(designCoord.x - castCoord.x);
        const yDiff = Math.abs(designCoord.y - castCoord.y);
        const tolerance = 0.5; // 0.5" tolerance

        if (xDiff > tolerance || yDiff > tolerance) {
          result.differences.push({
            strandIndex,
            position,
            issueType: 'location_mismatch',
            designLocation: designCoord,
            castLocation: castCoord,
            description: `${position} Strand ${strandIndex} location mismatch: Design=(${designCoord.x}", ${designCoord.y}"), Cast=(${castCoord.x}", ${castCoord.y}")`,
          });
        }
      }
    }
  }

  result.hasDifferences = result.differences.length > 0;

  // Generate summary
  if (result.hasDifferences) {
    const missingInCast = result.differences.filter(d => d.issueType === 'missing_in_cast').length;
    const missingInDesign = result.differences.filter(d => d.issueType === 'missing_in_design').length;
    const sizeMismatches = result.differences.filter(d => d.issueType === 'size_mismatch').length;
    const locationMismatches = result.differences.filter(d => d.issueType === 'location_mismatch').length;

    const summaryParts: string[] = [];
    if (missingInCast > 0) summaryParts.push(`${missingInCast} strand(s) missing in cast`);
    if (missingInDesign > 0) summaryParts.push(`${missingInDesign} extra strand(s) in cast`);
    if (sizeMismatches > 0) summaryParts.push(`${sizeMismatches} size mismatch(es)`);
    if (locationMismatches > 0) summaryParts.push(`${locationMismatches} location mismatch(es)`);

    result.summary = `${result.differences.length} difference(s) found: ${summaryParts.join(', ')}`;
  } else {
    result.summary = `Different patterns but no strand differences detected (Design: ${designPattern.name}, Cast: ${castPattern.name})`;
  }

  return result;
}

/**
 * Formats strand pattern comparison for display in the UI
 */
export function formatComparisonForDisplay(comparison: StrandPatternComparison): string {
  if (!comparison.hasDifferences) {
    return comparison.summary;
  }

  let output = `${comparison.summary}\n\n`;

  comparison.differences.forEach((diff, index) => {
    output += `${index + 1}. ${diff.description}\n`;
  });

  return output.trim();
}

/**
 * Formats strand pattern comparison for PDF report (HTML)
 */
export function formatComparisonForPDF(comparison: StrandPatternComparison): string {
  if (!comparison.hasDifferences) {
    return `<div class="info-text">${comparison.summary}</div>`;
  }

  let html = `
    <div class="warning-box">
      <div class="warning-text">⚠ ${comparison.summary}</div>
    </div>
    <div style="margin-top: 8px;">
      <ul style="margin: 0; padding-left: 20px; font-size: 7.5px; line-height: 1.5;">
  `;

  comparison.differences.forEach((diff) => {
    let diffHtml = `<li style="margin-bottom: 4px; color: #1f2937;">`;

    if (diff.issueType === 'missing_in_cast') {
      diffHtml += `<strong style="color: #dc2626;">Missing in Cast:</strong> ${diff.position} Strand ${diff.strandIndex} (${diff.designSize}) exists in design but not in cast pattern`;
    } else if (diff.issueType === 'missing_in_design') {
      diffHtml += `<strong style="color: #ea580c;">Extra in Cast:</strong> ${diff.position} Strand ${diff.strandIndex} (${diff.castSize}) exists in cast but not in design pattern`;
    } else if (diff.issueType === 'size_mismatch') {
      diffHtml += `<strong style="color: #ca8a04;">Size Mismatch:</strong> ${diff.position} Strand ${diff.strandIndex} - Design: ${diff.designSize}, Cast: ${diff.castSize}`;
    } else if (diff.issueType === 'location_mismatch') {
      diffHtml += `<strong style="color: #9333ea;">Location Mismatch:</strong> ${diff.position} Strand ${diff.strandIndex} - Design: (${diff.designLocation?.x}", ${diff.designLocation?.y}"), Cast: (${diff.castLocation?.x}", ${diff.castLocation?.y}")`;
    }

    diffHtml += `</li>`;
    html += diffHtml;
  });

  html += `
      </ul>
    </div>
  `;

  return html;
}
