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
import Svg, { Rect, Circle, Line } from "react-native-svg";

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

  // 3D Isometric view of hollow-core plank with strands
  const GenericCrossSection = () => {
    const svgWidth = 380;
    const svgHeight = 300;

    // Isometric projection parameters (scaled down to fit)
    const depth = 180; // Length of plank (reduced)
    const width = 100; // Width of cross-section (reduced)
    const height = 60; // Height of cross-section (reduced)
    
    // Starting position for near face (adjusted to center)
    const startX = 60;
    const startY = 120;

    // Isometric angle offsets
    const depthX = depth * 0.866; // cos(30°) ≈ 0.866
    const depthY = depth * 0.5; // sin(30°) ≈ 0.5

    // Define 5 hollow cores (circles) in cross-section - positioned to fit within the rectangle
    const cores = [
      { cx: 15, cy: 30 },
      { cx: 32, cy: 30 },
      { cx: 50, cy: 30 },
      { cx: 68, cy: 30 },
      { cx: 85, cy: 30 },
    ];
    const coreRadius = 6;

    // Define 5 strands matching the cores
    const strandPositions = cores.map((core, idx) => ({
      id: String(idx + 1),
      x: core.cx,
      y: core.cy,
    }));

    return (
      <View className="items-center my-6">
        <Text className="text-gray-700 text-sm font-semibold mb-4">
          3D VIEW - Generic Hollow Core Plank
        </Text>
        <Svg width={svgWidth} height={svgHeight}>
          {/* NEAR FACE (front cross-section) - labeled END 1 */}
          {/* Outer rectangle */}
          <Line
            x1={startX}
            y1={startY}
            x2={startX + width}
            y2={startY}
            stroke="#2563EB"
            strokeWidth={2.5}
          />
          <Line
            x1={startX + width}
            y1={startY}
            x2={startX + width}
            y2={startY + height}
            stroke="#2563EB"
            strokeWidth={2.5}
          />
          <Line
            x1={startX + width}
            y1={startY + height}
            x2={startX}
            y2={startY + height}
            stroke="#2563EB"
            strokeWidth={2.5}
          />
          <Line
            x1={startX}
            y1={startY + height}
            x2={startX}
            y2={startY}
            stroke="#2563EB"
            strokeWidth={2.5}
          />

          {/* Hollow cores on near face */}
          {cores.map((core, idx) => (
            <Circle
              key={`near-core-${idx}`}
              cx={startX + core.cx}
              cy={startY + core.cy}
              r={coreRadius}
              stroke="#2563EB"
              strokeWidth={2}
              fill="none"
            />
          ))}

          {/* FAR FACE (back cross-section) - labeled END 2 */}
          {/* Outer rectangle */}
          <Line
            x1={startX + depthX}
            y1={startY - depthY}
            x2={startX + width + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={2.5}
          />
          <Line
            x1={startX + width + depthX}
            y1={startY - depthY}
            x2={startX + width + depthX}
            y2={startY + height - depthY}
            stroke="#2563EB"
            strokeWidth={2.5}
          />
          <Line
            x1={startX + width + depthX}
            y1={startY + height - depthY}
            x2={startX + depthX}
            y2={startY + height - depthY}
            stroke="#2563EB"
            strokeWidth={2.5}
          />
          <Line
            x1={startX + depthX}
            y1={startY + height - depthY}
            x2={startX + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={2.5}
          />

          {/* Hollow cores on far face */}
          {cores.map((core, idx) => (
            <Circle
              key={`far-core-${idx}`}
              cx={startX + core.cx + depthX}
              cy={startY + core.cy - depthY}
              r={coreRadius}
              stroke="#2563EB"
              strokeWidth={2}
              fill="none"
            />
          ))}

          {/* CONNECTING EDGES (to show 3D depth) - only draw bottom and right edges */}
          {/* Top right corner */}
          <Line
            x1={startX + width}
            y1={startY}
            x2={startX + width + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray="4,4"
          />
          {/* Bottom right corner */}
          <Line
            x1={startX + width}
            y1={startY + height}
            x2={startX + width + depthX}
            y2={startY + height - depthY}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray="4,4"
          />
          {/* Bottom left corner */}
          <Line
            x1={startX}
            y1={startY + height}
            x2={startX + depthX}
            y2={startY + height - depthY}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray="4,4"
          />

          {/* STRANDS running through the plank (dashed red lines) */}
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
              
              {/* Circles at strand ends for input points */}
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
