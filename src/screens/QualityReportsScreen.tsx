// Quality Reports Screen - Data visualization and trend analysis
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import ScreenHeader from '../components/ScreenHeader';
import {
  QualityLogEntry,
  ISSUE_CODE_DEFINITIONS,
  getIssueCodeDescription,
} from '../types/quality-log';
import { CartesianChart, Bar, Line } from 'victory-native';
import { useFont } from '@shopify/react-native-skia';
import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityReports'>;

// Report type options
type ReportType = 'issue-codes' | 'reject-codes' | 'dispositions' | 'products';
type TimeRange = 'rolling-13-weeks' | 'monthly' | 'yearly' | 'custom';
type ChartType = 'pareto' | 'bar' | 'line' | 'stacked';

interface FilterState {
  reportType: ReportType;
  timeRange: TimeRange;
  chartType: ChartType;
  year?: number;
  startDate?: string;
  endDate?: string;
}

interface ChartDataPoint {
  x: string;
  y: number;
  label?: string;
  cumulative?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_HEIGHT = 300;

export default function QualityReportsScreen({ navigation }: Props) {
  const entries = useQualityLogStore((s) => s.entries);
  const [isLoading, setIsLoading] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    reportType: 'issue-codes',
    timeRange: 'rolling-13-weeks',
    chartType: 'pareto',
    year: new Date().getFullYear(),
  });

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    entries.forEach((entry) => {
      if (entry.pourDate) {
        const year = new Date(entry.pourDate).getFullYear();
        if (!isNaN(year)) years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [entries]);

  // Filter entries based on time range
  const filteredEntries = useMemo(() => {
    const now = new Date();

    return entries.filter((entry) => {
      if (!entry.pourDate) return false;
      const entryDate = new Date(entry.pourDate);
      if (isNaN(entryDate.getTime())) return false;

      switch (filters.timeRange) {
        case 'rolling-13-weeks': {
          const thirteenWeeksAgo = new Date(now);
          thirteenWeeksAgo.setDate(thirteenWeeksAgo.getDate() - 91);
          return entryDate >= thirteenWeeksAgo && entryDate <= now;
        }
        case 'monthly': {
          return entryDate.getFullYear() === (filters.year || now.getFullYear());
        }
        case 'yearly': {
          return entryDate.getFullYear() === (filters.year || now.getFullYear());
        }
        case 'custom': {
          if (filters.startDate && filters.endDate) {
            const start = new Date(filters.startDate);
            const end = new Date(filters.endDate);
            return entryDate >= start && entryDate <= end;
          }
          return true;
        }
        default:
          return true;
      }
    });
  }, [entries, filters]);

  // Calculate issue code frequency data
  const issueCodeData = useMemo(() => {
    const codeCounts: Record<string, number> = {};

    filteredEntries.forEach((entry) => {
      entry.issueCodes?.forEach((code) => {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      });
    });

    // Sort by count descending
    const sorted = Object.entries(codeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15); // Top 15

    // Calculate cumulative percentage for Pareto
    const total = sorted.reduce((sum, [_, count]) => sum + count, 0);
    let cumulative = 0;

    return sorted.map(([code, count]) => {
      cumulative += count;
      return {
        x: code,
        y: count,
        label: getIssueCodeDescription(code),
        cumulative: total > 0 ? (cumulative / total) * 100 : 0,
      };
    });
  }, [filteredEntries]);

  // Calculate reject code frequency data
  const rejectCodeData = useMemo(() => {
    const codeCounts: Record<string, number> = {};

    filteredEntries.forEach((entry) => {
      entry.rejectCodes?.forEach((code) => {
        codeCounts[code] = (codeCounts[code] || 0) + 1;
      });
    });

    const sorted = Object.entries(codeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    const total = sorted.reduce((sum, [_, count]) => sum + count, 0);
    let cumulative = 0;

    return sorted.map(([code, count]) => {
      cumulative += count;
      return {
        x: code,
        y: count,
        label: getIssueCodeDescription(code),
        cumulative: total > 0 ? (cumulative / total) * 100 : 0,
      };
    });
  }, [filteredEntries]);

  // Calculate disposition distribution
  const dispositionData = useMemo(() => {
    const dispCounts: Record<string, number> = {};

    filteredEntries.forEach((entry) => {
      const disp = entry.disposition || 'No Disposition';
      dispCounts[disp] = (dispCounts[disp] || 0) + 1;
    });

    return Object.entries(dispCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([disp, count]) => ({
        x: disp,
        y: count,
        label: disp,
      }));
  }, [filteredEntries]);

  // Calculate product type distribution
  const productData = useMemo(() => {
    const productCounts: Record<string, number> = {};

    filteredEntries.forEach((entry) => {
      const product = entry.productType || 'Unknown';
      productCounts[product] = (productCounts[product] || 0) + 1;
    });

    return Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([product, count]) => ({
        x: product,
        y: count,
        label: product,
      }));
  }, [filteredEntries]);

  // Calculate monthly trend data
  const monthlyTrendData = useMemo(() => {
    const monthCounts: Record<string, { issues: number; rejects: number; total: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize all months
    months.forEach((month) => {
      monthCounts[month] = { issues: 0, rejects: 0, total: 0 };
    });

    filteredEntries.forEach((entry) => {
      if (!entry.pourDate) return;
      const date = new Date(entry.pourDate);
      const month = months[date.getMonth()];
      if (month) {
        monthCounts[month].total += 1;
        monthCounts[month].issues += entry.issueCodes?.length || 0;
        monthCounts[month].rejects += entry.rejectCodes?.length || 0;
      }
    });

    return months.map((month) => ({
      x: month,
      issues: monthCounts[month].issues,
      rejects: monthCounts[month].rejects,
      total: monthCounts[month].total,
    }));
  }, [filteredEntries]);

  // Calculate weekly trend data for rolling 13 weeks
  const weeklyTrendData = useMemo(() => {
    const weekCounts: Record<string, { issues: number; rejects: number; total: number }> = {};
    const now = new Date();

    // Create 13 week buckets
    for (let i = 12; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekLabel = `W${13 - i}`;
      weekCounts[weekLabel] = { issues: 0, rejects: 0, total: 0 };
    }

    filteredEntries.forEach((entry) => {
      if (!entry.pourDate) return;
      const entryDate = new Date(entry.pourDate);
      const daysDiff = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(daysDiff / 7);

      if (weekIndex >= 0 && weekIndex < 13) {
        const weekLabel = `W${13 - weekIndex}`;
        if (weekCounts[weekLabel]) {
          weekCounts[weekLabel].total += 1;
          weekCounts[weekLabel].issues += entry.issueCodes?.length || 0;
          weekCounts[weekLabel].rejects += entry.rejectCodes?.length || 0;
        }
      }
    });

    return Object.entries(weekCounts).map(([week, data]) => ({
      x: week,
      ...data,
    }));
  }, [filteredEntries]);

  // Get current chart data based on report type
  const currentChartData = useMemo(() => {
    switch (filters.reportType) {
      case 'issue-codes':
        return issueCodeData;
      case 'reject-codes':
        return rejectCodeData;
      case 'dispositions':
        return dispositionData;
      case 'products':
        return productData;
      default:
        return [];
    }
  }, [filters.reportType, issueCodeData, rejectCodeData, dispositionData, productData]);

  // Get trend data based on time range
  const trendData = useMemo(() => {
    return filters.timeRange === 'rolling-13-weeks' ? weeklyTrendData : monthlyTrendData;
  }, [filters.timeRange, weeklyTrendData, monthlyTrendData]);

  const getReportTypeLabel = (type: ReportType): string => {
    switch (type) {
      case 'issue-codes': return 'Issue Codes';
      case 'reject-codes': return 'Reject Codes';
      case 'dispositions': return 'Dispositions';
      case 'products': return 'Product Types';
    }
  };

  const getTimeRangeLabel = (range: TimeRange): string => {
    switch (range) {
      case 'rolling-13-weeks': return 'Rolling 13 Weeks';
      case 'monthly': return `Monthly (${filters.year})`;
      case 'yearly': return `Yearly (${filters.year})`;
      case 'custom': return 'Custom Range';
    }
  };

  const getChartTypeLabel = (type: ChartType): string => {
    switch (type) {
      case 'pareto': return 'Pareto Chart';
      case 'bar': return 'Bar Chart';
      case 'line': return 'Line Chart';
      case 'stacked': return 'Stacked Bar';
    }
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalPieces = filteredEntries.length;
    const totalIssues = filteredEntries.reduce((sum, e) => sum + (e.issueCodes?.length || 0), 0);
    const totalRejects = filteredEntries.reduce((sum, e) => sum + (e.rejectCodes?.length || 0), 0);
    const piecesWithIssues = filteredEntries.filter((e) => e.issueCodes?.length > 0).length;
    const piecesWithRejects = filteredEntries.filter((e) => e.rejectCodes?.length > 0).length;

    return {
      totalPieces,
      totalIssues,
      totalRejects,
      issueRate: totalPieces > 0 ? ((piecesWithIssues / totalPieces) * 100).toFixed(1) : '0',
      rejectRate: totalPieces > 0 ? ((piecesWithRejects / totalPieces) * 100).toFixed(1) : '0',
    };
  }, [filteredEntries]);

  // Render simple bar chart using Views (fallback if victory-native has issues)
  const renderSimpleBarChart = (data: ChartDataPoint[], color: string) => {
    const maxValue = Math.max(...data.map((d) => d.y), 1);

    return (
      <View className="mt-4">
        {data.map((item, index) => (
          <View key={index} className="mb-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-gray-700 text-xs flex-1" numberOfLines={1}>
                {item.x}: {item.label || ''}
              </Text>
              <Text className="text-gray-900 font-semibold text-xs ml-2">{item.y}</Text>
            </View>
            <View className="h-6 bg-gray-200 rounded-full overflow-hidden">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${(item.y / maxValue) * 100}%`,
                  backgroundColor: color,
                }}
              />
              {item.cumulative !== undefined && (
                <View
                  className="absolute top-0 bottom-0 w-0.5 bg-orange-500"
                  style={{ left: `${item.cumulative}%` }}
                />
              )}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Render Pareto chart with cumulative line
  const renderParetoChart = (data: ChartDataPoint[], color: string) => {
    const maxValue = Math.max(...data.map((d) => d.y), 1);

    return (
      <View className="mt-4">
        {/* Legend */}
        <View className="flex-row items-center justify-end mb-2 gap-4">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded mr-1" style={{ backgroundColor: color }} />
            <Text className="text-xs text-gray-600">Count</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded mr-1 bg-orange-500" />
            <Text className="text-xs text-gray-600">Cumulative %</Text>
          </View>
        </View>

        {data.map((item, index) => (
          <View key={index} className="mb-3">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-gray-700 text-xs flex-1" numberOfLines={1}>
                {item.x}: {item.label || ''}
              </Text>
              <View className="flex-row items-center">
                <Text className="text-gray-900 font-semibold text-xs">{item.y}</Text>
                {item.cumulative !== undefined && (
                  <Text className="text-orange-600 text-xs ml-2">
                    ({item.cumulative.toFixed(0)}%)
                  </Text>
                )}
              </View>
            </View>
            <View className="h-6 bg-gray-200 rounded-full overflow-hidden relative">
              <View
                className="h-full rounded-full"
                style={{
                  width: `${(item.y / maxValue) * 100}%`,
                  backgroundColor: color,
                }}
              />
              {item.cumulative !== undefined && (
                <View
                  className="absolute top-0 bottom-0 w-1 bg-orange-500 rounded"
                  style={{ left: `${Math.min(item.cumulative, 100)}%` }}
                />
              )}
            </View>
          </View>
        ))}

        {/* 80% line indicator */}
        <View className="mt-4 border-t border-gray-200 pt-2">
          <Text className="text-xs text-gray-500 text-center">
            80/20 Rule: Items above the 80% cumulative line represent the vital few
          </Text>
        </View>
      </View>
    );
  };

  // Render trend chart
  const renderTrendChart = () => {
    const maxIssues = Math.max(...trendData.map((d) => d.issues), 1);
    const maxRejects = Math.max(...trendData.map((d) => d.rejects), 1);
    const maxValue = Math.max(maxIssues, maxRejects);

    return (
      <View className="mt-4">
        {/* Legend */}
        <View className="flex-row items-center justify-center mb-4 gap-6">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded mr-1 bg-blue-500" />
            <Text className="text-xs text-gray-600">Issues</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded mr-1 bg-red-500" />
            <Text className="text-xs text-gray-600">Rejects</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded mr-1 bg-gray-400" />
            <Text className="text-xs text-gray-600">Total Pieces</Text>
          </View>
        </View>

        {/* Chart */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row items-end" style={{ height: 200 }}>
            {trendData.map((item, index) => (
              <View key={index} className="items-center mx-1" style={{ width: 50 }}>
                {/* Bars */}
                <View className="flex-row items-end h-40 gap-0.5">
                  <View
                    className="w-3 bg-blue-500 rounded-t"
                    style={{ height: maxValue > 0 ? (item.issues / maxValue) * 150 : 0 }}
                  />
                  <View
                    className="w-3 bg-red-500 rounded-t"
                    style={{ height: maxValue > 0 ? (item.rejects / maxValue) * 150 : 0 }}
                  />
                </View>
                {/* Label */}
                <Text className="text-xs text-gray-600 mt-1">{item.x}</Text>
                {/* Values */}
                <Text className="text-xs text-gray-400">{item.total}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-100">
      <ScreenHeader
        title="Quality Reports"
        rightContent={
          <Pressable onPress={() => setShowFilterModal(true)} className="p-2 -mr-2">
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </Pressable>
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Filter Summary */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4 border border-gray-200">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs text-gray-500 uppercase tracking-wide">Report Type</Text>
              <Text className="text-gray-900 font-semibold">{getReportTypeLabel(filters.reportType)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 uppercase tracking-wide">Time Range</Text>
              <Text className="text-gray-900 font-semibold">{getTimeRangeLabel(filters.timeRange)}</Text>
            </View>
            <Pressable
              onPress={() => setShowFilterModal(true)}
              className="bg-blue-100 rounded-lg px-3 py-2"
            >
              <Text className="text-blue-700 font-medium text-sm">Customize</Text>
            </Pressable>
          </View>
        </View>

        {/* Summary Stats */}
        <View className="mx-4 mt-4">
          <Text className="text-lg font-semibold text-gray-900 mb-3">Summary Statistics</Text>
          <View className="flex-row flex-wrap gap-2">
            <View className="bg-white rounded-xl p-4 flex-1 min-w-[100px] border border-gray-200">
              <Text className="text-xs text-gray-500">Total Pieces</Text>
              <Text className="text-2xl font-bold text-gray-900">{summaryStats.totalPieces}</Text>
            </View>
            <View className="bg-white rounded-xl p-4 flex-1 min-w-[100px] border border-gray-200">
              <Text className="text-xs text-gray-500">Total Issues</Text>
              <Text className="text-2xl font-bold text-blue-600">{summaryStats.totalIssues}</Text>
              <Text className="text-xs text-gray-400">{summaryStats.issueRate}% rate</Text>
            </View>
            <View className="bg-white rounded-xl p-4 flex-1 min-w-[100px] border border-gray-200">
              <Text className="text-xs text-gray-500">Total Rejects</Text>
              <Text className="text-2xl font-bold text-red-600">{summaryStats.totalRejects}</Text>
              <Text className="text-xs text-gray-400">{summaryStats.rejectRate}% rate</Text>
            </View>
          </View>
        </View>

        {/* Main Chart */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            {getReportTypeLabel(filters.reportType)} - {filters.chartType === 'pareto' ? 'Pareto Analysis' : 'Distribution'}
          </Text>
          <Text className="text-xs text-gray-500 mb-4">
            {filteredEntries.length} pieces analyzed
          </Text>

          {currentChartData.length > 0 ? (
            filters.chartType === 'pareto' ? (
              renderParetoChart(
                currentChartData,
                filters.reportType === 'reject-codes' ? '#EF4444' : '#3B82F6'
              )
            ) : (
              renderSimpleBarChart(
                currentChartData,
                filters.reportType === 'reject-codes' ? '#EF4444' : '#3B82F6'
              )
            )
          ) : (
            <View className="h-40 items-center justify-center">
              <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
              <Text className="text-gray-400 mt-2">No data for selected filters</Text>
            </View>
          )}
        </View>

        {/* Trend Chart */}
        <View className="bg-white mx-4 mt-4 mb-6 rounded-xl p-4 border border-gray-200">
          <Text className="text-lg font-semibold text-gray-900 mb-2">
            {filters.timeRange === 'rolling-13-weeks' ? 'Weekly' : 'Monthly'} Trend
          </Text>
          <Text className="text-xs text-gray-500 mb-4">
            Issues and rejects over time
          </Text>

          {renderTrendChart()}
        </View>

        {/* Top Issues Table */}
        {filters.reportType === 'issue-codes' && issueCodeData.length > 0 && (
          <View className="bg-white mx-4 mb-6 rounded-xl p-4 border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Top Issue Codes</Text>
            <View className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <View className="flex-row bg-gray-50 p-3 border-b border-gray-200">
                <Text className="flex-1 text-xs font-semibold text-gray-700">Code</Text>
                <Text className="flex-2 text-xs font-semibold text-gray-700">Description</Text>
                <Text className="w-16 text-xs font-semibold text-gray-700 text-right">Count</Text>
                <Text className="w-16 text-xs font-semibold text-gray-700 text-right">%</Text>
              </View>
              {/* Rows */}
              {issueCodeData.slice(0, 10).map((item, index) => (
                <View
                  key={index}
                  className={`flex-row p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                    index < issueCodeData.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <Text className="flex-1 text-sm text-gray-900 font-medium">{item.x}</Text>
                  <Text className="flex-2 text-sm text-gray-600" numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text className="w-16 text-sm text-gray-900 text-right">{item.y}</Text>
                  <Text className="w-16 text-sm text-gray-500 text-right">
                    {summaryStats.totalIssues > 0
                      ? ((item.y / summaryStats.totalIssues) * 100).toFixed(1)
                      : '0'}
                    %
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Rejects Table */}
        {filters.reportType === 'reject-codes' && rejectCodeData.length > 0 && (
          <View className="bg-white mx-4 mb-6 rounded-xl p-4 border border-gray-200">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Top Reject Codes</Text>
            <View className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Header */}
              <View className="flex-row bg-gray-50 p-3 border-b border-gray-200">
                <Text className="flex-1 text-xs font-semibold text-gray-700">Code</Text>
                <Text className="flex-2 text-xs font-semibold text-gray-700">Description</Text>
                <Text className="w-16 text-xs font-semibold text-gray-700 text-right">Count</Text>
                <Text className="w-16 text-xs font-semibold text-gray-700 text-right">%</Text>
              </View>
              {/* Rows */}
              {rejectCodeData.slice(0, 10).map((item, index) => (
                <View
                  key={index}
                  className={`flex-row p-3 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${
                    index < rejectCodeData.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  <Text className="flex-1 text-sm text-gray-900 font-medium">{item.x}</Text>
                  <Text className="flex-2 text-sm text-gray-600" numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text className="w-16 text-sm text-gray-900 text-right">{item.y}</Text>
                  <Text className="w-16 text-sm text-gray-500 text-right">
                    {summaryStats.totalRejects > 0
                      ? ((item.y / summaryStats.totalRejects) * 100).toFixed(1)
                      : '0'}
                    %
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowFilterModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setShowFilterModal(false)}
        >
          <View className="flex-1 justify-end">
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-xl font-bold text-gray-900">Report Settings</Text>
                  <Pressable onPress={() => setShowFilterModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Report Type */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-3">Report Type</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(['issue-codes', 'reject-codes', 'dispositions', 'products'] as ReportType[]).map(
                        (type) => (
                          <Pressable
                            key={type}
                            onPress={() => setFilters((f) => ({ ...f, reportType: type }))}
                            className={`px-4 py-2 rounded-lg border ${
                              filters.reportType === type
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-white border-gray-300'
                            }`}
                          >
                            <Text
                              className={`text-sm font-medium ${
                                filters.reportType === type ? 'text-white' : 'text-gray-700'
                              }`}
                            >
                              {getReportTypeLabel(type)}
                            </Text>
                          </Pressable>
                        )
                      )}
                    </View>
                  </View>

                  {/* Time Range */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-3">Time Range</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(['rolling-13-weeks', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
                        <Pressable
                          key={range}
                          onPress={() => setFilters((f) => ({ ...f, timeRange: range }))}
                          className={`px-4 py-2 rounded-lg border ${
                            filters.timeRange === range
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              filters.timeRange === range ? 'text-white' : 'text-gray-700'
                            }`}
                          >
                            {range === 'rolling-13-weeks'
                              ? 'Rolling 13 Weeks'
                              : range === 'monthly'
                              ? 'By Month'
                              : 'By Year'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Year Selector (for monthly/yearly) */}
                  {(filters.timeRange === 'monthly' || filters.timeRange === 'yearly') && (
                    <View className="mb-6">
                      <Text className="text-sm font-semibold text-gray-700 mb-3">Year</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {availableYears.length > 0 ? (
                          availableYears.map((year) => (
                            <Pressable
                              key={year}
                              onPress={() => setFilters((f) => ({ ...f, year }))}
                              className={`px-4 py-2 rounded-lg border ${
                                filters.year === year
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'bg-white border-gray-300'
                              }`}
                            >
                              <Text
                                className={`text-sm font-medium ${
                                  filters.year === year ? 'text-white' : 'text-gray-700'
                                }`}
                              >
                                {year}
                              </Text>
                            </Pressable>
                          ))
                        ) : (
                          <Text className="text-gray-500 text-sm">No data available</Text>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Chart Type */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-3">Chart Type</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(['pareto', 'bar'] as ChartType[]).map((type) => (
                        <Pressable
                          key={type}
                          onPress={() => setFilters((f) => ({ ...f, chartType: type }))}
                          className={`px-4 py-2 rounded-lg border ${
                            filters.chartType === type
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-white border-gray-300'
                          }`}
                        >
                          <Text
                            className={`text-sm font-medium ${
                              filters.chartType === type ? 'text-white' : 'text-gray-700'
                            }`}
                          >
                            {getChartTypeLabel(type)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </ScrollView>

                {/* Apply Button */}
                <Pressable
                  onPress={() => setShowFilterModal(false)}
                  className="bg-blue-500 rounded-xl py-4 items-center mt-4"
                >
                  <Text className="text-white font-semibold text-base">Apply Filters</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
