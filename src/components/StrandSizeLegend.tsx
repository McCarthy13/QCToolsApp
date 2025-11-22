import React from 'react';
import Svg, { Circle, Line, Polygon, Text as SvgText, G } from 'react-native-svg';

interface StrandSizeLegendProps {
  scale?: number;
}

export default function StrandSizeLegend({ scale = 1 }: StrandSizeLegendProps) {
  const baseSize = 12 * scale;
  const spacing = 60 * scale;
  const symbolSize = 6 * scale;
  const fontSize = 10 * scale;

  return (
    <Svg width={spacing * 3} height={baseSize * 2} style={{ marginTop: 8 * scale }}>
      {/* Title */}
      <SvgText
        x={spacing * 1.5}
        y={fontSize}
        fontSize={fontSize}
        fill="#374151"
        fontWeight="600"
        textAnchor="middle"
      >
        Strand Size Key
      </SvgText>

      {/* Circle = 0.6" */}
      <G>
        <Circle
          cx={spacing * 0.5}
          cy={baseSize * 1.5}
          r={symbolSize}
          fill="#059669"
          stroke="#047857"
          strokeWidth={2}
        />
        <SvgText
          x={spacing * 0.5 + symbolSize + 8}
          y={baseSize * 1.5 + 4}
          fontSize={fontSize * 0.9}
          fill="#1F2937"
        >
          ⭕ = 0.6"
        </SvgText>
      </G>

      {/* X = 1/2" */}
      <G>
        <Line
          x1={spacing * 1.5 - symbolSize}
          y1={baseSize * 1.5 - symbolSize}
          x2={spacing * 1.5 + symbolSize}
          y2={baseSize * 1.5 + symbolSize}
          stroke="#059669"
          strokeWidth={2.5}
        />
        <Line
          x1={spacing * 1.5 - symbolSize}
          y1={baseSize * 1.5 + symbolSize}
          x2={spacing * 1.5 + symbolSize}
          y2={baseSize * 1.5 - symbolSize}
          stroke="#059669"
          strokeWidth={2.5}
        />
        <SvgText
          x={spacing * 1.5 + symbolSize + 8}
          y={baseSize * 1.5 + 4}
          fontSize={fontSize * 0.9}
          fill="#1F2937"
        >
          ✖️ = 1/2"
        </SvgText>
      </G>

      {/* Diamond = 3/8" */}
      <G>
        <Polygon
          points={`${spacing * 2.5},${baseSize * 1.5 - symbolSize} ${spacing * 2.5 + symbolSize},${baseSize * 1.5} ${spacing * 2.5},${baseSize * 1.5 + symbolSize} ${spacing * 2.5 - symbolSize},${baseSize * 1.5}`}
          fill="#059669"
          stroke="#047857"
          strokeWidth={2}
        />
        <SvgText
          x={spacing * 2.5 + symbolSize + 8}
          y={baseSize * 1.5 + 4}
          fontSize={fontSize * 0.9}
          fill="#1F2937"
        >
          🔷 = 3/8"
        </SvgText>
      </G>
    </Svg>
  );
}
