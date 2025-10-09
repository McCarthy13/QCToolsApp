import React, { useState } from "react";
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

    // Helper function to draw octagon-like core: rounded top, angled sides, flat bottom
    const drawCore = (cx: number, cy: number) => {
      const halfWidth = coreWidth / 2;
      const halfHeight = coreHeight / 2;
      const topRadius = halfWidth * 0.9; // Large rounded top
      const chamferSize = halfWidth * 0.3; // Size of the angled corners
      
      // Start at bottom left corner
      let corePath = `M ${cx - halfWidth + chamferSize} ${cy + halfHeight}`;
      
      // Flat bottom (with chamfered corners)
      corePath += ` L ${cx + halfWidth - chamferSize} ${cy + halfHeight}`;
      
      // Bottom right chamfer (angled)
      corePath += ` L ${cx + halfWidth} ${cy + halfHeight - chamferSize}`;
      
      // Straight up right side
      corePath += ` L ${cx + halfWidth} ${cy - halfHeight + topRadius}`;
      
      // Rounded top (large arc from right to left)
      corePath += ` A ${topRadius} ${topRadius} 0 0 0 ${cx - halfWidth} ${cy - halfHeight + topRadius}`;
      
      // Straight down left side
      corePath += ` L ${cx - halfWidth} ${cy + halfHeight - chamferSize}`;
      
      // Bottom left chamfer (angled)
      corePath += ` L ${cx - halfWidth + chamferSize} ${cy + halfHeight}`;
      
      corePath += ` Z`;
      
      return corePath;
    };

    // Strand positions (will add back later)
    const strandPositions: any[] = [];

    // Helper to draw the 8048 cross-section shape - EXACT trace of provided image
    const drawCrossSection = (offsetX: number, offsetY: number) => {
      const x = startX + offsetX;
      const y = startY + offsetY;
      
      // Keyway dimensions (on the SIDES, indenting IN) - larger and more rectangular
      const keywayWidth = 8; // Taller
      const keywayDepth = 3; // Deeper indent
      const keywayFromTop = 6;
      
      // Draft angle - WIDER at bottom, NARROWER at top (more subtle taper)
      const topInset = 2; // Reduced for more subtle draft angle
      const lipRadius = 4; // More pronounced rounded lips at bottom corners

      // Build the outline path with correct draft angle and bottom lips
      let pathData = `M ${x + lipRadius} ${y + plankHeight}`; // Start at bottom left after lip
      
      // Bottom left corner lip (pronounced curve)
      pathData += ` Q ${x} ${y + plankHeight} ${x} ${y + plankHeight - lipRadius}`;
      
      // Up left side with draft angle (tapering IN toward top) to below keyway
      pathData += ` L ${x + topInset} ${y + keywayFromTop + keywayWidth}`;
      
      // Left keyway (indent IN)
      pathData += ` L ${x + topInset + keywayDepth} ${y + keywayFromTop + keywayWidth}`;
      pathData += ` L ${x + topInset + keywayDepth} ${y + keywayFromTop}`;
      pathData += ` L ${x + topInset} ${y + keywayFromTop}`;
      
      // Continue up to top left corner
      pathData += ` L ${x + topInset} ${y}`;
      
      // Across the top (FLAT - narrower than bottom)
      pathData += ` L ${x + plankWidth - topInset} ${y}`;
      
      // Down right side to keyway
      pathData += ` L ${x + plankWidth - topInset} ${y + keywayFromTop}`;
      
      // Right keyway (indent IN)
      pathData += ` L ${x + plankWidth - topInset - keywayDepth} ${y + keywayFromTop}`;
      pathData += ` L ${x + plankWidth - topInset - keywayDepth} ${y + keywayFromTop + keywayWidth}`;
      pathData += ` L ${x + plankWidth - topInset} ${y + keywayFromTop + keywayWidth}`;
      
      // Down right side with draft angle (tapering OUT toward bottom)
      pathData += ` L ${x + plankWidth} ${y + plankHeight - lipRadius}`;
      
      // Bottom right corner lip (pronounced curve)
      pathData += ` Q ${x + plankWidth} ${y + plankHeight} ${x + plankWidth - lipRadius} ${y + plankHeight}`;
      
      // Bottom edge (wider)
      pathData += ` Z`; // Close path

      return (
        <React.Fragment>
          {/* Outline */}
          <Path
            d={pathData}
            stroke="#2563EB"
            strokeWidth={2}
            fill="none"
          />

          {/* Hollow cores - 6 cores with rounded tops */}
          {cores.map((core, idx) => (
            <Path
              key={`core-${idx}`}
              d={drawCore(x + core.cx, y + core.cy)}
              stroke="#2563EB"
              strokeWidth={1.5}
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
          {/* NEAR FACE (END 1) */}
          {drawCrossSection(0, 0)}

          {/* FAR FACE (END 2) */}
          {drawCrossSection(depthX, -depthY)}

          {/* CONNECTING EDGES for 3D effect */}
          {/* Top right */}
          <Line
            x1={startX + plankWidth}
            y1={startY}
            x2={startX + plankWidth + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
            strokeDasharray="3,3"
          />
          {/* Bottom right */}
          <Line
            x1={startX + plankWidth}
            y1={startY + plankHeight}
            x2={startX + plankWidth + depthX}
            y2={startY + plankHeight - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
            strokeDasharray="3,3"
          />
          {/* Bottom left */}
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
          <Text className="text-blue-600 text-xs font-bold">END 1</Text>
          <Text className="text-blue-600 text-xs font-bold">END 2</Text>
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
