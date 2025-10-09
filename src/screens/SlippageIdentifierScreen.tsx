import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Circle, Line, Path } from "react-native-svg";
import { decimalToFraction, parseMeasurementInput } from "../utils/cn";

interface StrandSlippage {
  strandId: string;
  leftSlippage: string;
  rightSlippage: string;
}

export default function SlippageIdentifierScreen() {
  const insets = useSafeAreaInsets();
  const [slippages, setSlippages] = useState<StrandSlippage[]>([
    { strandId: "1", leftSlippage: "", rightSlippage: "" },
    { strandId: "2", leftSlippage: "", rightSlippage: "" },
    { strandId: "3", leftSlippage: "", rightSlippage: "" },
    { strandId: "4", leftSlippage: "", rightSlippage: "" },
  ]);

  const updateSlippage = (
    strandId: string,
    side: "left" | "right",
    value: string
  ) => {
    setSlippages((prev) =>
      prev.map((s) =>
        s.strandId === strandId
          ? {
              ...s,
              [side === "left" ? "leftSlippage" : "rightSlippage"]: value,
            }
          : s
      )
    );
  };

  // Calculate all slippage statistics
  const slippageStats = useMemo(() => {
    // Parse all values to decimals
    const parsedValues = slippages.map((s) => ({
      strandId: s.strandId,
      end1: parseMeasurementInput(s.leftSlippage),
      end2: parseMeasurementInput(s.rightSlippage),
    }));

    // Filter out invalid/empty values for calculations
    const end1Values = parsedValues.map((v) => v.end1).filter((v): v is number => v !== null && !isNaN(v));
    const end2Values = parsedValues.map((v) => v.end2).filter((v): v is number => v !== null && !isNaN(v));
    const allValues = [...end1Values, ...end2Values];

    // Total slippage (all values)
    const totalSlippage = allValues.reduce((sum, val) => sum + val, 0);

    // Total slippage per end
    const totalSlippageEnd1 = end1Values.reduce((sum, val) => sum + val, 0);
    const totalSlippageEnd2 = end2Values.reduce((sum, val) => sum + val, 0);

    // Total slippage per strand
    const strandTotals = parsedValues.map((v) => {
      const e1 = v.end1 ?? 0;
      const e2 = v.end2 ?? 0;
      return {
        strandId: v.strandId,
        total: e1 + e2,
      };
    });

    // Average calculations
    const totalAvgSlippage = allValues.length > 0 ? totalSlippage / allValues.length : 0;
    const totalAvgSlippageEnd1 = end1Values.length > 0 ? totalSlippageEnd1 / end1Values.length : 0;
    const totalAvgSlippageEnd2 = end2Values.length > 0 ? totalSlippageEnd2 / end2Values.length : 0;

    return {
      totalSlippage,
      totalSlippageEnd1,
      totalSlippageEnd2,
      strandTotals,
      totalAvgSlippage,
      totalAvgSlippageEnd1,
      totalAvgSlippageEnd2,
    };
  }, [slippages]);

  // 3D Isometric view of 8048 hollow-core plank with strands
  const GenericCrossSection = () => {
    const svgWidth = 380;
    const svgHeight = 320;

    // EXACT DIMENSIONS from specifications
    // Real: 8" tall x 48" wide
    // Scale factor for display - adjusted to fit screen
    const scale = 4; // 4 pixels per inch
    const plankWidth = 48 * scale; // 192px
    const plankHeight = 8 * scale; // 32px
    
    // Starting position for near face
    const startX = 30;
    const startY = 135;

    // Isometric angle offsets
    const depth = 180;
    const depthX = depth * 0.866;
    const depthY = depth * 0.5;

    // EXACT CORE DIMENSIONS
    const coreWidth = 5.5 * scale; // 22px
    const coreHeight = 5.625 * scale; // 22.5px
    const coreBottomFromPlankBottom = 1.1875 * scale; // 4.75px
    const edgeToCoreEdge = 2.625 * scale; // 10.5px
    const spacingBetweenCores = 1.9375 * scale; // 7.75px
    
    // Calculate core center positions
    const coreBottomY = plankHeight - coreBottomFromPlankBottom;
    const coreCenterY = coreBottomY - (coreHeight / 2);
    
    // First core center X position
    const firstCoreCenterX = edgeToCoreEdge + (coreWidth / 2);
    
    // Build array of 6 cores with exact spacing
    const cores = Array.from({ length: 6 }, (_, i) => ({
      cx: firstCoreCenterX + i * (coreWidth + spacingBetweenCores),
      cy: coreCenterY,
    }));

    // Traced SVG path from the provided core shape image
    // This is the EXACT shape traced from the user's drawing
    // Normalized to fit within a unit square (0-1), will be scaled to actual size
    const coreShapePath = `
      M 0.5 1
      L 0.75 0.93
      L 0.93 0.75
      L 1 0.5
      L 1 0.25
      C 1 0.11 0.89 0 0.5 0
      C 0.11 0 0 0.11 0 0.25
      L 0 0.5
      L 0.07 0.75
      L 0.25 0.93
      L 0.5 1
      Z
    `;

    // Helper function to place the core shape at a specific position and size
    const drawCore = (cx: number, cy: number) => {
      // Scale the normalized path to actual core dimensions
      // Transform: scale and translate to center at (cx, cy)
      const scaleX = coreWidth;
      const scaleY = coreHeight;
      const offsetX = cx - coreWidth / 2;
      const offsetY = cy - coreHeight / 2;
      
      return `
        M ${offsetX + 0.5 * scaleX} ${offsetY + 1 * scaleY}
        L ${offsetX + 0.75 * scaleX} ${offsetY + 0.93 * scaleY}
        L ${offsetX + 0.93 * scaleX} ${offsetY + 0.75 * scaleY}
        L ${offsetX + 1 * scaleX} ${offsetY + 0.5 * scaleY}
        L ${offsetX + 1 * scaleX} ${offsetY + 0.25 * scaleY}
        C ${offsetX + 1 * scaleX} ${offsetY + 0.11 * scaleY} ${offsetX + 0.89 * scaleX} ${offsetY + 0 * scaleY} ${offsetX + 0.5 * scaleX} ${offsetY + 0 * scaleY}
        C ${offsetX + 0.11 * scaleX} ${offsetY + 0 * scaleY} ${offsetX + 0 * scaleX} ${offsetY + 0.11 * scaleY} ${offsetX + 0 * scaleX} ${offsetY + 0.25 * scaleY}
        L ${offsetX + 0 * scaleX} ${offsetY + 0.5 * scaleY}
        L ${offsetX + 0.07 * scaleX} ${offsetY + 0.75 * scaleY}
        L ${offsetX + 0.25 * scaleX} ${offsetY + 0.93 * scaleY}
        L ${offsetX + 0.5 * scaleX} ${offsetY + 1 * scaleY}
        Z
      `;
    };

    // Strand positions (will add back later)
    const strandPositions: any[] = [];

    // Helper to draw the 8048 cross-section shape
    const drawCrossSection = (offsetX: number, offsetY: number, isHidden: boolean, solidTop: boolean = false, solidRight: boolean = false) => {
      const x = startX + offsetX;
      const y = startY + offsetY;
      
      // Keyway dimensions (on the SIDES, indenting IN) - larger and more rectangular
      const keywayWidth = 8; // Taller
      const keywayDepth = 3; // Deeper indent
      const keywayFromTop = 6;
      
      // Draft angle - WIDER at bottom, NARROWER at top (more subtle taper)
      const topInset = 2; // Reduced for more subtle draft angle
      const lipRadius = 4; // More pronounced rounded lips at bottom corners

      // Build separate paths for different stroke styles
      // Path 1: Left side and bottom
      let leftPath = `M ${x + lipRadius} ${y + plankHeight}`; // Start at bottom left after lip
      
      // Bottom left corner lip (pronounced curve)
      leftPath += ` Q ${x} ${y + plankHeight} ${x} ${y + plankHeight - lipRadius}`;
      
      // Up left side with draft angle (tapering IN toward top) to below keyway
      leftPath += ` L ${x + topInset} ${y + keywayFromTop + keywayWidth}`;
      
      // Left keyway (indent IN)
      leftPath += ` L ${x + topInset + keywayDepth} ${y + keywayFromTop + keywayWidth}`;
      leftPath += ` L ${x + topInset + keywayDepth} ${y + keywayFromTop}`;
      leftPath += ` L ${x + topInset} ${y + keywayFromTop}`;
      
      // Continue up to top left corner
      leftPath += ` L ${x + topInset} ${y}`;
      
      // Path 2: Just the top edge (may have different stroke style)
      const topPath = `M ${x + topInset} ${y} L ${x + plankWidth - topInset} ${y}`;
      
      // Path 3: Right side continuation
      let rightPath = `M ${x + plankWidth - topInset} ${y}`;
      
      // Down right side to keyway
      rightPath += ` L ${x + plankWidth - topInset} ${y + keywayFromTop}`;
      
      // Right keyway (indent IN)
      rightPath += ` L ${x + plankWidth - topInset - keywayDepth} ${y + keywayFromTop}`;
      rightPath += ` L ${x + plankWidth - topInset - keywayDepth} ${y + keywayFromTop + keywayWidth}`;
      rightPath += ` L ${x + plankWidth - topInset} ${y + keywayFromTop + keywayWidth}`;
      
      // Down right side with draft angle (tapering OUT toward bottom)
      rightPath += ` L ${x + plankWidth} ${y + plankHeight - lipRadius}`;
      
      // Bottom right corner lip (pronounced curve)
      rightPath += ` Q ${x + plankWidth} ${y + plankHeight} ${x + plankWidth - lipRadius} ${y + plankHeight}`;
      
      // Bottom edge back to start
      rightPath += ` L ${x + lipRadius} ${y + plankHeight}`;

      const leftStrokeDash = isHidden ? "3,3" : undefined;
      const topStrokeDash = solidTop ? undefined : (isHidden ? "3,3" : undefined);
      const rightStrokeDash = solidRight ? undefined : (isHidden ? "3,3" : undefined);

      return (
        <React.Fragment>
          {/* Left side and bottom outline */}
          <Path
            d={leftPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={leftStrokeDash}
            fill="none"
          />
          
          {/* Top edge - can be solid even when rest is hidden */}
          <Path
            d={topPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={topStrokeDash}
            fill="none"
          />
          
          {/* Right side outline - can be solid even when rest is hidden */}
          <Path
            d={rightPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={rightStrokeDash}
            fill="none"
          />

          {/* Hollow cores */}
          {cores.map((core, idx) => (
            <Path
              key={`core-${idx}`}
              d={drawCore(x + core.cx, y + core.cy)}
              stroke="#2563EB"
              strokeWidth={1.5}
              strokeDasharray={leftStrokeDash}
              fill="none"
            />
          ))}
        </React.Fragment>
      );
    };

    return (
      <View className="items-center my-6">
        <Text className="text-gray-700 text-sm font-semibold mb-4">
          3D VIEW - 8048 Hollow Core Plank
        </Text>
        <Svg width={svgWidth} height={svgHeight}>
          {/* NEAR FACE (END 1) - SOLID (visible) */}
          {drawCrossSection(0, 0, false, false, false)}

          {/* FAR FACE (END 2) - DOTTED (hidden) BUT with SOLID top and SOLID right */}
          {drawCrossSection(depthX, -depthY, true, true, true)}

          {/* CONNECTING EDGES for 3D effect */}
          {/* Top left - SOLID (visible from this perspective) */}
          <Line
            x1={startX}
            y1={startY}
            x2={startX + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
          {/* Top right - SOLID (visible) */}
          <Line
            x1={startX + plankWidth}
            y1={startY}
            x2={startX + plankWidth + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
          {/* Bottom right - SOLID (visible) */}
          <Line
            x1={startX + plankWidth}
            y1={startY + plankHeight}
            x2={startX + plankWidth + depthX}
            y2={startY + plankHeight - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
          {/* Bottom left - DOTTED (cannot be seen from this perspective) */}
          <Line
            x1={startX}
            y1={startY + plankHeight}
            x2={startX + depthX}
            y2={startY + plankHeight - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
            strokeDasharray="3,3"
          />
        </Svg>
        
        {/* Labels for ends */}
        <View className="flex-row justify-between w-full px-12 mt-2">
          <Text className="text-blue-600 text-xs font-bold">END 1 (Near)</Text>
          <Text className="text-blue-600 text-xs font-bold">END 2 (Far)</Text>
        </View>

        {/* Slippage Statistics */}
        <View className="mt-6 px-6">
          <Text className="text-gray-900 text-base font-semibold mb-3">
            Slippage Statistics
          </Text>

          {/* Total Slippage */}
          <View className="bg-blue-50 rounded-lg p-3 mb-2">
            <Text className="text-gray-700 text-xs font-medium mb-1">
              Total Slippage (All Values)
            </Text>
            <Text className="text-blue-600 text-lg font-bold">
              {slippageStats.totalSlippage.toFixed(3)}" (≈{decimalToFraction(slippageStats.totalSlippage)})
            </Text>
          </View>

          {/* End Totals - Side by side */}
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1 bg-green-50 rounded-lg p-3">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Total Slippage END 1
              </Text>
              <Text className="text-green-600 text-base font-bold">
                {slippageStats.totalSlippageEnd1.toFixed(3)}"
              </Text>
              <Text className="text-green-600 text-xs">
                ≈{decimalToFraction(slippageStats.totalSlippageEnd1)}
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-3">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Total Slippage END 2
              </Text>
              <Text className="text-purple-600 text-base font-bold">
                {slippageStats.totalSlippageEnd2.toFixed(3)}"
              </Text>
              <Text className="text-purple-600 text-xs">
                ≈{decimalToFraction(slippageStats.totalSlippageEnd2)}
              </Text>
            </View>
          </View>

          {/* Average Slippage */}
          <View className="bg-orange-50 rounded-lg p-3 mb-2">
            <Text className="text-gray-700 text-xs font-medium mb-1">
              Total Average Slippage
            </Text>
            <Text className="text-orange-600 text-lg font-bold">
              {slippageStats.totalAvgSlippage.toFixed(3)}" (≈{decimalToFraction(slippageStats.totalAvgSlippage)})
            </Text>
          </View>

          {/* Average by End - Side by side */}
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1 bg-green-50 rounded-lg p-3">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Avg Slippage END 1
              </Text>
              <Text className="text-green-600 text-base font-bold">
                {slippageStats.totalAvgSlippageEnd1.toFixed(3)}"
              </Text>
              <Text className="text-green-600 text-xs">
                ≈{decimalToFraction(slippageStats.totalAvgSlippageEnd1)}
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-3">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Avg Slippage END 2
              </Text>
              <Text className="text-purple-600 text-base font-bold">
                {slippageStats.totalAvgSlippageEnd2.toFixed(3)}"
              </Text>
              <Text className="text-purple-600 text-xs">
                ≈{decimalToFraction(slippageStats.totalAvgSlippageEnd2)}
              </Text>
            </View>
          </View>

          {/* Per-Strand Totals */}
          <View className="bg-gray-50 rounded-lg p-3 mb-4">
            <Text className="text-gray-700 text-xs font-medium mb-2">
              Total Slippage Per Strand
            </Text>
            {slippageStats.strandTotals.map((strand) => (
              <View key={strand.strandId} className="flex-row justify-between py-1">
                <Text className="text-gray-600 text-sm">
                  Strand {strand.strandId}:
                </Text>
                <Text className="text-gray-900 text-sm font-semibold">
                  {strand.total.toFixed(3)}" (≈{decimalToFraction(strand.total)})
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-white"
      style={{ paddingTop: insets.top }}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200">
          <Text className="text-gray-900 text-2xl font-bold">
            Slippage Identifier
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            Enter slippage values at each strand end
          </Text>
        </View>

        {/* Cross-section diagram */}
        <GenericCrossSection />

        {/* Slippage inputs for each strand */}
        <View className="px-6">
          <Text className="text-gray-900 text-lg font-semibold mb-4">
            Slippage Values
          </Text>

          {slippages.map((strand, index) => (
            <View
              key={strand.strandId}
              className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200"
            >
              <View className="flex-row items-center mb-3">
                <View className="bg-red-500 rounded-full w-8 h-8 items-center justify-center mr-3">
                  <Text className="text-white font-bold text-sm">
                    {strand.strandId}
                  </Text>
                </View>
                <Text className="text-gray-900 font-semibold text-base">
                  Strand {strand.strandId}
                </Text>
              </View>

              <View className="flex-row gap-3">
                {/* End 1 */}
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-600 mb-2">
                    END 1
                  </Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900"
                    placeholder='0.5 or 5/16"'
                    placeholderTextColor="#9CA3AF"
                    value={strand.leftSlippage}
                    onChangeText={(text) =>
                      updateSlippage(strand.strandId, "left", text)
                    }
                    keyboardType="default"
                  />
                </View>

                {/* End 2 */}
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-600 mb-2">
                    END 2
                  </Text>
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base text-gray-900"
                    placeholder='0.5 or 5/16"'
                    placeholderTextColor="#9CA3AF"
                    value={strand.rightSlippage}
                    onChangeText={(text) =>
                      updateSlippage(strand.strandId, "right", text)
                    }
                    keyboardType="default"
                  />
                </View>
              </View>
            </View>
          ))}

          {/* Calculate button */}
          <Pressable className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600 mt-4">
            <Text className="text-white text-base font-semibold">
              Calculate Results
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
