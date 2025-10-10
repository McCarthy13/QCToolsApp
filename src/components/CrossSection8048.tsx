import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Ellipse, Circle, Text as SvgText, Line, Path } from 'react-native-svg';

interface CrossSection8048Props {
  scale?: number; // Pixels per inch
  showDimensions?: boolean;
  highlightedStrand?: number | null;
  activeStrands?: number[];
  offcutSide?: 'L1' | 'L2' | null;
  productWidth?: number;
}

export default function CrossSection8048({
  scale = 10, // Default: 10 pixels per inch
  showDimensions = false,
  highlightedStrand = null,
  activeStrands = [1, 2, 3, 4, 5, 6, 7],
  offcutSide = null,
  productWidth,
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
  const STRAND_POSITIONS = [
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
    isActive: activeStrands.includes(strand.id),
    isHighlighted: highlightedStrand === strand.id,
  })).filter(strand => {
    // Only show strands within the visible area
    return strand.displayX >= 0 && strand.displayX <= displayWidth;
  });
  
  const svgWidth = displayWidth + 40; // Add padding
  const svgHeight = displayHeight + 40; // Add padding
  const padding = 20;
  
  // Keyway dimensions (from the image provided - scaled)
  // The keyway creates a stepped tongue-and-groove profile
  const keywayNotchDepth = 0.25 * scale; // Depth of each notch indent
  const keywayNotchHeight = 0.75 * scale; // Height of each step
  const numKeywayNotches = 5; // Number of notches along the height
  
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
      // Full width product - simple rectangle for now
      return `
        M ${x} ${y}
        L ${x + w} ${y}
        L ${x + w} ${y + h}
        L ${x} ${y + h}
        Z
      `;
    }
    
    // Build path with keyway on keeper edge
    let path = '';
    
    if (leftHasKeyway) {
      // Left edge has keyway, right edge is cut (straight)
      // Start at top-left, go clockwise
      path = `M ${x} ${y}`;
      
      // Top edge
      path += ` L ${x + w} ${y}`;
      
      // Right edge (straight cut)
      path += ` L ${x + w} ${y + h}`;
      
      // Bottom edge
      path += ` L ${x} ${y + h}`;
      
      // Left edge with keyway notches - going up
      // Calculate starting position and spacing
      const startYPos = y + h - keywayNotchHeight;
      for (let i = 0; i < numKeywayNotches; i++) {
        const notchY = startYPos - (i * keywayNotchHeight * 2);
        
        // Step in
        path += ` L ${x} ${notchY + keywayNotchHeight}`;
        path += ` L ${x + keywayNotchDepth} ${notchY + keywayNotchHeight}`;
        path += ` L ${x + keywayNotchDepth} ${notchY}`;
        path += ` L ${x} ${notchY}`;
      }
      
      // Close path back to start
      path += ` L ${x} ${y} Z`;
    } else {
      // Right edge has keyway, left edge is cut (straight)
      // Start at top-left, go clockwise
      path = `M ${x} ${y}`;
      
      // Top edge
      path += ` L ${x + w} ${y}`;
      
      // Right edge with keyway notches - going down
      const startYPos = y + keywayNotchHeight;
      for (let i = 0; i < numKeywayNotches; i++) {
        const notchY = startYPos + (i * keywayNotchHeight * 2);
        
        // Step in
        path += ` L ${x + w} ${notchY}`;
        path += ` L ${x + w - keywayNotchDepth} ${notchY}`;
        path += ` L ${x + w - keywayNotchDepth} ${notchY + keywayNotchHeight}`;
        path += ` L ${x + w} ${notchY + keywayNotchHeight}`;
      }
      
      // Continue to bottom-right
      path += ` L ${x + w} ${y + h}`;
      
      // Bottom edge
      path += ` L ${x} ${y + h}`;
      
      // Left edge (straight cut)
      path += ` L ${x} ${y}`;
      
      // Close path
      path += ` Z`;
    }
    
    return path;
  };
  
  return (
    <View style={{ width: svgWidth, height: svgHeight, alignSelf: 'center' }}>
      <Svg width={svgWidth} height={svgHeight}>
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
        
        {/* Cores (voids) */}
        {visibleCores.map((core, index) => {
          // Clip cores at edges if partially visible
          const clippedX = Math.max(0, core.x);
          const clippedWidth = Math.min(core.width, displayWidth - clippedX);
          
          if (clippedWidth <= 0) return null;
          
          return (
            <Ellipse
              key={`core-${index}`}
              cx={padding + clippedX + clippedWidth / 2}
              cy={padding + core.y + core.height / 2}
              rx={clippedWidth / 2}
              ry={core.height / 2}
              fill="white"
              stroke="#9CA3AF"
              strokeWidth={1.5}
            />
          );
        })}
        
        {/* Strands */}
        {visibleStrands.map((strand) => {
          const strandRadius = strand.isHighlighted ? 5 : 3.5;
          const strokeWidth = strand.isHighlighted ? 2.5 : 1.5;
          
          return (
            <Circle
              key={`strand-${strand.id}`}
              cx={padding + strand.displayX}
              cy={padding + strand.displayY}
              r={strandRadius}
              fill={strand.isActive ? '#EF4444' : '#D1D5DB'}
              stroke={strand.isHighlighted ? '#3B82F6' : '#991B1B'}
              strokeWidth={strokeWidth}
            />
          );
        })}
        
        {/* Strand labels */}
        {visibleStrands.map((strand) => (
          <SvgText
            key={`label-${strand.id}`}
            x={padding + strand.displayX}
            y={padding + strand.displayY - 10}
            fontSize={10}
            fill="#374151"
            fontWeight="bold"
            textAnchor="middle"
          >
            {strand.id}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}
