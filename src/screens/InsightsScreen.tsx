// Insights Screen - AI-generated trend analysis and reports
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useInsightsStore } from '../state/insightsStore';
import { useQualityLogStore } from '../state/qualityLogStore';
import { AnalysisReport, TrendInsight } from '../types/insights';
import ScreenHeader from '../components/ScreenHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'Insights'>;

export default function InsightsScreen({ navigation }: Props) {
  const reports = useInsightsStore((s) => s.reports);
  const isLoading = useInsightsStore((s) => s.isLoading);
  const initialize = useInsightsStore((s) => s.initialize);
  const runAnalysis = useInsightsStore((s) => s.runAnalysis);
  const getSummary = useInsightsStore((s) => s.getSummary);
  const entries = useQualityLogStore((s) => s.entries);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<AnalysisReport | null>(null);

  const summary = getSummary(entries);

  useEffect(() => {
    initialize();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await initialize();
    setRefreshing(false);
  };

  const handleRunAnalysis = async () => {
    if (summary.pendingAnalysisDate) {
      await runAnalysis(entries, summary.pendingAnalysisDate);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' };
      case 'warning': return { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' };
      default: return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' };
    }
  };

  const getTypeIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'product_type': return 'cube-outline';
      case 'bed': return 'bed-outline';
      case 'weather': return 'cloud-outline';
      case 'strand_pattern': return 'git-branch-outline';
      case 'job': return 'briefcase-outline';
      case 'temporal': return 'time-outline';
      default: return 'analytics-outline';
    }
  };

  const renderInsightCard = (insight: TrendInsight) => {
    const colors = getSeverityColor(insight.severity);
    return (
      <View
        key={insight.id}
        className={`${colors.bg} rounded-lg p-3 mb-2 border ${colors.border}`}
      >
        <View className="flex-row items-center mb-2">
          <View className={`${colors.bg} rounded-full p-1 mr-2`}>
            <Ionicons name={getTypeIcon(insight.type)} size={16} color={colors.text.replace('text-', '#').replace('-700', '')} />
          </View>
          <Text className={`${colors.text} font-semibold flex-1`} numberOfLines={1}>
            {insight.title}
          </Text>
          <View className={`px-2 py-0.5 rounded-full ${colors.bg}`}>
            <Text className={`${colors.text} text-xs font-medium`}>
              {insight.confidence}% conf
            </Text>
          </View>
        </View>
        <Text className="text-gray-700 text-sm">{insight.description}</Text>
      </View>
    );
  };

  const renderReportCard = (report: AnalysisReport) => {
    const criticalCount = report.insights.filter(i => i.severity === 'critical').length;
    const warningCount = report.insights.filter(i => i.severity === 'warning').length;
    const isSelected = selectedReport?.id === report.id;

    return (
      <Pressable
        key={report.id}
        onPress={() => setSelectedReport(isSelected ? null : report)}
        className={`bg-white rounded-lg p-4 mb-3 border ${isSelected ? 'border-blue-500' : 'border-gray-200'}`}
      >
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center">
            <Ionicons name="calendar-outline" size={16} color="#6B7280" />
            <Text className="text-gray-900 font-semibold ml-2">{report.analyzedPourDate}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            {criticalCount > 0 && (
              <View className="bg-red-100 px-2 py-0.5 rounded-full flex-row items-center">
                <Ionicons name="alert-circle" size={12} color="#DC2626" />
                <Text className="text-red-700 text-xs ml-1">{criticalCount}</Text>
              </View>
            )}
            {warningCount > 0 && (
              <View className="bg-amber-100 px-2 py-0.5 rounded-full flex-row items-center">
                <Ionicons name="warning" size={12} color="#D97706" />
                <Text className="text-amber-700 text-xs ml-1">{warningCount}</Text>
              </View>
            )}
            <Ionicons
              name={isSelected ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#9CA3AF"
            />
          </View>
        </View>

        <Text className="text-gray-600 text-sm mb-2" numberOfLines={isSelected ? undefined : 2}>
          {report.summary}
        </Text>

        {report.weatherData && (
          <View className="flex-row items-center mb-2">
            <Ionicons name="cloud-outline" size={14} color="#6B7280" />
            <Text className="text-gray-500 text-xs ml-1">
              {report.weatherData.temperature}°F, {report.weatherData.conditions}, {report.weatherData.humidity}% humidity
            </Text>
          </View>
        )}

        <Text className="text-gray-400 text-xs">
          {report.totalEntriesAnalyzed} pieces analyzed • {new Date(report.generatedAt).toLocaleDateString()}
        </Text>

        {isSelected && report.insights.length > 0 && (
          <View className="mt-4 pt-4 border-t border-gray-100">
            <Text className="text-gray-700 font-semibold mb-3">Insights ({report.insights.length})</Text>
            {report.insights.map(renderInsightCard)}
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScreenHeader
        title="AI Insights"
        rightContent={isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : undefined}
      />

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Summary Card */}
        <View className="bg-white m-4 rounded-xl p-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Analysis Summary</Text>

          <View className="flex-row gap-3 mb-4">
            <View className="flex-1 bg-red-50 rounded-lg p-3">
              <Text className="text-xs text-red-600">Critical</Text>
              <Text className="text-2xl font-bold text-red-700">{summary.criticalTrends}</Text>
            </View>
            <View className="flex-1 bg-amber-50 rounded-lg p-3">
              <Text className="text-xs text-amber-600">Warnings</Text>
              <Text className="text-2xl font-bold text-amber-700">{summary.warningTrends}</Text>
            </View>
            <View className="flex-1 bg-blue-50 rounded-lg p-3">
              <Text className="text-xs text-blue-600">Reports</Text>
              <Text className="text-2xl font-bold text-blue-700">{reports.length}</Text>
            </View>
          </View>

          {summary.topConcern && (
            <View className="bg-gray-50 rounded-lg p-3 mb-4">
              <Text className="text-xs text-gray-500 mb-1">Top Concern</Text>
              <Text className="text-gray-900 font-medium">{summary.topConcern}</Text>
            </View>
          )}

          {summary.pendingAnalysisDate && (
            <Pressable
              onPress={handleRunAnalysis}
              disabled={isLoading}
              className={`${isLoading ? 'bg-gray-400' : 'bg-blue-600'} rounded-lg py-3 flex-row items-center justify-center`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                  <Text className="text-white font-semibold ml-2">
                    Analyze {summary.pendingAnalysisDate}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          {!summary.pendingAnalysisDate && summary.isReadyForAnalysis && (
            <View className="bg-green-50 rounded-lg p-3 flex-row items-center">
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text className="text-green-700 text-sm ml-2">All data is up to date</Text>
            </View>
          )}

          {!summary.isReadyForAnalysis && (
            <View className="bg-amber-50 rounded-lg p-3 flex-row items-center">
              <Ionicons name="time-outline" size={18} color="#D97706" />
              <Text className="text-amber-700 text-sm ml-2">
                Waiting for all pieces to be dispositioned
              </Text>
            </View>
          )}
        </View>

        {/* Reports List */}
        <View className="px-4 pb-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Analysis Reports</Text>

          {reports.length === 0 ? (
            <View className="bg-white rounded-lg p-8 items-center">
              <Ionicons name="analytics-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-500 mt-3 text-center">
                No analysis reports yet.{'\n'}Reports are generated when all pieces from a pour date are dispositioned.
              </Text>
            </View>
          ) : (
            reports.map(renderReportCard)
          )}
        </View>
      </ScrollView>
    </View>
  );
}
