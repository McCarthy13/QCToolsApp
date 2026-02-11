// AI Analysis Service for Quality Log trend detection
// Uses OpenAI to analyze patterns and correlations in quality data

import { getOpenAITextResponse } from '../api/chat-service';
import {
  AnalysisDataPayload,
  AnalysisReport,
  TrendInsight,
  WeatherData
} from '../types/insights';
import { categorizeWeather } from './weatherService';

/**
 * Generate the analysis prompt for the AI
 */
function buildAnalysisPrompt(data: AnalysisDataPayload): string {
  const { entries, weatherData, historicalInsights } = data;

  // Build summary statistics
  const totalEntries = entries.length;
  const dispositionCounts: Record<string, number> = {};
  const productTypeCounts: Record<string, number> = {};
  const bedCounts: Record<string, number> = {};
  const issueCodeCounts: Record<string, number> = {};
  const rejectCodeCounts: Record<string, number> = {};
  const jobCounts: Record<string, number> = {};
  const strandMismatches: typeof entries = [];

  entries.forEach(entry => {
    // Disposition
    dispositionCounts[entry.disposition] = (dispositionCounts[entry.disposition] || 0) + 1;

    // Product Type
    if (entry.productType) {
      productTypeCounts[entry.productType] = (productTypeCounts[entry.productType] || 0) + 1;
    }

    // Bed
    if (entry.bed) {
      bedCounts[entry.bed] = (bedCounts[entry.bed] || 0) + 1;
    }

    // Issue Codes
    entry.issueCodes.forEach(code => {
      issueCodeCounts[code] = (issueCodeCounts[code] || 0) + 1;
    });

    // Reject Codes
    entry.rejectCodes.forEach(code => {
      rejectCodeCounts[code] = (rejectCodeCounts[code] || 0) + 1;
    });

    // Job Numbers
    if (entry.jobNumber) {
      jobCounts[entry.jobNumber] = (jobCounts[entry.jobNumber] || 0) + 1;
    }

    // Strand pattern mismatches
    if (entry.designStrandPattern && entry.castStrandPattern &&
        entry.designStrandPattern !== entry.castStrandPattern) {
      strandMismatches.push(entry);
    }
  });

  // Weather context
  let weatherContext = '';
  if (weatherData) {
    const category = categorizeWeather(weatherData);
    weatherContext = `
WEATHER CONDITIONS FOR THIS POUR DATE:
- Temperature: ${weatherData.temperature}°F
- Humidity: ${weatherData.humidity}%
- Conditions: ${weatherData.conditions}
- Wind Speed: ${weatherData.windSpeed} MPH
- Precipitation: ${weatherData.precipitation} inches
- Weather Category: ${category}
`;
  }

  // Historical context
  let historicalContext = '';
  if (historicalInsights && historicalInsights.length > 0) {
    const recentInsights = historicalInsights.slice(0, 10);
    historicalContext = `
RECENT HISTORICAL INSIGHTS (for reference):
${recentInsights.map(i => `- [${i.type}] ${i.title}: ${i.description}`).join('\n')}
`;
  }

  // Build entries detail for problematic pieces
  const problematicEntries = entries.filter(e =>
    e.issueCodes.length > 0 ||
    e.rejectCodes.length > 0 ||
    e.disposition === 'Eng' ||
    e.disposition === 'WIP' ||
    e.disposition?.includes('Yard Cut')
  );

  let problematicDetail = '';
  if (problematicEntries.length > 0) {
    problematicDetail = `
DETAILED PROBLEMATIC ENTRIES:
${problematicEntries.slice(0, 20).map(e => `
- ID: ${e.idNumber}, Mark: ${e.markNumber}, Job: ${e.jobNumber}
  Product Type: ${e.productType}, Bed: ${e.bed}, Disposition: ${e.disposition}
  Issue Codes: ${e.issueCodes.join(', ') || 'None'}
  Reject Codes: ${e.rejectCodes.join(', ') || 'None'}
  Design Pattern: ${e.designStrandPattern}, Cast Pattern: ${e.castStrandPattern}
  Quality Comments: ${e.qualityComments || 'None'}
  Engineer Feedback: ${e.engineerFeedback || 'None'}
`).join('')}
`;
  }

  return `You are a quality control analyst for a precast concrete manufacturing plant. Analyze the following quality log data and identify trends, patterns, and correlations that could help improve quality.

POUR DATE: ${entries[0]?.pourDate || 'Unknown'}
TOTAL PIECES: ${totalEntries}

DISPOSITION SUMMARY:
${Object.entries(dispositionCounts).map(([k, v]) => `- ${k}: ${v} pieces (${((v/totalEntries)*100).toFixed(1)}%)`).join('\n')}

PRODUCT TYPE DISTRIBUTION:
${Object.entries(productTypeCounts).map(([k, v]) => `- ${k}: ${v} pieces`).join('\n')}

BED DISTRIBUTION:
${Object.entries(bedCounts).map(([k, v]) => `- Bed ${k}: ${v} pieces`).join('\n')}

ISSUE CODES FOUND:
${Object.keys(issueCodeCounts).length > 0
  ? Object.entries(issueCodeCounts).map(([k, v]) => `- Code ${k}: ${v} occurrences`).join('\n')
  : 'None'}

REJECT CODES FOUND:
${Object.keys(rejectCodeCounts).length > 0
  ? Object.entries(rejectCodeCounts).map(([k, v]) => `- Code ${k}: ${v} occurrences`).join('\n')
  : 'None'}

STRAND PATTERN MISMATCHES: ${strandMismatches.length} pieces
${weatherContext}
${historicalContext}
${problematicDetail}

Based on this data, provide your analysis in the following JSON format:
{
  "summary": "A 2-3 sentence executive summary of the key findings",
  "insights": [
    {
      "type": "product_type|bed|weather|strand_pattern|job|temporal|general",
      "severity": "info|warning|critical",
      "title": "Short title (max 50 chars)",
      "description": "Detailed description of the trend/correlation found",
      "confidence": 0-100
    }
  ]
}

Focus on:
1. Product type issues - Are certain product types having more problems?
2. Bed problems - Are certain beds producing more defects?
3. Weather correlations - Did weather conditions affect quality?
4. Strand pattern issues - Are mismatches causing problems?
5. Job-specific trends - Are certain jobs having issues?
6. Any other notable patterns

Only include insights that have meaningful data support. Be specific about numbers and percentages.
Return ONLY valid JSON, no other text.`;
}

/**
 * Parse the AI response into structured insights
 */
function parseAnalysisResponse(response: string, pourDate: string): { summary: string; insights: TrendInsight[] } {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[AIAnalysis] No JSON found in response');
      return { summary: 'Analysis completed but results could not be parsed.', insights: [] };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    const insights: TrendInsight[] = (parsed.insights || []).map((insight: any, index: number) => ({
      id: `${pourDate}-${Date.now()}-${index}`,
      type: insight.type || 'general',
      severity: insight.severity || 'info',
      title: insight.title || 'Untitled Insight',
      description: insight.description || '',
      dataPoints: 0, // Could be enhanced
      confidence: insight.confidence || 50,
      createdAt: Date.now(),
    }));

    return {
      summary: parsed.summary || 'Analysis completed.',
      insights,
    };
  } catch (error) {
    console.error('[AIAnalysis] Error parsing response:', error);
    return { summary: 'Analysis completed but results could not be parsed.', insights: [] };
  }
}

/**
 * Run AI analysis on quality log entries
 */
export async function analyzeQualityData(
  data: AnalysisDataPayload
): Promise<AnalysisReport> {
  const pourDate = data.entries[0]?.pourDate || 'Unknown';

  console.log('[AIAnalysis] Starting analysis for', pourDate, 'with', data.entries.length, 'entries');

  try {
    const prompt = buildAnalysisPrompt(data);

    const response = await getOpenAITextResponse(
      [{ role: 'user', content: prompt }],
      { temperature: 0.3, maxTokens: 2000 }
    );

    console.log('[AIAnalysis] Received response, parsing...');

    const { summary, insights } = parseAnalysisResponse(response.content, pourDate);

    const report: AnalysisReport = {
      id: `report-${pourDate}-${Date.now()}`,
      generatedAt: Date.now(),
      analyzedPourDate: pourDate,
      totalEntriesAnalyzed: data.entries.length,
      insights,
      summary,
      weatherData: data.weatherData,
      rawAnalysis: response.content,
    };

    console.log('[AIAnalysis] Analysis complete:', insights.length, 'insights found');

    return report;
  } catch (error) {
    console.error('[AIAnalysis] Error during analysis:', error);

    // Return a basic report on error
    return {
      id: `report-${pourDate}-${Date.now()}`,
      generatedAt: Date.now(),
      analyzedPourDate: pourDate,
      totalEntriesAnalyzed: data.entries.length,
      insights: [],
      summary: 'Analysis could not be completed due to an error.',
      weatherData: data.weatherData,
    };
  }
}

/**
 * Check if entries for a date are ready for analysis
 * Ready = no entries with "Scheduled" or "Poured" disposition
 */
export function isReadyForAnalysis(entries: { disposition?: string }[]): boolean {
  if (entries.length === 0) return false;

  const pendingDispositions = ['Scheduled', 'Poured', ''];

  return entries.every(entry => {
    const disposition = entry.disposition || '';
    // Check if disposition contains any pending status
    return !pendingDispositions.some(pending =>
      disposition === pending ||
      (pending && disposition.includes(pending))
    );
  });
}
