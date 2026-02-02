// Quality Reports Screen - Excel-like data visualization and trend analysis
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useQualityLogStore } from '../state/qualityLogStore';
import ScreenHeader from '../components/ScreenHeader';
import {
  getIssueCodeDescription,
} from '../types/quality-log';
import Svg, { Rect, Line, Text as SvgText, Circle, Path, G } from 'react-native-svg';

type Props = NativeStackScreenProps<RootStackParamList, 'QualityReports'>;

// Report type options
type ReportType = 'issue-codes' | 'reject-codes' | 'dispositions' | 'products';
type TimeRange = 'rolling-13-weeks' | 'monthly' | 'yearly' | 'custom';
type ChartType = 'pareto' | 'vertical-bar' | 'horizontal-bar' | 'line' | 'pie';

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
const CHART_PADDING = 32;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2 - 32;
const CHART_HEIGHT = 280;

// Color palette for charts
const CHART_COLORS = [
  '#3B82F6', // blue
  '#EF4444', // red
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#6366F1', // indigo
];

export default function QualityReportsScreen({ navigation }: Props) {
  const entries = useQualityLogStore((s) => s.entries);
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

    const sorted = Object.entries(dispCounts)
      .sort((a, b) => b[1] - a[1]);

    const total = sorted.reduce((sum, [_, count]) => sum + count, 0);
    let cumulative = 0;

    return sorted.map(([disp, count]) => {
      cumulative += count;
      return {
        x: disp,
        y: count,
        label: disp,
        cumulative: total > 0 ? (cumulative / total) * 100 : 0,
      };
    });
  }, [filteredEntries]);

  // Calculate product type distribution
  const productData = useMemo(() => {
    const productCounts: Record<string, number> = {};

    filteredEntries.forEach((entry) => {
      const product = entry.productType || 'Unknown';
      productCounts[product] = (productCounts[product] || 0) + 1;
    });

    const sorted = Object.entries(productCounts)
      .sort((a, b) => b[1] - a[1]);

    const total = sorted.reduce((sum, [_, count]) => sum + count, 0);
    let cumulative = 0;

    return sorted.map(([product, count]) => {
      cumulative += count;
      return {
        x: product,
        y: count,
        label: product,
        cumulative: total > 0 ? (cumulative / total) * 100 : 0,
      };
    });
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
    const weekData: Array<{ x: string; issues: number; rejects: number; total: number }> = [];
    const now = new Date();

    // Create 13 week buckets
    for (let i = 12; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      const weekLabel = `W${13 - i}`;

      let issues = 0;
      let rejects = 0;
      let total = 0;

      filteredEntries.forEach((entry) => {
        if (!entry.pourDate) return;
        const entryDate = new Date(entry.pourDate);
        if (entryDate >= weekStart && entryDate <= weekEnd) {
          total += 1;
          issues += entry.issueCodes?.length || 0;
          rejects += entry.rejectCodes?.length || 0;
        }
      });

      weekData.push({ x: weekLabel, issues, rejects, total });
    }

    return weekData;
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
      case 'vertical-bar': return 'Column Chart';
      case 'horizontal-bar': return 'Bar Chart';
      case 'line': return 'Line Chart';
      case 'pie': return 'Pie Chart';
    }
  };

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalPieces = filteredEntries.length;
    const totalIssues = filteredEntries.reduce((sum, e) => sum + (e.issueCodes?.length || 0), 0);
    const totalRejects = filteredEntries.reduce((sum, e) => sum + (e.rejectCodes?.length || 0), 0);
    const piecesWithIssues = filteredEntries.filter((e) => (e.issueCodes?.length || 0) > 0).length;
    const piecesWithRejects = filteredEntries.filter((e) => (e.rejectCodes?.length || 0) > 0).length;

    return {
      totalPieces,
      totalIssues,
      totalRejects,
      issueRate: totalPieces > 0 ? ((piecesWithIssues / totalPieces) * 100).toFixed(1) : '0',
      rejectRate: totalPieces > 0 ? ((piecesWithRejects / totalPieces) * 100).toFixed(1) : '0',
    };
  }, [filteredEntries]);

  // Render Vertical Bar Chart (Column Chart) with SVG
  const renderVerticalBarChart = (data: ChartDataPoint[], color: string) => {
    if (data.length === 0) return renderNoData();

    const maxValue = Math.max(...data.map((d) => d.y), 1);
    const barWidth = Math.min(30, (CHART_WIDTH - 60) / data.length - 4);
    const chartAreaWidth = CHART_WIDTH - 40;
    const chartAreaHeight = CHART_HEIGHT - 60;
    const startX = 40;
    const startY = 20;

    return (
      <View>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Y-axis */}
          <Line x1={startX} y1={startY} x2={startX} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* X-axis */}
          <Line x1={startX} y1={startY + chartAreaHeight} x2={startX + chartAreaWidth} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* Y-axis labels and grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = startY + chartAreaHeight * (1 - ratio);
            const value = Math.round(maxValue * ratio);
            return (
              <G key={i}>
                <Line x1={startX} y1={y} x2={startX + chartAreaWidth} y2={y} stroke="#F3F4F6" strokeWidth={1} />
                <SvgText x={startX - 5} y={y + 4} fontSize={10} fill="#6B7280" textAnchor="end">
                  {value}
                </SvgText>
              </G>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.y / maxValue) * chartAreaHeight;
            const x = startX + (index * (chartAreaWidth / data.length)) + ((chartAreaWidth / data.length) - barWidth) / 2;
            const y = startY + chartAreaHeight - barHeight;

            return (
              <G key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx={2}
                />
                {/* Value on top of bar */}
                {item.y > 0 && (
                  <SvgText
                    x={x + barWidth / 2}
                    y={y - 5}
                    fontSize={9}
                    fill="#374151"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {item.y}
                  </SvgText>
                )}
                {/* X-axis label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={startY + chartAreaHeight + 15}
                  fontSize={9}
                  fill="#6B7280"
                  textAnchor="middle"
                >
                  {item.x.length > 4 ? item.x.slice(0, 4) : item.x}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Legend below chart */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
          <View className="flex-row flex-wrap px-2">
            {data.slice(0, 10).map((item, index) => (
              <View key={index} className="flex-row items-center mr-4 mb-1">
                <Text className="text-xs text-gray-600">
                  <Text className="font-semibold">{item.x}</Text>: {item.label || item.x}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  // Render Horizontal Bar Chart with SVG
  const renderHorizontalBarChart = (data: ChartDataPoint[], color: string) => {
    if (data.length === 0) return renderNoData();

    const maxValue = Math.max(...data.map((d) => d.y), 1);
    const barHeight = 24;
    const barSpacing = 8;
    const labelWidth = 50;
    const valueWidth = 40;
    const chartAreaWidth = CHART_WIDTH - labelWidth - valueWidth - 20;
    const totalHeight = data.length * (barHeight + barSpacing) + 20;

    return (
      <View>
        <Svg width={CHART_WIDTH} height={totalHeight}>
          {data.map((item, index) => {
            const barWidth = (item.y / maxValue) * chartAreaWidth;
            const y = index * (barHeight + barSpacing) + 10;

            return (
              <G key={index}>
                {/* Label */}
                <SvgText
                  x={labelWidth - 5}
                  y={y + barHeight / 2 + 4}
                  fontSize={11}
                  fill="#374151"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {item.x}
                </SvgText>

                {/* Background bar */}
                <Rect
                  x={labelWidth}
                  y={y}
                  width={chartAreaWidth}
                  height={barHeight}
                  fill="#F3F4F6"
                  rx={4}
                />

                {/* Value bar */}
                <Rect
                  x={labelWidth}
                  y={y}
                  width={Math.max(barWidth, 2)}
                  height={barHeight}
                  fill={color}
                  rx={4}
                />

                {/* Value text */}
                <SvgText
                  x={labelWidth + chartAreaWidth + 8}
                  y={y + barHeight / 2 + 4}
                  fontSize={11}
                  fill="#374151"
                  textAnchor="start"
                  fontWeight="600"
                >
                  {item.y}
                </SvgText>
              </G>
            );
          })}
        </Svg>

        {/* Description legend */}
        <View className="mt-3 border-t border-gray-200 pt-3">
          {data.slice(0, 8).map((item, index) => (
            <Text key={index} className="text-xs text-gray-600 mb-1">
              <Text className="font-semibold text-gray-800">{item.x}</Text> - {item.label || item.x}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // Render Pareto Chart with SVG (Bars + Cumulative Line)
  const renderParetoChart = (data: ChartDataPoint[], color: string) => {
    if (data.length === 0) return renderNoData();

    const maxValue = Math.max(...data.map((d) => d.y), 1);
    const barWidth = Math.min(28, (CHART_WIDTH - 70) / data.length - 4);
    const chartAreaWidth = CHART_WIDTH - 50;
    const chartAreaHeight = CHART_HEIGHT - 70;
    const startX = 45;
    const startY = 25;

    // Build cumulative line path
    let linePath = '';
    data.forEach((item, index) => {
      const x = startX + (index * (chartAreaWidth / data.length)) + (chartAreaWidth / data.length) / 2;
      const y = startY + chartAreaHeight - ((item.cumulative || 0) / 100) * chartAreaHeight;
      if (index === 0) {
        linePath = `M ${x} ${y}`;
      } else {
        linePath += ` L ${x} ${y}`;
      }
    });

    return (
      <View>
        {/* Legend */}
        <View className="flex-row items-center justify-center mb-3 gap-6">
          <View className="flex-row items-center">
            <View className="w-4 h-3 rounded mr-2" style={{ backgroundColor: color }} />
            <Text className="text-xs text-gray-600">Count</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-4 h-0.5 bg-orange-500 mr-2" />
            <Text className="text-xs text-gray-600">Cumulative %</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-4 h-0.5 bg-red-400 mr-2" style={{ borderStyle: 'dashed' }} />
            <Text className="text-xs text-gray-600">80% Line</Text>
          </View>
        </View>

        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Y-axis (left - count) */}
          <Line x1={startX} y1={startY} x2={startX} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* Y-axis (right - percentage) */}
          <Line x1={startX + chartAreaWidth} y1={startY} x2={startX + chartAreaWidth} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* X-axis */}
          <Line x1={startX} y1={startY + chartAreaHeight} x2={startX + chartAreaWidth} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* Grid lines and Y-axis labels (left - count) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = startY + chartAreaHeight * (1 - ratio);
            const value = Math.round(maxValue * ratio);
            return (
              <G key={`left-${i}`}>
                <Line x1={startX} y1={y} x2={startX + chartAreaWidth} y2={y} stroke="#F3F4F6" strokeWidth={1} />
                <SvgText x={startX - 5} y={y + 4} fontSize={9} fill="#6B7280" textAnchor="end">
                  {value}
                </SvgText>
              </G>
            );
          })}

          {/* Y-axis labels (right - percentage) */}
          {[0, 25, 50, 75, 100].map((percent, i) => {
            const y = startY + chartAreaHeight * (1 - percent / 100);
            return (
              <SvgText key={`right-${i}`} x={startX + chartAreaWidth + 5} y={y + 4} fontSize={9} fill="#F97316" textAnchor="start">
                {percent}%
              </SvgText>
            );
          })}

          {/* 80% horizontal line */}
          <Line
            x1={startX}
            y1={startY + chartAreaHeight * 0.2}
            x2={startX + chartAreaWidth}
            y2={startY + chartAreaHeight * 0.2}
            stroke="#F87171"
            strokeWidth={1}
            strokeDasharray="5,5"
          />

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = (item.y / maxValue) * chartAreaHeight;
            const x = startX + (index * (chartAreaWidth / data.length)) + ((chartAreaWidth / data.length) - barWidth) / 2;
            const y = startY + chartAreaHeight - barHeight;

            return (
              <G key={index}>
                <Rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={color}
                  rx={2}
                />
                {/* X-axis label */}
                <SvgText
                  x={x + barWidth / 2}
                  y={startY + chartAreaHeight + 12}
                  fontSize={8}
                  fill="#6B7280"
                  textAnchor="middle"
                >
                  {item.x}
                </SvgText>
              </G>
            );
          })}

          {/* Cumulative line */}
          <Path d={linePath} stroke="#F97316" strokeWidth={2} fill="none" />

          {/* Cumulative line points */}
          {data.map((item, index) => {
            const x = startX + (index * (chartAreaWidth / data.length)) + (chartAreaWidth / data.length) / 2;
            const y = startY + chartAreaHeight - ((item.cumulative || 0) / 100) * chartAreaHeight;
            return (
              <Circle key={`point-${index}`} cx={x} cy={y} r={4} fill="#F97316" />
            );
          })}
        </Svg>

        {/* Data table */}
        <View className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
          <View className="flex-row bg-gray-100 p-2 border-b border-gray-200">
            <Text className="w-12 text-xs font-semibold text-gray-700">Code</Text>
            <Text className="flex-1 text-xs font-semibold text-gray-700">Description</Text>
            <Text className="w-14 text-xs font-semibold text-gray-700 text-right">Count</Text>
            <Text className="w-14 text-xs font-semibold text-gray-700 text-right">Cum%</Text>
          </View>
          <ScrollView style={{ maxHeight: 150 }}>
            {data.map((item, index) => (
              <View key={index} className={`flex-row p-2 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                <Text className="w-12 text-xs text-gray-900 font-medium">{item.x}</Text>
                <Text className="flex-1 text-xs text-gray-600" numberOfLines={1}>{item.label}</Text>
                <Text className="w-14 text-xs text-gray-900 text-right font-semibold">{item.y}</Text>
                <Text className="w-14 text-xs text-orange-600 text-right">{(item.cumulative || 0).toFixed(0)}%</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  // Render Line Chart with SVG
  const renderLineChart = (data: ChartDataPoint[], color: string) => {
    if (data.length === 0) return renderNoData();

    const maxValue = Math.max(...data.map((d) => d.y), 1);
    const chartAreaWidth = CHART_WIDTH - 50;
    const chartAreaHeight = CHART_HEIGHT - 60;
    const startX = 40;
    const startY = 20;

    // Build line path
    let linePath = '';
    data.forEach((item, index) => {
      const x = startX + (index / (data.length - 1 || 1)) * chartAreaWidth;
      const y = startY + chartAreaHeight - (item.y / maxValue) * chartAreaHeight;
      if (index === 0) {
        linePath = `M ${x} ${y}`;
      } else {
        linePath += ` L ${x} ${y}`;
      }
    });

    // Build area path (for fill under line)
    const areaPath = linePath +
      ` L ${startX + chartAreaWidth} ${startY + chartAreaHeight}` +
      ` L ${startX} ${startY + chartAreaHeight} Z`;

    return (
      <View>
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Y-axis */}
          <Line x1={startX} y1={startY} x2={startX} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* X-axis */}
          <Line x1={startX} y1={startY + chartAreaHeight} x2={startX + chartAreaWidth} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* Grid lines and Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = startY + chartAreaHeight * (1 - ratio);
            const value = Math.round(maxValue * ratio);
            return (
              <G key={i}>
                <Line x1={startX} y1={y} x2={startX + chartAreaWidth} y2={y} stroke="#F3F4F6" strokeWidth={1} />
                <SvgText x={startX - 5} y={y + 4} fontSize={10} fill="#6B7280" textAnchor="end">
                  {value}
                </SvgText>
              </G>
            );
          })}

          {/* Area fill */}
          <Path d={areaPath} fill={color} fillOpacity={0.15} />

          {/* Line */}
          <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" />

          {/* Points and labels */}
          {data.map((item, index) => {
            const x = startX + (index / (data.length - 1 || 1)) * chartAreaWidth;
            const y = startY + chartAreaHeight - (item.y / maxValue) * chartAreaHeight;
            return (
              <G key={index}>
                <Circle cx={x} cy={y} r={5} fill="white" stroke={color} strokeWidth={2} />
                {/* Value above point */}
                <SvgText x={x} y={y - 10} fontSize={9} fill="#374151" textAnchor="middle" fontWeight="600">
                  {item.y}
                </SvgText>
                {/* X-axis label */}
                <SvgText
                  x={x}
                  y={startY + chartAreaHeight + 15}
                  fontSize={9}
                  fill="#6B7280"
                  textAnchor="middle"
                >
                  {item.x.length > 5 ? item.x.slice(0, 5) : item.x}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  };

  // Render Pie Chart with SVG
  const renderPieChart = (data: ChartDataPoint[]) => {
    if (data.length === 0) return renderNoData();

    const total = data.reduce((sum, d) => sum + d.y, 0);
    if (total === 0) return renderNoData();

    const centerX = CHART_WIDTH / 2;
    const centerY = 120;
    const radius = 90;
    const innerRadius = 45; // Donut chart

    let currentAngle = -Math.PI / 2; // Start at top

    const slices = data.map((item, index) => {
      const sliceAngle = (item.y / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      // Calculate arc path
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);

      const x1Inner = centerX + innerRadius * Math.cos(startAngle);
      const y1Inner = centerY + innerRadius * Math.sin(startAngle);
      const x2Inner = centerX + innerRadius * Math.cos(endAngle);
      const y2Inner = centerY + innerRadius * Math.sin(endAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1Inner} ${y1Inner}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        `L ${x2Inner} ${y2Inner}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner}`,
        'Z'
      ].join(' ');

      // Label position
      const midAngle = (startAngle + endAngle) / 2;
      const labelRadius = radius + 20;
      const labelX = centerX + labelRadius * Math.cos(midAngle);
      const labelY = centerY + labelRadius * Math.sin(midAngle);
      const percentage = ((item.y / total) * 100).toFixed(1);

      return {
        path: pathData,
        color: CHART_COLORS[index % CHART_COLORS.length],
        label: item.x,
        value: item.y,
        percentage,
        labelX,
        labelY,
        midAngle,
      };
    });

    return (
      <View>
        <Svg width={CHART_WIDTH} height={260}>
          {/* Pie slices */}
          {slices.map((slice, index) => (
            <Path key={index} d={slice.path} fill={slice.color} />
          ))}

          {/* Center text */}
          <SvgText x={centerX} y={centerY - 5} fontSize={20} fill="#374151" textAnchor="middle" fontWeight="bold">
            {total}
          </SvgText>
          <SvgText x={centerX} y={centerY + 12} fontSize={11} fill="#6B7280" textAnchor="middle">
            Total
          </SvgText>
        </Svg>

        {/* Legend */}
        <View className="flex-row flex-wrap justify-center mt-2 px-4">
          {slices.map((slice, index) => (
            <View key={index} className="flex-row items-center mr-4 mb-2">
              <View className="w-3 h-3 rounded mr-1.5" style={{ backgroundColor: slice.color }} />
              <Text className="text-xs text-gray-700">
                {slice.label} ({slice.percentage}%)
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render Trend Chart (Issues vs Rejects over time)
  const renderTrendChart = () => {
    const maxIssues = Math.max(...trendData.map((d) => d.issues), 1);
    const maxRejects = Math.max(...trendData.map((d) => d.rejects), 1);
    const maxValue = Math.max(maxIssues, maxRejects, 1);

    const chartAreaWidth = CHART_WIDTH - 50;
    const chartAreaHeight = 180;
    const startX = 40;
    const startY = 20;

    // Build line paths
    let issuesPath = '';
    let rejectsPath = '';

    trendData.forEach((item, index) => {
      const x = startX + (index / (trendData.length - 1 || 1)) * chartAreaWidth;
      const yIssues = startY + chartAreaHeight - (item.issues / maxValue) * chartAreaHeight;
      const yRejects = startY + chartAreaHeight - (item.rejects / maxValue) * chartAreaHeight;

      if (index === 0) {
        issuesPath = `M ${x} ${yIssues}`;
        rejectsPath = `M ${x} ${yRejects}`;
      } else {
        issuesPath += ` L ${x} ${yIssues}`;
        rejectsPath += ` L ${x} ${yRejects}`;
      }
    });

    return (
      <View>
        {/* Legend */}
        <View className="flex-row items-center justify-center mb-3 gap-6">
          <View className="flex-row items-center">
            <View className="w-4 h-1 bg-blue-500 rounded mr-2" />
            <Text className="text-xs text-gray-600">Issues</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-4 h-1 bg-red-500 rounded mr-2" />
            <Text className="text-xs text-gray-600">Rejects</Text>
          </View>
        </View>

        <Svg width={CHART_WIDTH} height={chartAreaHeight + 50}>
          {/* Y-axis */}
          <Line x1={startX} y1={startY} x2={startX} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* X-axis */}
          <Line x1={startX} y1={startY + chartAreaHeight} x2={startX + chartAreaWidth} y2={startY + chartAreaHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* Grid lines and Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = startY + chartAreaHeight * (1 - ratio);
            const value = Math.round(maxValue * ratio);
            return (
              <G key={i}>
                <Line x1={startX} y1={y} x2={startX + chartAreaWidth} y2={y} stroke="#F3F4F6" strokeWidth={1} />
                <SvgText x={startX - 5} y={y + 4} fontSize={9} fill="#6B7280" textAnchor="end">
                  {value}
                </SvgText>
              </G>
            );
          })}

          {/* Issues line and points */}
          <Path d={issuesPath} stroke="#3B82F6" strokeWidth={2.5} fill="none" />
          {trendData.map((item, index) => {
            const x = startX + (index / (trendData.length - 1 || 1)) * chartAreaWidth;
            const y = startY + chartAreaHeight - (item.issues / maxValue) * chartAreaHeight;
            return (
              <Circle key={`issue-${index}`} cx={x} cy={y} r={4} fill="#3B82F6" />
            );
          })}

          {/* Rejects line and points */}
          <Path d={rejectsPath} stroke="#EF4444" strokeWidth={2.5} fill="none" />
          {trendData.map((item, index) => {
            const x = startX + (index / (trendData.length - 1 || 1)) * chartAreaWidth;
            const y = startY + chartAreaHeight - (item.rejects / maxValue) * chartAreaHeight;
            return (
              <Circle key={`reject-${index}`} cx={x} cy={y} r={4} fill="#EF4444" />
            );
          })}

          {/* X-axis labels */}
          {trendData.map((item, index) => {
            const x = startX + (index / (trendData.length - 1 || 1)) * chartAreaWidth;
            return (
              <SvgText
                key={`label-${index}`}
                x={x}
                y={startY + chartAreaHeight + 15}
                fontSize={8}
                fill="#6B7280"
                textAnchor="middle"
              >
                {item.x}
              </SvgText>
            );
          })}
        </Svg>

        {/* Summary row */}
        <View className="flex-row justify-around mt-2 px-4">
          <View className="items-center">
            <Text className="text-lg font-bold text-blue-600">
              {trendData.reduce((sum, d) => sum + d.issues, 0)}
            </Text>
            <Text className="text-xs text-gray-500">Total Issues</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">
              {trendData.reduce((sum, d) => sum + d.rejects, 0)}
            </Text>
            <Text className="text-xs text-gray-500">Total Rejects</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-700">
              {trendData.reduce((sum, d) => sum + d.total, 0)}
            </Text>
            <Text className="text-xs text-gray-500">Total Pieces</Text>
          </View>
        </View>
      </View>
    );
  };

  // Render no data message
  const renderNoData = () => (
    <View className="h-48 items-center justify-center">
      <Ionicons name="bar-chart-outline" size={48} color="#D1D5DB" />
      <Text className="text-gray-400 mt-2">No data for selected filters</Text>
    </View>
  );

  // Render the appropriate chart based on filter selection
  const renderChart = () => {
    const color = filters.reportType === 'reject-codes' ? '#EF4444' : '#3B82F6';

    switch (filters.chartType) {
      case 'pareto':
        return renderParetoChart(currentChartData, color);
      case 'vertical-bar':
        return renderVerticalBarChart(currentChartData, color);
      case 'horizontal-bar':
        return renderHorizontalBarChart(currentChartData, color);
      case 'line':
        return renderLineChart(currentChartData, color);
      case 'pie':
        return renderPieChart(currentChartData);
      default:
        return renderVerticalBarChart(currentChartData, color);
    }
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
              <Text className="text-xs text-gray-500 uppercase tracking-wide">Report</Text>
              <Text className="text-gray-900 font-semibold text-sm">{getReportTypeLabel(filters.reportType)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 uppercase tracking-wide">Range</Text>
              <Text className="text-gray-900 font-semibold text-sm">{getTimeRangeLabel(filters.timeRange)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-xs text-gray-500 uppercase tracking-wide">Chart</Text>
              <Text className="text-gray-900 font-semibold text-sm">{getChartTypeLabel(filters.chartType)}</Text>
            </View>
            <Pressable
              onPress={() => setShowFilterModal(true)}
              className="bg-blue-100 rounded-lg px-3 py-2"
            >
              <Ionicons name="settings-outline" size={18} color="#3B82F6" />
            </Pressable>
          </View>
        </View>

        {/* Summary Stats */}
        <View className="mx-4 mt-4">
          <View className="flex-row gap-2">
            <View className="bg-white rounded-xl p-3 flex-1 border border-gray-200">
              <Text className="text-xs text-gray-500">Total Pieces</Text>
              <Text className="text-xl font-bold text-gray-900">{summaryStats.totalPieces}</Text>
            </View>
            <View className="bg-white rounded-xl p-3 flex-1 border border-blue-200">
              <Text className="text-xs text-blue-600">Issues</Text>
              <Text className="text-xl font-bold text-blue-600">{summaryStats.totalIssues}</Text>
              <Text className="text-xs text-gray-400">{summaryStats.issueRate}% rate</Text>
            </View>
            <View className="bg-white rounded-xl p-3 flex-1 border border-red-200">
              <Text className="text-xs text-red-600">Rejects</Text>
              <Text className="text-xl font-bold text-red-600">{summaryStats.totalRejects}</Text>
              <Text className="text-xs text-gray-400">{summaryStats.rejectRate}% rate</Text>
            </View>
          </View>
        </View>

        {/* Main Chart */}
        <View className="bg-white mx-4 mt-4 rounded-xl p-4 border border-gray-200">
          <Text className="text-base font-semibold text-gray-900 mb-1">
            {getReportTypeLabel(filters.reportType)}
          </Text>
          <Text className="text-xs text-gray-500 mb-4">
            {getChartTypeLabel(filters.chartType)} • {filteredEntries.length} pieces analyzed
          </Text>

          {renderChart()}
        </View>

        {/* Trend Chart */}
        <View className="bg-white mx-4 mt-4 mb-6 rounded-xl p-4 border border-gray-200">
          <Text className="text-base font-semibold text-gray-900 mb-1">
            {filters.timeRange === 'rolling-13-weeks' ? 'Weekly' : 'Monthly'} Trend
          </Text>
          <Text className="text-xs text-gray-500 mb-4">
            Issues vs Rejects over time
          </Text>

          {renderTrendChart()}
        </View>
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
              <View className="bg-white rounded-t-3xl p-6 max-h-[85%]">
                <View className="flex-row items-center justify-between mb-6">
                  <Text className="text-xl font-bold text-gray-900">Report Settings</Text>
                  <Pressable onPress={() => setShowFilterModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Report Type */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-3">Data Source</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(['issue-codes', 'reject-codes', 'dispositions', 'products'] as ReportType[]).map(
                        (type) => (
                          <Pressable
                            key={type}
                            onPress={() => setFilters((f) => ({ ...f, reportType: type }))}
                            className={`px-4 py-2.5 rounded-xl border-2 ${
                              filters.reportType === type
                                ? 'bg-blue-500 border-blue-500'
                                : 'bg-white border-gray-200'
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

                  {/* Chart Type */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-3">Chart Type</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(['pareto', 'vertical-bar', 'horizontal-bar', 'line', 'pie'] as ChartType[]).map((type) => (
                        <Pressable
                          key={type}
                          onPress={() => setFilters((f) => ({ ...f, chartType: type }))}
                          className={`px-4 py-2.5 rounded-xl border-2 flex-row items-center ${
                            filters.chartType === type
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          <Ionicons
                            name={
                              type === 'pareto' ? 'trending-up' :
                              type === 'vertical-bar' ? 'bar-chart' :
                              type === 'horizontal-bar' ? 'stats-chart' :
                              type === 'line' ? 'analytics' :
                              'pie-chart'
                            }
                            size={16}
                            color={filters.chartType === type ? '#FFFFFF' : '#6B7280'}
                            style={{ marginRight: 6 }}
                          />
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

                  {/* Time Range */}
                  <View className="mb-6">
                    <Text className="text-sm font-semibold text-gray-700 mb-3">Time Range</Text>
                    <View className="flex-row flex-wrap gap-2">
                      {(['rolling-13-weeks', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
                        <Pressable
                          key={range}
                          onPress={() => setFilters((f) => ({ ...f, timeRange: range }))}
                          className={`px-4 py-2.5 rounded-xl border-2 ${
                            filters.timeRange === range
                              ? 'bg-blue-500 border-blue-500'
                              : 'bg-white border-gray-200'
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
                              ? 'Monthly'
                              : 'Yearly'}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {/* Year Selector */}
                  {(filters.timeRange === 'monthly' || filters.timeRange === 'yearly') && (
                    <View className="mb-6">
                      <Text className="text-sm font-semibold text-gray-700 mb-3">Year</Text>
                      <View className="flex-row flex-wrap gap-2">
                        {availableYears.length > 0 ? (
                          availableYears.map((year) => (
                            <Pressable
                              key={year}
                              onPress={() => setFilters((f) => ({ ...f, year }))}
                              className={`px-4 py-2.5 rounded-xl border-2 ${
                                filters.year === year
                                  ? 'bg-blue-500 border-blue-500'
                                  : 'bg-white border-gray-200'
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
                </ScrollView>

                {/* Apply Button */}
                <Pressable
                  onPress={() => setShowFilterModal(false)}
                  className="bg-blue-500 rounded-xl py-4 items-center mt-4"
                >
                  <Text className="text-white font-semibold text-base">Apply Settings</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
