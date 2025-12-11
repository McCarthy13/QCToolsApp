import { CustomStrandPattern } from '../state/strandPatternStore';

export interface StrandDifference {
  castStrandIndex?: number; // 1-based strand number in cast pattern
  designStrandIndex?: number; // 1-based strand number in design pattern
  position: 'Bottom' | 'Top';
  issueType: 'missing_in_cast' | 'extra_in_cast' | 'size_mismatch';
  designSize?: string;
  castSize?: string;
  location: { x: number; y: number };
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
 * Compares design and cast strand patterns and identifies differences based on strand LOCATIONS
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

  // If both patterns are missing, no comparison needed
  if (!designPattern && !castPattern) {
    result.summary = `No ${position.toLowerCase()} strand pattern specified`;
    return result;
  }

  // If no design pattern but there's a cast pattern, all cast strands are "extra"
  if (!designPattern && castPattern) {
    const castSizes = castPattern.strandSizes || [];
    const castCoords = castPattern.strandCoordinates || [];

    castCoords.forEach((castCoord, castIndex) => {
      const castSize = castSizes[castIndex];
      const castStrandNum = castIndex + 1;

      result.differences.push({
        castStrandIndex: castStrandNum,
        position,
        issueType: 'extra_in_cast',
        castSize: `${castSize}"`,
        location: castCoord,
        description: `Extra ${castSize}" strand in cast at (${castCoord.x}", ${castCoord.y}") - no design pattern specified`,
      });
    });

    result.hasDifferences = true;
    result.summary = `${result.differences.length} strand(s) in cast but no design pattern specified`;
    return result;
  }

  // If design pattern but no cast pattern, all design strands are "missing"
  if (designPattern && !castPattern) {
    const designSizes = designPattern.strandSizes || [];
    const designCoords = designPattern.strandCoordinates || [];

    designCoords.forEach((designCoord, designIndex) => {
      const designSize = designSizes[designIndex];
      const designStrandNum = designIndex + 1;

      result.differences.push({
        designStrandIndex: designStrandNum,
        position,
        issueType: 'missing_in_cast',
        designSize: `${designSize}"`,
        location: designCoord,
        description: `Missing ${designSize}" strand at (${designCoord.x}", ${designCoord.y}") - in design but no cast pattern specified`,
      });
    });

    result.hasDifferences = true;
    result.summary = `${result.differences.length} strand(s) in design but no cast pattern specified`;
    return result;
  }

  // At this point, both designPattern and castPattern are defined (TypeScript needs assurance)
  if (!designPattern || !castPattern) {
    // This should never happen due to checks above, but TypeScript needs this
    result.summary = 'Unexpected state in pattern comparison';
    return result;
  }

  // If the patterns are the same, no differences
  if (designPattern.id === castPattern.id) {
    result.summary = `Design and cast patterns match (${designPattern.name})`;
    return result;
  }

  // Compare based on physical locations, not index
  const designSizes = designPattern.strandSizes || [];
  const castSizes = castPattern.strandSizes || [];
  const designCoords = designPattern.strandCoordinates || [];
  const castCoords = castPattern.strandCoordinates || [];

  const locationTolerance = 0.5; // 0.5" tolerance for matching locations

  // Track which design strands have been matched
  const matchedDesignIndices = new Set<number>();

  // For each cast strand, find the matching design strand at that location
  castCoords.forEach((castCoord, castIndex) => {
    const castSize = castSizes[castIndex];
    const castStrandNum = castIndex + 1;

    // Find design strand at the same location
    let matchedDesignIndex = -1;
    let minDistance = Infinity;

    designCoords.forEach((designCoord, designIndex) => {
      if (matchedDesignIndices.has(designIndex)) return; // Already matched

      const distance = Math.sqrt(
        Math.pow(castCoord.x - designCoord.x, 2) +
        Math.pow(castCoord.y - designCoord.y, 2)
      );

      if (distance <= locationTolerance && distance < minDistance) {
        minDistance = distance;
        matchedDesignIndex = designIndex;
      }
    });

    if (matchedDesignIndex >= 0) {
      // Found a matching design strand at this location
      matchedDesignIndices.add(matchedDesignIndex);
      const designSize = designSizes[matchedDesignIndex];
      const designStrandNum = matchedDesignIndex + 1;

      // Check for size mismatch at this location
      if (designSize !== castSize) {
        result.differences.push({
          castStrandIndex: castStrandNum,
          designStrandIndex: designStrandNum,
          position,
          issueType: 'size_mismatch',
          designSize: `${designSize}"`,
          castSize: `${castSize}"`,
          location: castCoord,
          description: `Strand at (${castCoord.x}", ${castCoord.y}"): Design=${designSize}", Cast=${castSize}"`,
        });
      }
    } else {
      // No design strand at this cast location - extra strand in cast
      result.differences.push({
        castStrandIndex: castStrandNum,
        position,
        issueType: 'extra_in_cast',
        castSize: `${castSize}"`,
        location: castCoord,
        description: `Extra ${castSize}" strand in cast at (${castCoord.x}", ${castCoord.y}") - not in design`,
      });
    }
  });

  // Check for design strands that don't have a matching cast strand
  designCoords.forEach((designCoord, designIndex) => {
    if (!matchedDesignIndices.has(designIndex)) {
      const designSize = designSizes[designIndex];
      const designStrandNum = designIndex + 1;

      result.differences.push({
        designStrandIndex: designStrandNum,
        position,
        issueType: 'missing_in_cast',
        designSize: `${designSize}"`,
        location: designCoord,
        description: `Missing ${designSize}" strand at (${designCoord.x}", ${designCoord.y}") - in design but not cast`,
      });
    }
  });

  result.hasDifferences = result.differences.length > 0;

  // Generate summary
  if (result.hasDifferences) {
    const missingInCast = result.differences.filter(d => d.issueType === 'missing_in_cast').length;
    const extraInCast = result.differences.filter(d => d.issueType === 'extra_in_cast').length;
    const sizeMismatches = result.differences.filter(d => d.issueType === 'size_mismatch').length;

    const summaryParts: string[] = [];
    if (missingInCast > 0) summaryParts.push(`${missingInCast} strand(s) missing in cast`);
    if (extraInCast > 0) summaryParts.push(`${extraInCast} extra strand(s) in cast`);
    if (sizeMismatches > 0) summaryParts.push(`${sizeMismatches} size mismatch(es)`);

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
      diffHtml += `<strong style="color: #dc2626;">Missing in Cast:</strong> ${diff.designSize} strand at (${diff.location.x}", ${diff.location.y}") - in design but not cast`;
    } else if (diff.issueType === 'extra_in_cast') {
      diffHtml += `<strong style="color: #ea580c;">Extra in Cast:</strong> ${diff.castSize} strand at (${diff.location.x}", ${diff.location.y}") - not in design`;
    } else if (diff.issueType === 'size_mismatch') {
      diffHtml += `<strong style="color: #ca8a04;">Size Mismatch:</strong> Strand at (${diff.location.x}", ${diff.location.y}") - Design: ${diff.designSize}, Cast: ${diff.castSize}`;
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
