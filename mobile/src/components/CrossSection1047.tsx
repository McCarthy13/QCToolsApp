import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Ellipse, Circle, Text as SvgText, Line, Path, Defs, ClipPath, Polygon, G } from 'react-native-svg';

interface StrandSlippage {
  strandId: string;
  leftSlippage: string;
  rightSlippage: string;
  leftExceedsOne: boolean;
  rightExceedsOne: boolean;
}

interface StrandInfo {
  x: number;
  y: number;
  size?: '3/8' | '1/2' | '0.6';
  isTop?: boolean; // Whether this is a top strand
}

interface CrossSection1047Props {
  scale?: number; // Pixels per inch
  showDimensions?: boolean;
  highlightedStrand?: number | null;
  activeStrands?: number[];
  productSide?: 'L1' | 'L2' | null;
  productWidth?: number;
  slippages?: StrandSlippage[]; // Optional slippage data to display
  showSlippageValues?: boolean; // Whether to show E1/E2 labels
  strandCoordinates?: Array<{ x: number; y: number }>; // Optional custom strand positions
  bottomStrandSizes?: Array<'3/8' | '1/2' | '0.6'>; // Sizes for bottom strands
  topStrandCoordinates?: Array<{ x: number; y: number }>; // Top strand positions
  topStrandSizes?: Array<'3/8' | '1/2' | '0.6'>; // Sizes for top strands
}

export default function CrossSection1047({
  scale = 10, // Default: 10 pixels per inch
  showDimensions = false,
  highlightedStrand = null,
  activeStrands, // No default - if undefined, all strands are active
  productSide = null,
  productWidth,
  slippages = [],
  showSlippageValues = false,
  strandCoordinates,
  bottomStrandSizes,
  topStrandCoordinates,
  topStrandSizes,
}: CrossSection1047Props) {
  // Dimensions in inches - 10" tall x 48" wide
  // This is a distinct product type with 5 cores (not a scaled 8048)
  const FULL_WIDTH = 48;
  const HEIGHT = 10;

  // Flange dimensions
  const TOP_FLANGE = 1.375; // 1 3/8"
  const BOTTOM_FLANGE = 1.375; // 1 3/8"

  // Core dimensions - 5 cores total (different from 8048's 6 cores)
  const CORE_WIDTH = 7.25; // 7 1/4"
  const CORE_HEIGHT = 7.25; // 7 1/4"
  const EDGE_TO_FIRST_CORE = 2.75; // 2 3/4"
  const CORE_SPACING = 1.5625; // 1 9/16" between cores
  const NUM_CORES = 5;

  // Strand positions (x from left edge, y from bottom)
  // Use custom coordinates if provided, otherwise use defaults for 6-strand pattern (5 cores)
  // Strands are centered between cores and edges
  const BOTTOM_STRAND_POSITIONS = strandCoordinates ?
    strandCoordinates.map((coord, index) => ({
      x: coord.x,
      y: coord.y,
      id: index + 1,
      size: bottomStrandSizes?.[index],
      isTop: false,
    })) :
    [
      { x: 1.375, y: 2.46, id: 1, size: bottomStrandSizes?.[0], isTop: false },
      { x: 10.78125, y: 2.46, id: 2, size: bottomStrandSizes?.[1], isTop: false },
      { x: 19.59375, y: 2.46, id: 3, size: bottomStrandSizes?.[2], isTop: false },
      { x: 28.40625, y: 2.46, id: 4, size: bottomStrandSizes?.[3], isTop: false },
      { x: 37.21875, y: 2.46, id: 5, size: bottomStrandSizes?.[4], isTop: false },
      { x: 46.625, y: 2.46, id: 6, size: bottomStrandSizes?.[5], isTop: false },
    ];

  // Top strand positions (if provided)
  const TOP_STRAND_POSITIONS = topStrandCoordinates ?
    topStrandCoordinates.map((coord, index) => ({
      x: coord.x,
      y: coord.y,
      id: index + 1,
      size: topStrandSizes?.[index],
      isTop: true,
    })) : [];

  // Combine bottom and top strands
  const ALL_STRAND_POSITIONS = [...BOTTOM_STRAND_POSITIONS, ...TOP_STRAND_POSITIONS];

  // Calculate display dimensions
  const displayWidth = productWidth ? productWidth * scale : FULL_WIDTH * scale;
  const displayHeight = HEIGHT * scale;

  // Calculate which part to show based on product side
  let xOffset = 0;
  if (productSide === 'L1' && productWidth) {
    // L1 = keep left side, show from x=0
    xOffset = 0;
  } else if (productSide === 'L2' && productWidth) {
    // L2 = keep right side, show from right
    xOffset = (FULL_WIDTH - productWidth) * scale;
  }
  // No product side = show full width (xOffset = 0)

  // Calculate core positions (5 cores total for 1047)
  const coreY = BOTTOM_FLANGE * scale;
  const cores = [];
  for (let i = 0; i < NUM_CORES; i++) {
    const coreX = (EDGE_TO_FIRST_CORE + i * (CORE_WIDTH + CORE_SPACING)) * scale;
    cores.push({
      x: coreX - xOffset,
      y: coreY,
      width: CORE_WIDTH * scale,
      height: CORE_HEIGHT * scale,
    });
  }

  // Filter cores that are visible in the cut section
  const visibleCores = cores.filter(core => {
    const coreRight = core.x + core.width;
    return core.x < displayWidth && coreRight > 0;
  });

  // Calculate strand positions relative to the displayed section
  const visibleStrands = ALL_STRAND_POSITIONS.map((strand) => ({
    ...strand,
    displayX: (strand.x * scale) - xOffset,
    displayY: displayHeight - (strand.y * scale), // Flip y for SVG coordinates
    // If activeStrands is undefined, all strands are active (full-width product)
    isActive: activeStrands ? activeStrands.includes(strand.id) : true,
    isHighlighted: highlightedStrand === strand.id,
  })).filter((strand) => {
    // Only show strands within the visible area
    return strand.displayX >= 0 && strand.displayX <= displayWidth;
  });

  const svgWidth = displayWidth + 40; // Add padding
  const svgHeight = displayHeight + 40 + (showSlippageValues ? 45 : 0); // Add extra space for E1/E2 values below
  const padding = 20;

  // Keyway dimensions - Y coordinates scaled by 1.25, X coordinates same as 8048
  // This maintains the same draft angle
  // Bottom corner has 5/8" radius (0.5 * 1.25)
  const keywayRadius = 0.625 * scale; // 0.5 * 1.25
  const keywayPoints = [
    { x: 0, y: 0.625 },      // After radius (0.5 * 1.25)
    { x: 0.25, y: 0.78125 }, // 1/4", 5/8" * 1.25
    { x: 0.5625, y: 6.25 },  // 9/16", 5" * 1.25
    { x: 0.75, y: 6.40625 }, // 3/4", 5.125" * 1.25
    { x: 0.8125, y: 8.59375 }, // 13/16", 6.875" * 1.25
    { x: 0.625, y: 8.75 },   // 5/8", 7" * 1.25
    { x: 0.75, y: 9.375 },   // 3/4", 7.5" * 1.25
    { x: 1.25, y: 10 },      // 1 1/4", 8" * 1.25 = 10" (top)
  ].map(p => ({ x: p.x * scale, y: p.y * scale })); // Scale to pixels

  // Build path for plank with keyway on keeper edge
  const buildPlankPath = () => {
    const x = padding;
    const y = padding;
    const w = displayWidth;
    const h = displayHeight;

    // Determine which edge gets the keyway (keeper edge) and which is straight (cut edge)
    const hasKeyway = productSide !== null;
    const leftHasKeyway = productSide === 'L1'; // L1 = left is product side (keeper)
    const rightHasKeyway = productSide === 'L2'; // L2 = right is product side (keeper)

    if (!hasKeyway) {
      // Full width product - show keyway on BOTH sides
      // Start at bottom-left with radius
      let path = `M ${x + keywayRadius} ${y + h}`;

      // Left bottom radius curve
      path += ` Q ${x} ${y + h} ${x} ${y + h - keywayRadius}`;

      // Follow keyway profile points going up the left edge
      for (let i = 0; i < keywayPoints.length; i++) {
        const point = keywayPoints[i];
        path += ` L ${x + point.x} ${y + h - point.y}`;
      }

      // Top edge, ending before the right keyway starts
      const topKeywayPoint = keywayPoints[keywayPoints.length - 1];
      path += ` L ${x + w - topKeywayPoint.x} ${y}`;

      // Follow keyway profile points going down the right edge (reversed and mirrored)
      for (let i = keywayPoints.length - 1; i >= 0; i--) {
        const point = keywayPoints[i];
        path += ` L ${x + w - point.x} ${y + h - point.y}`;
      }

      // Right bottom radius curve
      path += ` Q ${x + w} ${y + h} ${x + w - keywayRadius} ${y + h}`;

      // Bottom edge back to start
      path += ` L ${x + keywayRadius} ${y + h}`;

      path += ` Z`;

      return path;
    }

    // Build path with keyway on keeper edge using exact coordinates
    let path = '';

    if (leftHasKeyway) {
      // Left edge has keyway, right edge is cut (straight)
      // Start at bottom-left with radius
      path = `M ${x + keywayRadius} ${y + h}`;

      // Radius curve at bottom-left corner (going up and left)
      path += ` Q ${x} ${y + h} ${x} ${y + h - keywayRadius}`;

      // Follow keyway profile points going up the left edge
      // Points are measured from bottom, so convert: (x_depth, y_height) to SVG coords
      for (let i = 0; i < keywayPoints.length; i++) {
        const point = keywayPoints[i];
        path += ` L ${x + point.x} ${y + h - point.y}`;
      }

      // Top edge to top-right
      path += ` L ${x + w} ${y}`;

      // Right edge (straight cut)
      path += ` L ${x + w} ${y + h}`;

      // Bottom edge back to start
      path += ` L ${x + keywayRadius} ${y + h}`;

      path += ` Z`;
    } else {
      // Right edge has keyway, left edge is cut (straight)
      // Mirror the keyway profile for the right edge
      // Start at top-left
      path = `M ${x} ${y}`;

      // Top edge, ending before the keyway starts
      const topKeywayPoint = keywayPoints[keywayPoints.length - 1];
      path += ` L ${x + w - topKeywayPoint.x} ${y}`;

      // Follow keyway profile points going down the right edge (reversed and mirrored)
      for (let i = keywayPoints.length - 1; i >= 0; i--) {
        const point = keywayPoints[i];
        path += ` L ${x + w - point.x} ${y + h - point.y}`;
      }

      // Radius curve at bottom-right corner (going left and down)
      path += ` Q ${x + w} ${y + h} ${x + w - keywayRadius} ${y + h}`;

      // Bottom edge
      path += ` L ${x} ${y + h}`;

      // Left edge (straight cut)
      path += ` L ${x} ${y}`;

      path += ` Z`;
    }

    return path;
  };

  // Generate a stable clip path ID
  const clipPathId = React.useMemo(() => `plank-clip-${Math.random().toString(36).substr(2, 9)}`, []);

  return (
    <View style={{ width: svgWidth, height: svgHeight, alignSelf: 'center' }}>
      <Svg width={svgWidth} height={svgHeight}>
        {/* Define clip path for clean core cutting */}
        <Defs>
          <ClipPath id={clipPathId}>
            <Rect
              x={padding}
              y={padding}
              width={displayWidth}
              height={displayHeight}
            />
          </ClipPath>
        </Defs>

        {/* Plank outline with keyway on keeper edge */}
        <Path
          d={buildPlankPath()}
          fill="#E5E7EB"
          stroke="#374151"
          strokeWidth={2}
        />

        {/* Cores (voids) - rendered at full size, clipped by plank boundary */}
        {visibleCores.map((core, index) => {
          // Only render cores that have any part visible
          const coreRight = core.x + core.width;
          if (coreRight <= 0 || core.x >= displayWidth) return null;

          // Render the full ellipse at its true position, clip path handles cutting
          return (
            <Ellipse
              key={`core-${index}`}
              cx={padding + core.x + core.width / 2}
              cy={padding + core.y + core.height / 2}
              rx={core.width / 2}
              ry={core.height / 2}
              fill="white"
              stroke="#9CA3AF"
              strokeWidth={1.5}
              clipPath={`url(#${clipPathId})`}
            />
          );
        })}

        {/* Strands - Show when there are strand coordinates provided */}
        {(strandCoordinates || bottomStrandSizes || topStrandCoordinates) && visibleStrands.map((strand) => {
          const strandRadius = strand.isActive ? 5 : 3.5;
          const strokeWidth = strand.isActive ? 2.5 : 1.5;

          // Color based on whether it's top or bottom strand
          const baseColor = strand.isTop ? '#2563EB' : '#059669'; // Blue for top, green for bottom
          const darkColor = strand.isTop ? '#1E40AF' : '#047857';
          const fillColor = strand.isActive ? baseColor : '#D1D5DB';
          const strokeColor = strand.isHighlighted ? '#3B82F6' : (strand.isActive ? darkColor : '#9CA3AF');

          const cx = padding + strand.displayX;
          const cy = padding + strand.displayY;

          // Render different shapes based on strand size
          // 3/8" = diamonds, 1/2" = X marks, 0.6" = circles (regardless of top/bottom)

          if (strand.size === '3/8') {
            // Diamond shape for 3/8" strands
            const diamondSize = strand.isActive ? 7 : 5;
            const points = `${cx},${cy - diamondSize} ${cx + diamondSize},${cy} ${cx},${cy + diamondSize} ${cx - diamondSize},${cy}`;
            return (
              <Polygon
                key={`strand-${strand.id}-${strand.isTop ? 'top' : 'bottom'}`}
                points={points}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />
            );
          } else if (strand.size === '1/2') {
            // X mark for 1/2" strands
            const xSize = strand.isActive ? 6 : 4;
            return (
              <React.Fragment key={`strand-${strand.id}-${strand.isTop ? 'top' : 'bottom'}`}>
                <Line
                  x1={cx - xSize}
                  y1={cy - xSize}
                  x2={cx + xSize}
                  y2={cy + xSize}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth + 0.5}
                />
                <Line
                  x1={cx - xSize}
                  y1={cy + xSize}
                  x2={cx + xSize}
                  y2={cy - xSize}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth + 0.5}
                />
              </React.Fragment>
            );
          } else {
            // Circle for 0.6" strands (or default)
            return (
              <Circle
                key={`strand-${strand.id}-${strand.isTop ? 'top' : 'bottom'}`}
                cx={cx}
                cy={cy}
                r={strandRadius}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
              />
            );
          }
        })}

        {/* Strand labels - Show when there are strand coordinates provided */}
        {(strandCoordinates || bottomStrandSizes || topStrandCoordinates) && visibleStrands.map((strand) => {
          const fontSize = strand.isActive ? 12 : 10;
          const fontWeight = strand.isActive ? "bold" : "normal";
          const fillColor = strand.isActive ? "#1F2937" : "#9CA3AF";

          return (
            <SvgText
              key={`label-${strand.id}-${strand.isTop ? 'top' : 'bottom'}`}
              x={padding + strand.displayX}
              y={padding + strand.displayY - (strand.isActive ? 12 : 10)}
              fontSize={fontSize}
              fill={fillColor}
              fontWeight={fontWeight}
              textAnchor="middle"
            >
              {strand.isTop ? `T${strand.id}` : `B${strand.id}`}
            </SvgText>
          );
        })}

        {/* Slippage values (E1/E2) below cross-section */}
        {showSlippageValues && slippages.length > 0 && visibleStrands.map((strand) => {
          const slippageData = slippages.find(s => parseInt(s.strandId) === strand.id);
          if (!slippageData) return null;

          const e1Display = slippageData.leftExceedsOne ? '>1"' : slippageData.leftSlippage;
          const e2Display = slippageData.rightExceedsOne ? '>1"' : slippageData.rightSlippage;

          const fontSize = 11;
          const lineHeight = 16;

          // Position below the cross-section
          // E1 on first line, E2 on second line, both centered under the strand
          const belowCrossSectionY = padding + displayHeight + 15;
          const e1Y = belowCrossSectionY;
          const e2Y = belowCrossSectionY + lineHeight;

          return (
            <React.Fragment key={`slippage-${strand.id}`}>
              {/* E1 value (first line below cross-section) */}
              <SvgText
                x={padding + strand.displayX}
                y={e1Y}
                fontSize={fontSize}
                fill="#059669"
                fontWeight="bold"
                textAnchor="middle"
              >
                E1: {e1Display}
              </SvgText>

              {/* E2 value (second line below cross-section) */}
              <SvgText
                x={padding + strand.displayX}
                y={e2Y}
                fontSize={fontSize}
                fill="#7C3AED"
                fontWeight="bold"
                textAnchor="middle"
              >
                E2: {e2Display}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Legend inside SVG - only show if strands are visible */}
        {(strandCoordinates || bottomStrandSizes || topStrandCoordinates) && (() => {
          const legendScale = scale / 10;
          const baseSize = 16 * legendScale; // Increased from 12
          const spacing = 70 * legendScale; // Increased from 60
          const symbolSize = 8 * legendScale; // Increased from 6
          const fontSize = 14 * legendScale; // Increased from 10
          const labelGap = 5; // Gap between symbol and label text (fixed, not scaled)
          const legendY = padding + displayHeight + (showSlippageValues ? 45 : 0) + 10;
          const legendCenterX = svgWidth / 2;

          return (
            <G>
              {/* Title */}
              <SvgText
                x={legendCenterX}
                y={legendY + fontSize}
                fontSize={fontSize}
                fill="#374151"
                fontWeight="600"
                textAnchor="middle"
              >
                Strand Size Key
              </SvgText>

              {/* Green Circle = 0.6" */}
              <G>
                <Circle
                  cx={legendCenterX - spacing}
                  cy={legendY + baseSize * 1.5}
                  r={symbolSize}
                  fill="#059669"
                  stroke="#047857"
                  strokeWidth={2.5}
                />
                <SvgText
                  x={legendCenterX - spacing + symbolSize + labelGap}
                  y={legendY + baseSize * 1.5 + 4}
                  fontSize={fontSize * 0.9}
                  fill="#1F2937"
                >
                  = 0.6"
                </SvgText>
              </G>

              {/* Green X = 1/2" */}
              <G>
                <Line
                  x1={legendCenterX - symbolSize}
                  y1={legendY + baseSize * 1.5 - symbolSize}
                  x2={legendCenterX + symbolSize}
                  y2={legendY + baseSize * 1.5 + symbolSize}
                  stroke="#059669"
                  strokeWidth={3}
                />
                <Line
                  x1={legendCenterX - symbolSize}
                  y1={legendY + baseSize * 1.5 + symbolSize}
                  x2={legendCenterX + symbolSize}
                  y2={legendY + baseSize * 1.5 - symbolSize}
                  stroke="#059669"
                  strokeWidth={3}
                />
                <SvgText
                  x={legendCenterX + symbolSize + labelGap}
                  y={legendY + baseSize * 1.5 + 4}
                  fontSize={fontSize * 0.9}
                  fill="#1F2937"
                >
                  = 1/2"
                </SvgText>
              </G>

              {/* Blue Diamond = 3/8" */}
              <G>
                <Polygon
                  points={`${legendCenterX + spacing},${legendY + baseSize * 1.5 - symbolSize} ${legendCenterX + spacing + symbolSize},${legendY + baseSize * 1.5} ${legendCenterX + spacing},${legendY + baseSize * 1.5 + symbolSize} ${legendCenterX + spacing - symbolSize},${legendY + baseSize * 1.5}`}
                  fill="#2563EB"
                  stroke="#1E40AF"
                  strokeWidth={2.5}
                />
                <SvgText
                  x={legendCenterX + spacing + symbolSize + labelGap}
                  y={legendY + baseSize * 1.5 + 4}
                  fontSize={fontSize * 0.9}
                  fill="#1F2937"
                >
                  = 3/8"
                </SvgText>
              </G>
            </G>
          );
        })()}
      </Svg>
    </View>
  );
}
