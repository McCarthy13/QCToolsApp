// Types for AI-powered trend analysis and insights

export interface WeatherData {
  date: string; // MM/DD/YYYY format to match pour dates
  temperature: number; // Fahrenheit
  humidity: number; // Percentage
  conditions: string; // e.g., "Sunny", "Rainy", "Cloudy", "Windy"
  windSpeed: number; // MPH
  precipitation: number; // Inches
}

export interface TrendInsight {
  id: string;
  type: 'product_type' | 'bed' | 'weather' | 'strand_pattern' | 'job' | 'temporal' | 'general';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  dataPoints: number; // Number of entries analyzed
  confidence: number; // 0-100 percentage
  relatedEntries?: string[]; // Entry IDs
  createdAt: number;
}

export interface AnalysisReport {
  id: string;
  generatedAt: number;
  analyzedPourDate: string; // The pour date that was analyzed
  totalEntriesAnalyzed: number;
  insights: TrendInsight[];
  summary: string;
  weatherData?: WeatherData;
  rawAnalysis?: string; // Full AI response for debugging
}

export interface InsightsSummary {
  totalIssues: number;
  criticalTrends: number;
  warningTrends: number;
  topConcern: string | null;
  lastAnalyzedDate: string | null;
  isReadyForAnalysis: boolean;
  pendingAnalysisDate: string | null;
}

export interface AnalysisDataPayload {
  entries: {
    id: string;
    idNumber: string;
    pourDate: string;
    disposition: string;
    productType: string;
    bed: string;
    jobNumber: string;
    markNumber: string;
    length: string;
    width: number;
    designStrandPattern: string;
    castStrandPattern: string;
    issueCodes: string[];
    rejectCodes: string[];
    qualityComments: string;
    engineer: string;
    engineerFeedback: string;
  }[];
  weatherData?: WeatherData;
  historicalInsights?: TrendInsight[];
}
