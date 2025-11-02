import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Ellipse, Circle, Text as SvgText, Line, Path, Defs, ClipPath } from 'react-native-svg';

interface StrandSlippage {
  strandId: string;
  leftSlippage: string;
  rightSlippage: string;
  leftExceedsOne: boolean;
  rightExceedsOne: boolean;
}

interface CrossSection8048Props {
  scale?: number; // Pixels per inch
  showDimensions?: boolean;
  highlightedStrand?: number | null;
  activeStrands?: number[];
  offcutSide?: 'L1' | 'L2' | null;
  productWidth?: number;
  slippages?: StrandSlippage[]; // Optional slippage data to display
  showSlippageValues?: boolean; // Whether to show E1/E2 labels
  strandCoordinates?: Array<{ x: number; y: number }>; // Optional custom strand positions
}

export default function CrossSection8048({
  scale = 10, // Default: 10 pixels per inch
  showDimensions = false,
  highlightedStrand = null,
  activeStrands, // No default - if undefined, all strands are active
  offcutSide = null,
  productWidth,
  slippages = [],
  showSlippageValues = false,
  strandCoordinates,
}: CrossSection8048Props) {
  // Dimensions in inches
  const FULL_WIDTH = 48;
  const HEIGHT = 8;
  
  // Flange dimensions
  const TOP_FLANGE = 1.1875; // 1 3/16"
  const BOTTOM_FLANGE = 1.1875; // 1 3/16"
  
  // Core dimensions
  const CORE_WIDTH = 5.5; // 5 1/2"
  const CORE_HEIGHT = 5.625; // 5 5/8"
  const EDGE_TO_FIRST_CORE = 2.625; // 2 5/8"
  const CORE_SPACING = 1.9375; // 1 15/16"
  
  // Strand positions (x from left edge, y from bottom)
  // Use custom coordinates if provided, otherwise use defaults for 7-strand pattern
  const STRAND_POSITIONS = strandCoordinates ? 
    strandCoordinates.map((coord, index) => ({
      x: coord.x,
      y: coord.y,
      id: index + 1
    })) : 
    [
      { x: 2, y: 2.125, id: 1 },
      { x: 9.125, y: 2.125, id: 2 },
      { x: 16.5625, y: 2.125, id: 3 },
      { x: 24, y: 2.125, id: 4 },
      { x: 31.4375, y: 2.125, id: 5 },
      { x: 38.875, y: 2.125, id: 6 },
      { x: 46, y: 2.125, id: 7 },
    ];
  
  // Calculate display dimensions
  const displayWidth = productWidth ? productWidth * scale : FULL_WIDTH * scale;
  const displayHeight = HEIGHT * scale;
  
  // Calculate which part to show based on offcut
  let xOffset = 0;
  if (offcutSide === 'L1' && productWidth) {
    // L1 cut = show right side
    xOffset = (FULL_WIDTH - productWidth) * scale;
  }
  // L2 cut or no cut = show from left (xOffset = 0)
  
  // Calculate core positions (6 cores total)
  const coreY = BOTTOM_FLANGE * scale;
  const cores = [];
  for (let i = 0; i < 6; i++) {
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
  const visibleStrands = STRAND_POSITIONS.map(strand => ({
    ...strand,
    displayX: (strand.x * scale) - xOffset,
    displayY: displayHeight - (strand.y * scale), // Flip y for SVG coordinates
    // If activeStrands is undefined, all strands are active (full-width product)
    isActive: activeStrands ? activeStrands.includes(strand.id) : true,
    isHighlighted: highlightedStrand === strand.id,
  })).filter(strand => {
    // Only show strands within the visible area
    return strand.displayX >= 0 && strand.displayX <= displayWidth;
  });
  
  const svgWidth = displayWidth + 40; // Add padding
  const svgHeight = displayHeight + 40 + (showSlippageValues ? 45 : 0); // Add extra space for E1/E2 values below
  const padding = 20;
  
  // Keyway dimensions (exact coordinates from user specification)
  // Bottom corner has 1/2" radius
  // Profile coordinates (x, y) where x is depth from edge, y is height from bottom
  const keywayRadius = 0.5 * scale; // 1/2" radius at bottom corner
  const keywayPoints = [
    { x: 0, y: 0.5 },      // After radius
    { x: 0.25, y: 0.625 }, // 1/4", 5/8"
    { x: 0.5625, y: 5 },   // 9/16", 5"
    { x: 0.75, y: 5.125 }, // 3/4", 5 1/8"
    { x: 0.8125, y: 6.875 }, // 13/16", 6 7/8"
    { x: 0.625, y: 7 },    // 5/8", 7"
    { x: 0.75, y: 7.5 },   // 3/4", 7 1/2"
    { x: 1.25, y: 8 },     // 1 1/4", 8" (top)
  ].map(p => ({ x: p.x * scale, y: p.y * scale })); // Scale to pixels
  
  // Build path for plank with keyway on keeper edge
  const buildPlankPath = () => {
    const x = padding;
    const y = padding;
    const w = displayWidth;
    const h = displayHeight;

    // Determine which edge gets the keyway (keeper edge) and which is straight (cut edge)
    const hasKeyway = offcutSide !== null;
    const leftHasKeyway = offcutSide === 'L2'; // L2 cut = left is keeper
    const rightHasKeyway = offcutSide === 'L1'; // L1 cut = right is keeper

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
        
        {/* Highlight cut edge with red line */}
        {offcutSide === 'L1' && (
          <Line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={padding + displayHeight}
            stroke="#EF4444"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        {offcutSide === 'L2' && (
          <Line
            x1={padding + displayWidth}
            y1={padding}
            x2={padding + displayWidth}
            y2={padding + displayHeight}
            stroke="#EF4444"
            strokeWidth={4}
            strokeLinecap="round"
          />
        )}
        
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
        
        {/* Strands - Only show when actively highlighting or working with strands */}
        {(highlightedStrand !== null || activeStrands !== undefined || showSlippageValues) && visibleStrands.map((strand) => {
          const strandRadius = strand.isActive ? 5 : 3.5;
          const strokeWidth = strand.isActive ? 2.5 : 1.5;
          const fillColor = strand.isActive ? '#EF4444' : '#D1D5DB';
          const strokeColor = strand.isHighlighted ? '#3B82F6' : (strand.isActive ? '#991B1B' : '#9CA3AF');

          return (
            <Circle
              key={`strand-${strand.id}`}
              cx={padding + strand.displayX}
              cy={padding + strand.displayY}
              r={strandRadius}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
          );
        })}

        {/* Strand labels - Only show when actively highlighting or working with strands */}
        {(highlightedStrand !== null || activeStrands !== undefined || showSlippageValues) && visibleStrands.map((strand) => {
          const fontSize = strand.isActive ? 12 : 10;
          const fontWeight = strand.isActive ? "bold" : "normal";
          const fillColor = strand.isActive ? "#1F2937" : "#9CA3AF";

          return (
            <SvgText
              key={`label-${strand.id}`}
              x={padding + strand.displayX}
              y={padding + strand.displayY - (strand.isActive ? 12 : 10)}
              fontSize={fontSize}
              fill={fillColor}
              fontWeight={fontWeight}
              textAnchor="middle"
            >
              {strand.id}
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
      </Svg>
    </View>
  );
}
