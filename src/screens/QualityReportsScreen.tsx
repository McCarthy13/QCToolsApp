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
const CHART_PADDING = 16;
const CHART_WIDTH = SCREEN_WIDTH - CHART_PADDING * 2 - 32;

// Color palette for pie chart
const CHART_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
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
        case 'monthly':
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

    const sorted = Object.entries(codeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

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
      .slice(0, 10);

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
      const disp = entry.disposition || 'None';
      dispCounts[disp] = (dispCounts[disp] || 0) + 1;
    });

    const sorted = Object.entries(dispCounts).sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((sum, [_, count]) => sum + count, 0);
    let cumulative = 0;

    return sorted.map(([disp, count]) => {
      cumulative += count;
      return {
        x: disp.length > 12 ? disp.slice(0, 10) + '..' : disp,
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

    const sorted = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
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

  // Calculate weekly trend data for rolling 13 weeks
  const weeklyTrendData = useMemo(() => {
    const weekData: Array<{ x: string; issues: number; rejects: number; total: number }> = [];
    const now = new Date();

    for (let i = 12; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7) - 6);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - (i * 7));

      let issues = 0, rejects = 0, total = 0;
      filteredEntries.forEach((entry) => {
        if (!entry.pourDate) return;
        const entryDate = new Date(entry.pourDate);
        if (entryDate >= weekStart && entryDate <= weekEnd) {
          total += 1;
          issues += entry.issueCodes?.length || 0;
          rejects += entry.rejectCodes?.length || 0;
        }
      });

      weekData.push({ x: `W${13 - i}`, issues, rejects, total });
    }
    return weekData;
  }, [filteredEntries]);

  // Calculate monthly trend data
  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts: Record<string, { issues: number; rejects: number; total: number }> = {};

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
      ...monthCounts[month],
    }));
  }, [filteredEntries]);

  const currentChartData = useMemo(() => {
    switch (filters.reportType) {
      case 'issue-codes': return issueCodeData;
      case 'reject-codes': return rejectCodeData;
      case 'dispositions': return dispositionData;
      case 'products': return productData;
      default: return [];
    }
  }, [filters.reportType, issueCodeData, rejectCodeData, dispositionData, productData]);

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
      case 'pareto': return 'Pareto';
      case 'vertical-bar': return 'Column';
      case 'horizontal-bar': return 'Bar';
      case 'line': return 'Line';
      case 'pie': return 'Pie';
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

  // No data placeholder
  const renderNoData = () => (
    <View className="h-40 items-center justify-center">
      <Ionicons name="bar-chart-outline" size={40} color="#D1D5DB" />
      <Text className="text-gray-400 mt-2 text-sm">No data available</Text>
    </View>
  );

  // Clean Vertical Bar Chart
  const renderVerticalBarChart = (data: ChartDataPoint[], color: string) => {
    if (data.length === 0) return renderNoData();

    const maxValue = Math.max(...data.map((d) => d.y), 1);
    const chartHeight = 200;
    const barAreaWidth = CHART_WIDTH - 30;
    const barWidth = Math.min(32, (barAreaWidth / data.length) - 8);
    const startX = 30;
    const startY = 10;

    return (
      <View>
        <Svg width={CHART_WIDTH} height={chartHeight + 30}>
          {/* Y-axis line */}
          <Line x1={startX} y1={startY} x2={startX} y2={startY + chartHeight} stroke="#E5E7EB" strokeWidth={1} />

          {/* Y-axis labels - only 3 */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = startY + chartHeight * (1 - ratio);
            const value = Math.round(maxValue * ratio);
            return (
              <SvgText key={i} x={startX - 4} y={y + 3} fontSize={10} fill="#9CA3AF" textAnchor="end">
                {value}
              </SvgText>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const barHeight = Math.max((item.y / maxValue) * chartHeight, 2);
            const x = startX + 10 + index * (barAreaWidth / data.length) + (barAreaWidth / data.length - barWidth) / 2;
            const y = startY + chartHeight - barHeight;

            return (
              <G key={index}>
                <Rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx={3} />
              </G>
            );
          })}
        </Svg>

        {/* Data Table - Clean format */}
        <View className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
          <View className="flex-row bg-gray-50 px-3 py-2">
            <Text className="text-xs font-semibold text-gray-600" style={{ width: 36 }}>Code</Text>
            <Text className="text-xs font-semibold text-gray-600 flex-1" style={{ marginHorizontal: 8 }}>Description</Text>
            <Text className="text-xs font-semibold text-gray-600 text-right" style={{ width: 40 }}>Qty</Text>
          </View>
          {data.map((item, i) => (
            <View key={i} className={`flex-row items-center px-3 py-2 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
              <View className="rounded mr-2" style={{ width: 12, height: 12, backgroundColor: color, opacity: 1 - (i * 0.08) }} />
              <Text className="text-xs text-gray-800 font-medium" style={{ width: 24 }}>{item.x}</Text>
              <Text className="text-xs text-gray-500 flex-1" style={{ marginHorizontal: 8 }} numberOfLines={1}>{item.label}</Text>
              <Text className="text-xs text-gray-900 font-semibold text-right" style={{ width: 40 }}>{item.y}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Clean Horizontal Bar Chart
  const renderHorizontalBarChart = (data: ChartDataPoint[], color: string) => {
    if (data.length === 0) return renderNoData();

    const maxValue = Math.max(...data.map((d) => d.y), 1);
    const barHeight = 20;
    const spacing = 6;
    const labelWidth = 40;
    const barAreaWidth = CHART_WIDTH - labelWidth - 50;

    return (
      <View>
        {data.map((item, index) => {
          const barWidth = Math.max((item.y / maxValue) * barAreaWidth, 4);
          return (
            <View key={index} className="flex-row items-center" style={{ marginBottom: spacing }}>
              <Text className="text-xs text-gray-700 font-medium" style={{ width: labelWidth }} numberOfLines={1}>
                {item.x}
              </Text>
              <View className="flex-1 mx-2">
                <View className="h-5 bg-gray-100 rounded-full overflow-hidden">
                  <View
                    className="h-full rounded-full"
                    style={{ width: barWidth, backgroundColor: color }}
                  />
                </View>
              </View>
              <Text className="text-xs text-gray-900 font-semibold w-8 text-right">{item.y}</Text>
            </View>
          );
        })}

        {/* Legend */}
        <View className="mt-3 pt-3 border-t border-gray-100">
          {data.slice(0, 5).map((item, i) => (
            <Text key={i} className="text-xs text-gray-500 mb-0.5">
              <Text className="font-medium text-gray-700">{item.x}</Text> = {item.label}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  // Clean Pareto Chart with proper dual axis
  const renderParetoChart = (data: ChartDataPoint[], color: string) => {
    if (data.length === 0) return renderNoData();

    const maxValue = Math.max(...data.map((d) => d.y), 1);
    const chartHeight = 180;
    const barAreaWidth = CHART_WIDTH - 50;
    const barWidth = Math.min(28, (barAreaWidth / data.length) - 6);
    const startX = 30;
    const startY = 15;

    // Build cumulative line path
    let linePath = '';
    data.forEach((item, index) => {
      const x = startX + index * (barAreaWidth / data.length) + (barAreaWidth / data.length) / 2;
      const y = startY + chartHeight - ((item.cumulative || 0) / 100) * chartHeight;
      linePath += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });

    return (
      <View>
        {/* Legend */}
        <View className="flex-row justify-center mb-2 gap-4">
          <View className="flex-row items-center">
            <View className="w-3 h-3 rounded mr-1" style={{ backgroundColor: color }} />
            <Text className="text-xs text-gray-500">Count</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-0.5 bg-orange-500 mr-1" />
            <Text className="text-xs text-gray-500">Cumulative %</Text>
          </View>
        </View>

        <Svg width={CHART_WIDTH} height={chartHeight + 25}>
          {/* 80% reference line */}
          <Line
            x1={startX}
            y1={startY + chartHeight * 0.2}
            x2={startX + barAreaWidth}
            y2={startY + chartHeight * 0.2}
            stroke="#FCA5A5"
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          {/* Y-axis labels (left) */}
          {[0, maxValue].map((value, i) => {
            const y = startY + chartHeight * (1 - (value / maxValue));
            return (
              <SvgText key={i} x={startX - 4} y={y + 3} fontSize={9} fill="#9CA3AF" textAnchor="end">
                {value}
              </SvgText>
            );
          })}

          {/* Y-axis labels (right - percentage) */}
          {[0, 80, 100].map((pct) => {
            const y = startY + chartHeight * (1 - pct / 100);
            return (
              <SvgText key={pct} x={startX + barAreaWidth + 4} y={y + 3} fontSize={9} fill="#F97316" textAnchor="start">
                {pct}%
              </SvgText>
            );
          })}

          {/* Bars */}
          {data.map((item, index) => {
            const barH = Math.max((item.y / maxValue) * chartHeight, 2);
            const x = startX + index * (barAreaWidth / data.length) + (barAreaWidth / data.length - barWidth) / 2;
            const y = startY + chartHeight - barH;
            return <Rect key={index} x={x} y={y} width={barWidth} height={barH} fill={color} rx={2} />;
          })}

          {/* Cumulative line */}
          <Path d={linePath} stroke="#F97316" strokeWidth={2} fill="none" />

          {/* Line points */}
          {data.map((item, index) => {
            const x = startX + index * (barAreaWidth / data.length) + (barAreaWidth / data.length) / 2;
            const y = startY + chartHeight - ((item.cumulative || 0) / 100) * chartHeight;
            return <Circle key={index} cx={x} cy={y} r={3} fill="#F97316" />;
          })}
        </Svg>

        {/* Data Table */}
        <View className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
          <View className="flex-row bg-gray-50 px-3 py-2">
            <Text className="text-xs font-semibold text-gray-600" style={{ width: 36 }}>Code</Text>
            <Text className="text-xs font-semibold text-gray-600 flex-1" style={{ marginRight: 8 }}>Description</Text>
            <Text className="text-xs font-semibold text-gray-600 text-right" style={{ width: 36 }}>Qty</Text>
            <Text className="text-xs font-semibold text-gray-600 text-right" style={{ width: 48, marginLeft: 8 }}>Cum%</Text>
          </View>
          {data.map((item, i) => (
            <View key={i} className={`flex-row px-3 py-2 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
              <Text className="text-xs text-gray-800 font-medium" style={{ width: 36 }}>{item.x}</Text>
              <Text className="text-xs text-gray-500 flex-1" style={{ marginRight: 8 }} numberOfLines={1}>{item.label}</Text>
              <Text className="text-xs text-gray-900 font-semibold text-right" style={{ width: 36 }}>{item.y}</Text>
              <Text className="text-xs text-orange-600 text-right" style={{ width: 48, marginLeft: 8 }}>{(item.cumulative || 0).toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Clean Line Chart
  const renderLineChart = (data: ChartDataPoint[], color: string) => {
    if (data.length === 0) return renderNoData();

    const maxValue = Math.max(...data.map((d) => d.y), 1);
    const chartHeight = 180;
    const chartAreaWidth = CHART_WIDTH - 40;
    const startX = 30;
    const startY = 15;

    let linePath = '';
    data.forEach((item, index) => {
      const x = startX + (index / Math.max(data.length - 1, 1)) * chartAreaWidth;
      const y = startY + chartHeight - (item.y / maxValue) * chartHeight;
      linePath += index === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    });

    const areaPath = linePath +
      ` L ${startX + chartAreaWidth} ${startY + chartHeight}` +
      ` L ${startX} ${startY + chartHeight} Z`;

    return (
      <View>
        <Svg width={CHART_WIDTH} height={chartHeight + 25}>
          {/* Grid lines */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = startY + chartHeight * (1 - ratio);
            return (
              <G key={i}>
                <Line x1={startX} y1={y} x2={startX + chartAreaWidth} y2={y} stroke="#F3F4F6" strokeWidth={1} />
                <SvgText x={startX - 4} y={y + 3} fontSize={9} fill="#9CA3AF" textAnchor="end">
                  {Math.round(maxValue * ratio)}
                </SvgText>
              </G>
            );
          })}

          {/* Area fill */}
          <Path d={areaPath} fill={color} fillOpacity={0.1} />

          {/* Line */}
          <Path d={linePath} stroke={color} strokeWidth={2} fill="none" />

          {/* Points */}
          {data.map((item, index) => {
            const x = startX + (index / Math.max(data.length - 1, 1)) * chartAreaWidth;
            const y = startY + chartHeight - (item.y / maxValue) * chartHeight;
            return <Circle key={index} cx={x} cy={y} r={4} fill="white" stroke={color} strokeWidth={2} />;
          })}
        </Svg>

        {/* Data Table */}
        <View className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
          <View className="flex-row bg-gray-50 px-3 py-2">
            <Text className="text-xs font-semibold text-gray-600" style={{ width: 40 }}>Period</Text>
            <Text className="text-xs font-semibold text-gray-600 flex-1" style={{ marginHorizontal: 8 }}>Description</Text>
            <Text className="text-xs font-semibold text-gray-600 text-right" style={{ width: 40 }}>Value</Text>
          </View>
          {data.map((item, i) => (
            <View key={i} className={`flex-row px-3 py-2 ${i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}`}>
              <Text className="text-xs text-gray-700 font-medium" style={{ width: 40 }}>{item.x}</Text>
              <Text className="text-xs text-gray-500 flex-1" style={{ marginHorizontal: 8 }} numberOfLines={1}>{item.label}</Text>
              <Text className="text-xs text-gray-900 font-semibold text-right" style={{ width: 40 }}>{item.y}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Clean Pie Chart
  const renderPieChart = (data: ChartDataPoint[]) => {
    if (data.length === 0) return renderNoData();

    const total = data.reduce((sum, d) => sum + d.y, 0);
    if (total === 0) return renderNoData();

    const centerX = CHART_WIDTH / 2;
    const centerY = 100;
    const radius = 80;
    const innerRadius = 40;

    let currentAngle = -Math.PI / 2;

    const slices = data.map((item, index) => {
      const sliceAngle = (item.y / total) * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      const x1Inner = centerX + innerRadius * Math.cos(startAngle);
      const y1Inner = centerY + innerRadius * Math.sin(startAngle);
      const x2Inner = centerX + innerRadius * Math.cos(endAngle);
      const y2Inner = centerY + innerRadius * Math.sin(endAngle);

      const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
      const pathData = `M ${x1Inner} ${y1Inner} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x2Inner} ${y2Inner} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x1Inner} ${y1Inner} Z`;

      return {
        path: pathData,
        color: CHART_COLORS[index % CHART_COLORS.length],
        label: item.x,
        value: item.y,
        percentage: ((item.y / total) * 100).toFixed(1),
      };
    });

    return (
      <View>
        <Svg width={CHART_WIDTH} height={210}>
          {slices.map((slice, i) => (
            <Path key={i} d={slice.path} fill={slice.color} />
          ))}
          <SvgText x={centerX} y={centerY - 5} fontSize={18} fill="#374151" textAnchor="middle" fontWeight="bold">
            {total}
          </SvgText>
          <SvgText x={centerX} y={centerY + 12} fontSize={10} fill="#9CA3AF" textAnchor="middle">
            Total
          </SvgText>
        </Svg>

        {/* Legend */}
        <View className="flex-row flex-wrap justify-center mt-1">
          {slices.map((slice, i) => (
            <View key={i} className="flex-row items-center mx-2 mb-1">
              <View className="w-2.5 h-2.5 rounded-sm mr-1" style={{ backgroundColor: slice.color }} />
              <Text className="text-xs text-gray-600">{slice.label} ({slice.percentage}%)</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Clean Trend Chart
  const renderTrendChart = () => {
    const maxValue = Math.max(...trendData.map((d) => Math.max(d.issues, d.rejects)), 1);
    const chartHeight = 150;
    const chartAreaWidth = CHART_WIDTH - 40;
    const startX = 30;
    const startY = 10;

    let issuesPath = '';
    let rejectsPath = '';

    trendData.forEach((item, index) => {
      const x = startX + (index / Math.max(trendData.length - 1, 1)) * chartAreaWidth;
      const yIssues = startY + chartHeight - (item.issues / maxValue) * chartHeight;
      const yRejects = startY + chartHeight - (item.rejects / maxValue) * chartHeight;
      issuesPath += index === 0 ? `M ${x} ${yIssues}` : ` L ${x} ${yIssues}`;
      rejectsPath += index === 0 ? `M ${x} ${yRejects}` : ` L ${x} ${yRejects}`;
    });

    return (
      <View>
        {/* Legend */}
        <View className="flex-row justify-center mb-2 gap-4">
          <View className="flex-row items-center">
            <View className="w-3 h-0.5 bg-blue-500 mr-1" />
            <Text className="text-xs text-gray-500">Issues</Text>
          </View>
          <View className="flex-row items-center">
            <View className="w-3 h-0.5 bg-red-500 mr-1" />
            <Text className="text-xs text-gray-500">Rejects</Text>
          </View>
        </View>

        <Svg width={CHART_WIDTH} height={chartHeight + 20}>
          {/* Grid */}
          {[0, 0.5, 1].map((ratio, i) => {
            const y = startY + chartHeight * (1 - ratio);
            return (
              <G key={i}>
                <Line x1={startX} y1={y} x2={startX + chartAreaWidth} y2={y} stroke="#F3F4F6" strokeWidth={1} />
                <SvgText x={startX - 4} y={y + 3} fontSize={9} fill="#9CA3AF" textAnchor="end">
                  {Math.round(maxValue * ratio)}
                </SvgText>
              </G>
            );
          })}

          {/* Lines */}
          <Path d={issuesPath} stroke="#3B82F6" strokeWidth={2} fill="none" />
          <Path d={rejectsPath} stroke="#EF4444" strokeWidth={2} fill="none" />

          {/* Points */}
          {trendData.map((item, index) => {
            const x = startX + (index / Math.max(trendData.length - 1, 1)) * chartAreaWidth;
            const yIssues = startY + chartHeight - (item.issues / maxValue) * chartHeight;
            const yRejects = startY + chartHeight - (item.rejects / maxValue) * chartHeight;
            return (
              <G key={index}>
                <Circle cx={x} cy={yIssues} r={3} fill="#3B82F6" />
                <Circle cx={x} cy={yRejects} r={3} fill="#EF4444" />
              </G>
            );
          })}
        </Svg>

        {/* Summary */}
        <View className="flex-row justify-around mt-2 pt-2 border-t border-gray-100">
          <View className="items-center">
            <Text className="text-lg font-bold text-blue-600">{trendData.reduce((s, d) => s + d.issues, 0)}</Text>
            <Text className="text-xs text-gray-500">Issues</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-red-600">{trendData.reduce((s, d) => s + d.rejects, 0)}</Text>
            <Text className="text-xs text-gray-500">Rejects</Text>
          </View>
          <View className="items-center">
            <Text className="text-lg font-bold text-gray-700">{trendData.reduce((s, d) => s + d.total, 0)}</Text>
            <Text className="text-xs text-gray-500">Pieces</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderChart = () => {
    const color = filters.reportType === 'reject-codes' ? '#EF4444' : '#3B82F6';
    switch (filters.chartType) {
      case 'pareto': return renderParetoChart(currentChartData, color);
      case 'vertical-bar': return renderVerticalBarChart(currentChartData, color);
      case 'horizontal-bar': return renderHorizontalBarChart(currentChartData, color);
      case 'line': return renderLineChart(currentChartData, color);
      case 'pie': return renderPieChart(currentChartData);
      default: return renderVerticalBarChart(currentChartData, color);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScreenHeader
        title="Quality Reports"
        rightContent={
          <Pressable onPress={() => setShowFilterModal(true)} className="p-2 -mr-2">
            <Ionicons name="options-outline" size={24} color="#FFFFFF" />
          </Pressable>
        }
      />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Quick Filters */}
        <View className="bg-white mx-4 mt-3 rounded-lg p-3 border border-gray-200">
          <View className="flex-row items-center justify-between">
            <Pressable
              onPress={() => setShowFilterModal(true)}
              className="flex-1 mr-2"
            >
              <Text className="text-xs text-gray-400">Data</Text>
              <Text className="text-sm font-semibold text-gray-800">{getReportTypeLabel(filters.reportType)}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowFilterModal(true)}
              className="flex-1 mr-2"
            >
              <Text className="text-xs text-gray-400">Range</Text>
              <Text className="text-sm font-semibold text-gray-800">{getTimeRangeLabel(filters.timeRange)}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowFilterModal(true)}
              className="flex-1"
            >
              <Text className="text-xs text-gray-400">Chart</Text>
              <Text className="text-sm font-semibold text-gray-800">{getChartTypeLabel(filters.chartType)}</Text>
            </Pressable>
          </View>
        </View>

        {/* Summary Stats */}
        <View className="flex-row mx-4 mt-3 gap-2">
          <View className="bg-white rounded-lg p-3 flex-1 border border-gray-200">
            <Text className="text-xs text-gray-400">Pieces</Text>
            <Text className="text-xl font-bold text-gray-800">{summaryStats.totalPieces}</Text>
          </View>
          <View className="bg-blue-50 rounded-lg p-3 flex-1 border border-blue-100">
            <Text className="text-xs text-blue-500">Issues</Text>
            <Text className="text-xl font-bold text-blue-600">{summaryStats.totalIssues}</Text>
          </View>
          <View className="bg-red-50 rounded-lg p-3 flex-1 border border-red-100">
            <Text className="text-xs text-red-500">Rejects</Text>
            <Text className="text-xl font-bold text-red-600">{summaryStats.totalRejects}</Text>
          </View>
        </View>

        {/* Main Chart */}
        <View className="bg-white mx-4 mt-3 rounded-lg p-4 border border-gray-200">
          <Text className="text-base font-semibold text-gray-800 mb-3">
            {getReportTypeLabel(filters.reportType)}
          </Text>
          {renderChart()}
        </View>

        {/* Trend Chart */}
        <View className="bg-white mx-4 mt-3 mb-6 rounded-lg p-4 border border-gray-200">
          <Text className="text-base font-semibold text-gray-800 mb-3">
            {filters.timeRange === 'rolling-13-weeks' ? 'Weekly' : 'Monthly'} Trend
          </Text>
          {renderTrendChart()}
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent onRequestClose={() => setShowFilterModal(false)}>
        <Pressable className="flex-1 bg-black/50" onPress={() => setShowFilterModal(false)}>
          <View className="flex-1 justify-end">
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="bg-white rounded-t-2xl p-5 max-h-[80%]">
                <View className="flex-row items-center justify-between mb-5">
                  <Text className="text-lg font-bold text-gray-900">Report Settings</Text>
                  <Pressable onPress={() => setShowFilterModal(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Data Source */}
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Data Source</Text>
                  <View className="flex-row flex-wrap gap-2 mb-5">
                    {(['issue-codes', 'reject-codes', 'dispositions', 'products'] as ReportType[]).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setFilters((f) => ({ ...f, reportType: type }))}
                        className={`px-3 py-2 rounded-lg ${filters.reportType === type ? 'bg-blue-500' : 'bg-gray-100'}`}
                      >
                        <Text className={`text-sm ${filters.reportType === type ? 'text-white font-medium' : 'text-gray-700'}`}>
                          {getReportTypeLabel(type)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Chart Type */}
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Chart Type</Text>
                  <View className="flex-row flex-wrap gap-2 mb-5">
                    {(['pareto', 'vertical-bar', 'horizontal-bar', 'line', 'pie'] as ChartType[]).map((type) => (
                      <Pressable
                        key={type}
                        onPress={() => setFilters((f) => ({ ...f, chartType: type }))}
                        className={`px-3 py-2 rounded-lg ${filters.chartType === type ? 'bg-blue-500' : 'bg-gray-100'}`}
                      >
                        <Text className={`text-sm ${filters.chartType === type ? 'text-white font-medium' : 'text-gray-700'}`}>
                          {getChartTypeLabel(type)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Time Range */}
                  <Text className="text-sm font-semibold text-gray-700 mb-2">Time Range</Text>
                  <View className="flex-row flex-wrap gap-2 mb-5">
                    {(['rolling-13-weeks', 'monthly', 'yearly'] as TimeRange[]).map((range) => (
                      <Pressable
                        key={range}
                        onPress={() => setFilters((f) => ({ ...f, timeRange: range }))}
                        className={`px-3 py-2 rounded-lg ${filters.timeRange === range ? 'bg-blue-500' : 'bg-gray-100'}`}
                      >
                        <Text className={`text-sm ${filters.timeRange === range ? 'text-white font-medium' : 'text-gray-700'}`}>
                          {range === 'rolling-13-weeks' ? '13 Weeks' : range === 'monthly' ? 'Monthly' : 'Yearly'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Year */}
                  {(filters.timeRange === 'monthly' || filters.timeRange === 'yearly') && (
                    <>
                      <Text className="text-sm font-semibold text-gray-700 mb-2">Year</Text>
                      <View className="flex-row flex-wrap gap-2 mb-5">
                        {availableYears.map((year) => (
                          <Pressable
                            key={year}
                            onPress={() => setFilters((f) => ({ ...f, year }))}
                            className={`px-3 py-2 rounded-lg ${filters.year === year ? 'bg-blue-500' : 'bg-gray-100'}`}
                          >
                            <Text className={`text-sm ${filters.year === year ? 'text-white font-medium' : 'text-gray-700'}`}>
                              {year}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}
                </ScrollView>

                <Pressable onPress={() => setShowFilterModal(false)} className="bg-blue-500 rounded-lg py-3 mt-3">
                  <Text className="text-white font-semibold text-center">Done</Text>
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
