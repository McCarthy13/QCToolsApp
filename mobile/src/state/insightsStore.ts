// Insights Store - Manages AI-generated trend analysis and reports
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, setDoc, getDocs, query, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import {
  AnalysisReport,
  TrendInsight,
  InsightsSummary,
  WeatherData,
  AnalysisDataPayload,
} from '../types/insights';
import { QualityLogEntry } from '../types/quality-log';
import { analyzeQualityData, isReadyForAnalysis } from '../services/aiAnalysisService';
import { fetchWeatherForDate } from '../services/weatherService';

const INSIGHTS_COLLECTION = 'qualityInsights';
const MAX_STORED_REPORTS = 30; // Keep last 30 reports

interface InsightsState {
  // Data
  reports: AnalysisReport[];
  isLoading: boolean;
  error: string | null;
  lastAnalyzedDate: string | null;

  // Actions
  initialize: () => Promise<void>;
  runAnalysis: (entries: QualityLogEntry[], pourDate: string) => Promise<AnalysisReport | null>;
  getLatestReport: () => AnalysisReport | null;
  getReportForDate: (pourDate: string) => AnalysisReport | null;
  getSummary: (entries: QualityLogEntry[]) => InsightsSummary;
  checkAndTriggerAnalysis: (entries: QualityLogEntry[]) => Promise<void>;
  clearOldReports: () => Promise<void>;
}

export const useInsightsStore = create<InsightsState>()(
  persist(
    (set, get) => ({
      reports: [],
      isLoading: false,
      error: null,
      lastAnalyzedDate: null,

      initialize: async () => {
        try {
          console.log('[InsightsStore] Initializing...');
          const q = query(
            collection(firestore, INSIGHTS_COLLECTION),
            orderBy('generatedAt', 'desc'),
            limit(MAX_STORED_REPORTS)
          );
          const snapshot = await getDocs(q);
          const reports: AnalysisReport[] = [];
          snapshot.forEach((doc) => {
            reports.push(doc.data() as AnalysisReport);
          });
          set({ reports });
          console.log('[InsightsStore] Loaded', reports.length, 'reports');
        } catch (error) {
          console.error('[InsightsStore] Error initializing:', error);
          set({ error: 'Failed to load insights' });
        }
      },

      runAnalysis: async (entries: QualityLogEntry[], pourDate: string) => {
        const state = get();

        // Check if we already have a report for this date
        const existingReport = state.reports.find(r => r.analyzedPourDate === pourDate);
        if (existingReport) {
          console.log('[InsightsStore] Report already exists for', pourDate);
          return existingReport;
        }

        set({ isLoading: true, error: null });

        try {
          // Filter entries for the specific pour date
          const dateEntries = entries.filter(e => e.pourDate === pourDate);

          if (dateEntries.length === 0) {
            set({ isLoading: false });
            return null;
          }

          // Fetch weather data for this date
          console.log('[InsightsStore] Fetching weather for', pourDate);
          const weatherData = await fetchWeatherForDate(pourDate);

          // Prepare data payload
          const payload: AnalysisDataPayload = {
            entries: dateEntries.map(e => ({
              id: e.id,
              idNumber: e.idNumber || '',
              pourDate: e.pourDate,
              disposition: e.disposition || '',
              productType: e.productType || '',
              bed: e.bed || '',
              jobNumber: e.jobNumber || '',
              markNumber: e.markNumber || '',
              length: e.length || '',
              width: e.width || 0,
              designStrandPattern: e.designStrandPattern || '',
              castStrandPattern: e.castStrandPattern || '',
              issueCodes: e.issueCodes || [],
              rejectCodes: e.rejectCodes || [],
              qualityComments: e.qualityComments || '',
              engineer: e.engineer || '',
              engineerFeedback: e.engineerFeedback || '',
            })),
            weatherData: weatherData || undefined,
            historicalInsights: state.reports.flatMap(r => r.insights).slice(0, 20),
          };

          // Run AI analysis
          console.log('[InsightsStore] Running AI analysis...');
          const report = await analyzeQualityData(payload);

          // Save to Firebase
          await setDoc(doc(firestore, INSIGHTS_COLLECTION, report.id), report);

          // Update local state
          const updatedReports = [report, ...state.reports].slice(0, MAX_STORED_REPORTS);
          set({
            reports: updatedReports,
            lastAnalyzedDate: pourDate,
            isLoading: false,
          });

          console.log('[InsightsStore] Analysis complete for', pourDate);
          return report;
        } catch (error) {
          console.error('[InsightsStore] Error running analysis:', error);
          set({ isLoading: false, error: 'Analysis failed' });
          return null;
        }
      },

      getLatestReport: () => {
        const { reports } = get();
        return reports.length > 0 ? reports[0] : null;
      },

      getReportForDate: (pourDate: string) => {
        const { reports } = get();
        return reports.find(r => r.analyzedPourDate === pourDate) || null;
      },

      getSummary: (entries: QualityLogEntry[]): InsightsSummary => {
        const state = get();
        const { reports, lastAnalyzedDate } = state;

        // Find most recent pour date before today
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const pourDateMap = new Map<string, Date>();
        entries.forEach((e) => {
          if (e.pourDate) {
            const parsed = new Date(e.pourDate);
            if (!isNaN(parsed.getTime()) && parsed < today) {
              pourDateMap.set(e.pourDate, parsed);
            }
          }
        });

        let mostRecentPourDate: string | null = null;
        let mostRecentTime = 0;
        pourDateMap.forEach((date, dateStr) => {
          if (date.getTime() > mostRecentTime) {
            mostRecentTime = date.getTime();
            mostRecentPourDate = dateStr;
          }
        });

        // Check if ready for analysis
        const dateEntries = mostRecentPourDate
          ? entries.filter(e => e.pourDate === mostRecentPourDate)
          : [];
        const ready = isReadyForAnalysis(dateEntries);

        // Check if we need to analyze
        const needsAnalysis = mostRecentPourDate &&
          ready &&
          !reports.find(r => r.analyzedPourDate === mostRecentPourDate);

        // Calculate totals from all reports
        const allInsights = reports.flatMap(r => r.insights);
        const criticalTrends = allInsights.filter(i => i.severity === 'critical').length;
        const warningTrends = allInsights.filter(i => i.severity === 'warning').length;
        const totalIssues = criticalTrends + warningTrends;

        // Get top concern from latest report
        const latestReport = reports[0];
        const topConcern = latestReport?.insights.find(i =>
          i.severity === 'critical' || i.severity === 'warning'
        )?.title || null;

        return {
          totalIssues,
          criticalTrends,
          warningTrends,
          topConcern,
          lastAnalyzedDate,
          isReadyForAnalysis: ready,
          pendingAnalysisDate: needsAnalysis ? mostRecentPourDate : null,
        };
      },

      checkAndTriggerAnalysis: async (entries: QualityLogEntry[]) => {
        const state = get();
        const summary = state.getSummary(entries);

        if (summary.pendingAnalysisDate) {
          console.log('[InsightsStore] Auto-triggering analysis for', summary.pendingAnalysisDate);
          await state.runAnalysis(entries, summary.pendingAnalysisDate);
        }
      },

      clearOldReports: async () => {
        const { reports } = get();
        if (reports.length <= MAX_STORED_REPORTS) return;

        const reportsToDelete = reports.slice(MAX_STORED_REPORTS);
        for (const report of reportsToDelete) {
          try {
            await deleteDoc(doc(firestore, INSIGHTS_COLLECTION, report.id));
          } catch (error) {
            console.error('[InsightsStore] Error deleting old report:', error);
          }
        }

        set({ reports: reports.slice(0, MAX_STORED_REPORTS) });
      },
    }),
    {
      name: 'insights-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        reports: state.reports,
        lastAnalyzedDate: state.lastAnalyzedDate,
      }),
    }
  )
);
