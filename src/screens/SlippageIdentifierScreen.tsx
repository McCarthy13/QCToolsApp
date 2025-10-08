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

  // 3D Isometric view of 8048 hollow-core plank with strands
  const GenericCrossSection = () => {
    const svgWidth = 380;
    const svgHeight = 320;

    // Isometric projection parameters
    const depth = 180; // Length of plank
    const plankWidth = 120; // Width of 8048 (4'-0" scaled)
    const plankHeight = 48; // Height of 8048 (8" scaled to 48px)
    
    // Starting position for near face
    const startX = 60;
    const startY = 140;

    // Isometric angle offsets
    const depthX = depth * 0.866; // cos(30°)
    const depthY = depth * 0.5; // sin(30°)

    // 8048 Cross-section: 6 hollow cores with keyways on top
    // Core positions (6 cores evenly spaced)
    const coreSpacing = plankWidth / 7; // Space between cores
    const coreRadius = 7; // Radius of hollow cores
    const coreY = plankHeight / 2; // Centered vertically
    
    const cores = Array.from({ length: 6 }, (_, i) => ({
      cx: coreSpacing * (i + 1),
      cy: coreY,
    }));

    // Keyway positions on top (between cores)
    const keywayWidth = 6;
    const keywayDepth = 4;
    
    // Define strands at bottom of each core
    const strandPositions = cores.map((core, idx) => ({
      id: String(idx + 1),
      x: core.cx,
      y: plankHeight - 8, // Near bottom
    }));

    // Helper to draw the 8048 cross-section shape
    const drawCrossSection = (offsetX: number, offsetY: number) => {
      const x = startX + offsetX;
      const y = startY + offsetY;

      return (
        <React.Fragment>
          {/* Top surface with keyways */}
          {/* Left edge to first keyway */}
          <Line
            x1={x}
            y1={y}
            x2={x + coreSpacing - keywayWidth / 2}
            y2={y}
            stroke="#2563EB"
            strokeWidth={2}
          />
          
          {/* Draw keyways between cores */}
          {cores.slice(0, -1).map((_, i) => {
            const keyX1 = x + coreSpacing * (i + 1) - keywayWidth / 2;
            const keyX2 = keyX1 + keywayWidth;
            const keyX3 = x + coreSpacing * (i + 2) - keywayWidth / 2;
            
            return (
              <React.Fragment key={`keyway-${i}`}>
                {/* Drop down */}
                <Line x1={keyX1} y1={y} x2={keyX1} y2={y + keywayDepth} stroke="#2563EB" strokeWidth={2} />
                {/* Across bottom */}
                <Line x1={keyX1} y1={y + keywayDepth} x2={keyX2} y2={y + keywayDepth} stroke="#2563EB" strokeWidth={2} />
                {/* Back up */}
                <Line x1={keyX2} y1={y + keywayDepth} x2={keyX2} y2={y} stroke="#2563EB" strokeWidth={2} />
                {/* To next keyway */}
                <Line x1={keyX2} y1={y} x2={keyX3} y2={y} stroke="#2563EB" strokeWidth={2} />
              </React.Fragment>
            );
          })}
          
          {/* Last segment to right edge */}
          <Line
            x1={x + plankWidth - coreSpacing + keywayWidth / 2}
            y1={y}
            x2={x + plankWidth}
            y2={y}
            stroke="#2563EB"
            strokeWidth={2}
          />

          {/* Right edge */}
          <Line
            x1={x + plankWidth}
            y1={y}
            x2={x + plankWidth}
            y2={y + plankHeight}
            stroke="#2563EB"
            strokeWidth={2}
          />

          {/* Bottom edge */}
          <Line
            x1={x + plankWidth}
            y1={y + plankHeight}
            x2={x}
            y2={y + plankHeight}
            stroke="#2563EB"
            strokeWidth={2}
          />

          {/* Left edge */}
          <Line
            x1={x}
            y1={y + plankHeight}
            x2={x}
            y2={y}
            stroke="#2563EB"
            strokeWidth={2}
          />

          {/* Hollow cores */}
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
