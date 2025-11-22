import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import Svg, { Line, Polyline, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { ChartDataPoint } from '../types/aggregate-gradation';

interface GradationChartProps {
  chartData: ChartDataPoint[];
  showC33Limits?: boolean;
}

const GradationChart: React.FC<GradationChartProps> = ({ chartData, showC33Limits = true }) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 48; // Account for padding
  const chartHeight = 300;
  const padding = { top: 20, right: 30, bottom: 50, left: 50 };
  
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  // Filter out points with no data
  const validData = chartData.filter(d => d.percentPassing !== null && d.percentPassing !== undefined);
  
  if (validData.length === 0) {
    return (
      <View className="bg-white rounded-lg p-4 items-center justify-center" style={{ height: chartHeight }}>
        <Text className="text-gray-500">No data to display</Text>
      </View>
    );
  }

  // Calculate scales - logarithmic for X (sieve sizes), linear for Y (percent passing)
  const minSize = Math.min(...validData.map(d => d.size).filter(s => s > 0));
  const maxSize = Math.max(...validData.map(d => d.size));
  
  // Create logarithmic scale for X axis
  const getX = (size: number): number => {
    if (size <= 0) return padding.left; // Pan at the left edge
    const logMin = Math.log10(minSize);
    const logMax = Math.log10(maxSize);
    const logSize = Math.log10(size);
    return padding.left + ((logSize - logMin) / (logMax - logMin)) * plotWidth;
  };

  // Linear scale for Y axis (0-100%)
  const getY = (percent: number): number => {
    return chartHeight - padding.bottom - (percent / 100) * plotHeight;
  };

  // Generate polyline points for the gradation curve
  const curvePoints = validData
    .map(d => `${getX(d.size)},${getY(d.percentPassing)}`)
    .join(' ');

  // Generate polyline points for C33 upper limit
  const upperLimitPoints = validData
    .filter(d => d.c33Upper !== null && d.c33Upper !== undefined)
    .map(d => `${getX(d.size)},${getY(d.c33Upper!)}`)
    .join(' ');

  // Generate polyline points for C33 lower limit
  const lowerLimitPoints = validData
    .filter(d => d.c33Lower !== null && d.c33Lower !== undefined)
    .map(d => `${getX(d.size)},${getY(d.c33Lower!)}`)
    .join(' ');

  // Y-axis labels (0, 25, 50, 75, 100)
  const yLabels = [0, 25, 50, 75, 100];

  // X-axis labels (sieve names)
  const xLabels = validData.map(d => ({
    name: d.sieve,
    x: getX(d.size),
  }));

  return (
    <View className="bg-white rounded-lg p-4">
      <Text className="text-lg font-semibold text-gray-800 mb-2">Gradation Curve</Text>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Background */}
        <Rect x={0} y={0} width={chartWidth} height={chartHeight} fill="#fafafa" />
        
        {/* Grid lines - Y axis */}
        {yLabels.map(percent => {
          const y = getY(percent);
          return (
            <Line
              key={`grid-y-${percent}`}
              x1={padding.left}
              y1={y}
              x2={chartWidth - padding.right}
              y2={y}
              stroke="#e0e0e0"
              strokeWidth="1"
            />
          );
        })}

        {/* Grid lines - X axis */}
        {xLabels.map((label, i) => (
          <Line
            key={`grid-x-${i}`}
            x1={label.x}
            y1={padding.top}
            x2={label.x}
            y2={chartHeight - padding.bottom}
            stroke="#e0e0e0"
            strokeWidth="1"
          />
        ))}

        {/* C33 Upper Limit */}
        {showC33Limits && upperLimitPoints && (
          <Polyline
            points={upperLimitPoints}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4,4"
          />
        )}

        {/* C33 Lower Limit */}
        {showC33Limits && lowerLimitPoints && (
          <Polyline
            points={lowerLimitPoints}
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="4,4"
          />
        )}

        {/* Gradation Curve */}
        <Polyline
          points={curvePoints}
          fill="none"
          stroke="#ea580c"
          strokeWidth="3"
        />

        {/* Data points */}
        {validData.map((d, i) => (
          <Circle
            key={`point-${i}`}
            cx={getX(d.size)}
            cy={getY(d.percentPassing)}
            r="4"
            fill="#ea580c"
            stroke="#fff"
            strokeWidth="2"
          />
        ))}

        {/* Y-axis labels */}
        {yLabels.map(percent => {
          const y = getY(percent);
          return (
            <SvgText
              key={`label-y-${percent}`}
              x={padding.left - 10}
              y={y + 4}
              fontSize="12"
              fill="#666"
              textAnchor="end"
            >
              {percent}
            </SvgText>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <SvgText
            key={`label-x-${i}`}
            x={label.x}
            y={chartHeight - padding.bottom + 20}
            fontSize="10"
            fill="#666"
            textAnchor="middle"
            transform={`rotate(-45, ${label.x}, ${chartHeight - padding.bottom + 20})`}
          >
            {label.name}
          </SvgText>
        ))}

        {/* Axis titles */}
        <SvgText
          x={padding.left - 35}
          y={chartHeight / 2}
          fontSize="14"
          fill="#333"
          textAnchor="middle"
          transform={`rotate(-90, ${padding.left - 35}, ${chartHeight / 2})`}
        >
          Percent Passing (%)
        </SvgText>
        
        <SvgText
          x={chartWidth / 2}
          y={chartHeight - 5}
          fontSize="14"
          fill="#333"
          textAnchor="middle"
        >
          Sieve Size
        </SvgText>
      </Svg>

      {/* Legend */}
      <View className="flex-row justify-center mt-3 gap-4">
        <View className="flex-row items-center gap-2">
          <View className="w-6 h-0.5 bg-orange-600" />
          <Text className="text-xs text-gray-600">Test Data</Text>
        </View>
        {showC33Limits && (
          <View className="flex-row items-center gap-2">
            <View className="w-6 h-0.5 bg-red-500 border-dashed" style={{ borderStyle: 'dashed', borderWidth: 1, borderColor: '#ef4444', height: 0 }} />
            <Text className="text-xs text-gray-600">C33 Limits</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default GradationChart;
