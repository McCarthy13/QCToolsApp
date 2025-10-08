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

    // Isometric projection parameters
    const depth = 180; // Length of plank
    const plankWidth = 150; // Width scaled
    const plankHeight = 40; // Height scaled
    
    // Starting position for near face
    const startX = 40;
    const startY = 140;

    // Isometric angle offsets
    const depthX = depth * 0.866; // cos(30°)
    const depthY = depth * 0.5; // sin(30°)

    // 8048 Cross-section based on provided image
    // 6 hollow cores with keyways on top
    const coreSpacing = plankWidth / 7;
    const coreRadius = 9;
    const coreY = plankHeight * 0.55; // Slightly above center
    
    const cores = Array.from({ length: 6 }, (_, i) => ({
      cx: coreSpacing * (i + 1),
      cy: coreY,
    }));

    // Strand positions (dots in the image - 13 total: 6 below cores + 7 between)
    const strandPositions = [];
    // Strands below each core
    for (let i = 0; i < 6; i++) {
      strandPositions.push({
        id: String(i + 1),
        x: coreSpacing * (i + 1),
        y: plankHeight - 6,
      });
    }
    // Strands between cores (in the webs)
    for (let i = 0; i < 7; i++) {
      strandPositions.push({
        id: String(i + 7),
        x: coreSpacing * (i + 0.5),
        y: plankHeight - 6,
      });
    }

    // Helper to draw the 8048 cross-section shape - EXACT trace of provided image
    const drawCrossSection = (offsetX: number, offsetY: number) => {
      const x = startX + offsetX;
      const y = startY + offsetY;
      
      // Keyway dimensions (on the SIDES, not top)
      const keywayWidth = 4;
      const keywayDepth = 2;
      const keywayFromTop = 8;

      // Build the outline path - simple rectangle with side keyways
      let pathData = `M ${x} ${y + plankHeight}`; // Start at bottom left
      pathData += ` L ${x} ${y + keywayFromTop + keywayWidth}`; // Up left side to below keyway
      pathData += ` L ${x - keywayDepth} ${y + keywayFromTop + keywayWidth}`; // Into left keyway
      pathData += ` L ${x - keywayDepth} ${y + keywayFromTop}`; // Up in keyway
      pathData += ` L ${x} ${y + keywayFromTop}`; // Back out of keyway
      pathData += ` L ${x} ${y}`; // Continue up to top left corner
      pathData += ` L ${x + plankWidth} ${y}`; // Across the top (FLAT)
      pathData += ` L ${x + plankWidth} ${y + keywayFromTop}`; // Down right side to keyway
      pathData += ` L ${x + plankWidth + keywayDepth} ${y + keywayFromTop}`; // Into right keyway
      pathData += ` L ${x + plankWidth + keywayDepth} ${y + keywayFromTop + keywayWidth}`; // Down in keyway
      pathData += ` L ${x + plankWidth} ${y + keywayFromTop + keywayWidth}`; // Back out
      pathData += ` L ${x + plankWidth} ${y + plankHeight}`; // Continue down to bottom right
      pathData += ` Z`; // Close path back to bottom left

      return (
        <React.Fragment>
          {/* Outline */}
          <Path
            d={pathData}
            stroke="#2563EB"
            strokeWidth={2}
            fill="none"
          />

          {/* Hollow cores - 6 large circles */}
          {cores.map((core, idx) => (
            <Circle
              key={`core-${idx}`}
              cx={x + core.cx}
              cy={y + core.cy}
              r={coreRadius}
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

          {/* STRANDS running through the plank */}
          {strandPositions.map((strand) => (
            <React.Fragment key={`strand-${strand.id}`}>
              <Line
                x1={startX + strand.x}
                y1={startY + strand.y}
                x2={startX + strand.x + depthX}
                y2={startY + strand.y - depthY}
                stroke="#EF4444"
                strokeWidth={2.5}
                strokeDasharray="6,4"
              />
              
              {/* Circles at strand ends */}
              <Circle
                cx={startX + strand.x}
                cy={startY + strand.y}
                r={5}
                fill="#EF4444"
                stroke="#991B1B"
                strokeWidth={2}
              />
              <Circle
                cx={startX + strand.x + depthX}
                cy={startY + strand.y - depthY}
                r={5}
                fill="#EF4444"
                stroke="#991B1B"
                strokeWidth={2}
              />
            </React.Fragment>
          ))}
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
