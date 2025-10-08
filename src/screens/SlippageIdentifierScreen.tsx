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

  // Generic cross-section: Simple rectangular hollow-core shape with 4 strands
  const GenericCrossSection = () => {
    const width = 300;
    const height = 200;
    const padding = 40;

    // Strand positions (y-coordinates from top)
    const strands = [
      { id: "1", y: 150 }, // Bottom left
      { id: "2", y: 150 }, // Bottom right  
      { id: "3", y: 60 }, // Top left
      { id: "4", y: 60 }, // Top right
    ];

    return (
      <View className="items-center my-6">
        <Text className="text-gray-700 text-sm font-semibold mb-4">
          CROSS-SECTION VIEW (Generic Product)
        </Text>
        <View>
          <Svg width={width + padding * 2} height={height + 40}>
            {/* Hollow plank outline */}
            <Rect
              x={padding}
              y={20}
              width={width}
              height={height}
              stroke="#1F2937"
              strokeWidth={3}
              fill="none"
            />

            {/* Inner hollow void */}
            <Rect
              x={padding + 40}
              y={50}
              width={width - 80}
              height={height - 60}
              stroke="#1F2937"
              strokeWidth={2}
              fill="none"
            />

            {/* Strands running through (left to right) */}
            {strands.map((strand) => {
              const yPosition = strand.y;

              return (
                <React.Fragment key={strand.id}>
                  {/* Strand line running through */}
                  <Line
                    x1={padding}
                    y1={yPosition}
                    x2={padding + width}
                    y2={yPosition}
                    stroke="#EF4444"
                    strokeWidth={3}
                    strokeDasharray="5,5"
                  />

                  {/* Left end circle */}
                  <Circle
                    cx={padding}
                    cy={yPosition}
                    r={6}
                    fill="#EF4444"
                    stroke="#991B1B"
                    strokeWidth={2}
                  />

                  {/* Right end circle */}
                  <Circle
                    cx={padding + width}
                    cy={yPosition}
                    r={6}
                    fill="#EF4444"
                    stroke="#991B1B"
                    strokeWidth={2}
                  />
                </React.Fragment>
              );
            })}
          </Svg>
          
          {/* Strand labels positioned absolutely */}
          {strands.map((strand) => (
            <View
              key={`label-${strand.id}`}
              style={{
                position: "absolute",
                top: strand.y - 18,
                left: width / 2 + padding - 25,
              }}
            >
              <Text
                style={{
                  color: "#EF4444",
                  fontSize: 11,
                  fontWeight: "bold",
                }}
              >
                Strand {strand.id}
              </Text>
            </View>
          ))}
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
                {/* Left end */}
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-600 mb-2">
                    LEFT END
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

                {/* Right end */}
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-600 mb-2">
                    RIGHT END
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
