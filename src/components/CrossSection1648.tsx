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

interface CrossSection1648Props {
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

export default function CrossSection1648({
  scale = 10, // Default: 10 pixels per inch
  showDimensions = false,
  highlightedStrand = null,
  activeStrands, // No default - if undefined, all strands are active
  offcutSide = null,
  productWidth,
  slippages = [],
  showSlippageValues = false,
  strandCoordinates,
}: CrossSection1648Props) {
  // Dimensions in inches
  const FULL_WIDTH = 48;
  const HEIGHT = 16;

  // Flange dimensions
  const TOP_FLANGE = HEIGHT - 13.1875 - 1.375; // Remaining top flange
  const BOTTOM_FLANGE = 1.375; // 1 3/8"

  // Core dimensions
  const CORE_WIDTH = 9; // 9"
  const CORE_HEIGHT = 13.1875; // 13 3/16"
  const EDGE_TO_FIRST_CORE = 2.8125; // 2 13/16"
  const CORE_SPACING = 2.1875; // 2 3/16"

  // Strand positions (x from left edge, y from bottom)
  // Use custom coordinates if provided, otherwise use defaults
  const STRAND_POSITIONS = strandCoordinates ?
    strandCoordinates.map((coord, index) => ({
      x: coord.x,
      y: coord.y,
      id: index + 1
    })) :
    [
      // Default strand positions can be added here if needed
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

  // Calculate core positions (4 cores total)
  const coreY = BOTTOM_FLANGE * scale;
  const cores = [];
  for (let i = 0; i < 4; i++) {
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
    displayX: strand.x * scale - xOffset,
    displayY: displayHeight - (strand.y * scale),
  })).filter(strand => {
    return strand.displayX >= 0 && strand.displayX <= displayWidth;
  });

  // Helper function to get slippage for a strand
  const getSlippageForStrand = (strandId: number) => {
    return slippages.find(s => s.strandId === `S${strandId}`);
  };

  // Determine active strands (if activeStrands is provided, use it; otherwise all are active)
  const isStrandActive = (strandId: number) => {
    if (activeStrands === undefined) return true; // All strands active if not specified
    return activeStrands.includes(strandId);
  };

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={displayWidth} height={displayHeight} viewBox={`0 0 ${displayWidth} ${displayHeight}`}>
        {/* Main cross-section rectangle (outline) */}
        <Rect
          x={0}
          y={0}
          width={displayWidth}
          height={displayHeight}
          fill="#E5E7EB"
          stroke="#374151"
          strokeWidth={2}
        />

        {/* Cores (voids) - only show when not highlighting/working with strands */}
        {visibleCores.map((core, index) => (
          <Ellipse
            key={`core-${index}`}
            cx={core.x + core.width / 2}
            cy={core.y + core.height / 2}
            rx={core.width / 2}
            ry={core.height / 2}
            fill="#FFFFFF"
            stroke="#9CA3AF"
            strokeWidth={1.5}
          />
        ))}

        {/* Strands - only show when highlighting or working with them */}
        {(highlightedStrand !== null || activeStrands !== undefined || showSlippageValues) && visibleStrands.map((strand) => {
          const isHighlighted = highlightedStrand === strand.id;
          const isActive = isStrandActive(strand.id);
          const slippage = getSlippageForStrand(strand.id);

          // Determine strand color
          let strandColor = '#6B7280'; // Default gray
          if (!isActive) {
            strandColor = '#D1D5DB'; // Lighter gray for inactive
          } else if (isHighlighted) {
            strandColor = '#3B82F6'; // Blue for highlighted
          }

          return (
            <React.Fragment key={`strand-${strand.id}`}>
              {/* Strand circle */}
              <Circle
                cx={strand.displayX}
                cy={strand.displayY}
                r={scale * 0.25} // 0.5" diameter = 0.25" radius
                fill={strandColor}
                stroke={isHighlighted ? '#1D4ED8' : '#374151'}
                strokeWidth={isHighlighted ? 2 : 1}
              />

              {/* Strand label */}
              <SvgText
                x={strand.displayX}
                y={strand.displayY + scale * 0.08}
                fill="#FFFFFF"
                fontSize={scale * 0.3}
                fontWeight="bold"
                textAnchor="middle"
              >
                {strand.id}
              </SvgText>

              {/* Show slippage values if requested */}
              {showSlippageValues && slippage && (
                <>
                  {/* Left slippage (E1) */}
                  <SvgText
                    x={strand.displayX - scale * 1}
                    y={strand.displayY - scale * 0.5}
                    fill={slippage.leftExceedsOne ? '#EF4444' : '#10B981'}
                    fontSize={scale * 0.25}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    E1: {slippage.leftSlippage}"
                  </SvgText>

                  {/* Right slippage (E2) */}
                  <SvgText
                    x={strand.displayX + scale * 1}
                    y={strand.displayY - scale * 0.5}
                    fill={slippage.rightExceedsOne ? '#EF4444' : '#10B981'}
                    fontSize={scale * 0.25}
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    E2: {slippage.rightSlippage}"
                  </SvgText>
                </>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}
