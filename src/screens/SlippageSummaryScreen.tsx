import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import Svg, { Line, Path } from "react-native-svg";
import { decimalToFraction, parseMeasurementInput } from "../utils/cn";

type SlippageSummaryScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SlippageSummary"
>;
type SlippageSummaryScreenRouteProp = RouteProp<
  RootStackParamList,
  "SlippageSummary"
>;

interface Props {
  navigation: SlippageSummaryScreenNavigationProp;
  route: SlippageSummaryScreenRouteProp;
}

export default function SlippageSummaryScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { slippages } = route.params;

  // Calculate all slippage statistics
  const slippageStats = useMemo(() => {
    // Parse all values to decimals
    const parsedValues = slippages.map((s) => ({
      strandId: s.strandId,
      end1: parseMeasurementInput(s.leftSlippage),
      end2: parseMeasurementInput(s.rightSlippage),
    }));

    // Filter out invalid/empty values for calculations
    const end1Values = parsedValues
      .map((v) => v.end1)
      .filter((v): v is number => v !== null && !isNaN(v));
    const end2Values = parsedValues
      .map((v) => v.end2)
      .filter((v): v is number => v !== null && !isNaN(v));
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
    const totalAvgSlippage =
      allValues.length > 0 ? totalSlippage / allValues.length : 0;
    const totalAvgSlippageEnd1 =
      end1Values.length > 0 ? totalSlippageEnd1 / end1Values.length : 0;
    const totalAvgSlippageEnd2 =
      end2Values.length > 0 ? totalSlippageEnd2 / end2Values.length : 0;

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

  // 3D Isometric view of 8048 hollow-core plank
  const PlankModel = () => {
    const svgWidth = 380;
    const svgHeight = 320;

    const scale = 4;
    const plankWidth = 48 * scale;
    const plankHeight = 8 * scale;

    const startX = 30;
    const startY = 135;

    const depth = 180;
    const depthX = depth * 0.866;
    const depthY = depth * 0.5;

    const coreWidth = 5.5 * scale;
    const coreHeight = 5.625 * scale;
    const coreBottomFromPlankBottom = 1.1875 * scale;
    const edgeToCoreEdge = 2.625 * scale;
    const spacingBetweenCores = 1.9375 * scale;

    const coreBottomY = plankHeight - coreBottomFromPlankBottom;
    const coreCenterY = coreBottomY - coreHeight / 2;
    const firstCoreCenterX = edgeToCoreEdge + coreWidth / 2;

    const cores = Array.from({ length: 6 }, (_, i) => ({
      cx: firstCoreCenterX + i * (coreWidth + spacingBetweenCores),
      cy: coreCenterY,
    }));

    const drawCore = (cx: number, cy: number) => {
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

    const drawCrossSection = (
      offsetX: number,
      offsetY: number,
      isHidden: boolean,
      solidTop: boolean = false,
      solidRight: boolean = false
    ) => {
      const x = startX + offsetX;
      const y = startY + offsetY;

      const keywayWidth = 8;
      const keywayDepth = 3;
      const keywayFromTop = 6;
      const topInset = 2;
      const lipRadius = 4;

      let leftPath = `M ${x + lipRadius} ${y + plankHeight}`;
      leftPath += ` Q ${x} ${y + plankHeight} ${x} ${y + plankHeight - lipRadius}`;
      leftPath += ` L ${x + topInset} ${y + keywayFromTop + keywayWidth}`;
      leftPath += ` L ${x + topInset + keywayDepth} ${y + keywayFromTop + keywayWidth}`;
      leftPath += ` L ${x + topInset + keywayDepth} ${y + keywayFromTop}`;
      leftPath += ` L ${x + topInset} ${y + keywayFromTop}`;
      leftPath += ` L ${x + topInset} ${y}`;

      const topPath = `M ${x + topInset} ${y} L ${x + plankWidth - topInset} ${y}`;

      let rightPath = `M ${x + plankWidth - topInset} ${y}`;
      rightPath += ` L ${x + plankWidth - topInset} ${y + keywayFromTop}`;
      rightPath += ` L ${x + plankWidth - topInset - keywayDepth} ${y + keywayFromTop}`;
      rightPath += ` L ${x + plankWidth - topInset - keywayDepth} ${y + keywayFromTop + keywayWidth}`;
      rightPath += ` L ${x + plankWidth - topInset} ${y + keywayFromTop + keywayWidth}`;
      rightPath += ` L ${x + plankWidth} ${y + plankHeight - lipRadius}`;
      rightPath += ` Q ${x + plankWidth} ${y + plankHeight} ${x + plankWidth - lipRadius} ${y + plankHeight}`;
      rightPath += ` L ${x + lipRadius} ${y + plankHeight}`;

      const leftStrokeDash = isHidden ? "3,3" : undefined;
      const topStrokeDash = solidTop
        ? undefined
        : isHidden
        ? "3,3"
        : undefined;
      const rightStrokeDash = solidRight
        ? undefined
        : isHidden
        ? "3,3"
        : undefined;

      return (
        <React.Fragment>
          <Path
            d={leftPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={leftStrokeDash}
            fill="none"
          />
          <Path
            d={topPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={topStrokeDash}
            fill="none"
          />
          <Path
            d={rightPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={rightStrokeDash}
            fill="none"
          />
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
          {drawCrossSection(0, 0, false, false, false)}
          {drawCrossSection(depthX, -depthY, true, true, true)}
          <Line
            x1={startX}
            y1={startY}
            x2={startX + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
          <Line
            x1={startX + plankWidth}
            y1={startY}
            x2={startX + plankWidth + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
          <Line
            x1={startX + plankWidth}
            y1={startY + plankHeight}
            x2={startX + plankWidth + depthX}
            y2={startY + plankHeight - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
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

        <View className="flex-row justify-between w-full px-12 mt-2">
          <Text className="text-blue-600 text-xs font-bold">END 1 (Near)</Text>
          <Text className="text-blue-600 text-xs font-bold">END 2 (Far)</Text>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200">
          <Text className="text-gray-900 text-2xl font-bold">
            Slippage Summary
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            Analysis of strand slippage values
          </Text>
        </View>

        {/* 3D Model */}
        <PlankModel />

        {/* Slippage Statistics */}
        <View className="px-6">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Slippage Statistics
          </Text>

          {/* Total Slippage */}
          <View className="bg-blue-50 rounded-lg p-4 mb-3">
            <Text className="text-gray-700 text-xs font-medium mb-1">
              Total Slippage (All Values)
            </Text>
            <Text className="text-blue-600 text-2xl font-bold">
              {slippageStats.totalSlippage.toFixed(3)}"
            </Text>
            <Text className="text-blue-600 text-base">
              ≈{decimalToFraction(slippageStats.totalSlippage)}
            </Text>
          </View>

          {/* End Totals - Side by side */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-green-50 rounded-lg p-4">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Total Slippage END 1
              </Text>
              <Text className="text-green-600 text-xl font-bold">
                {slippageStats.totalSlippageEnd1.toFixed(3)}"
              </Text>
              <Text className="text-green-600 text-sm">
                ≈{decimalToFraction(slippageStats.totalSlippageEnd1)}
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-4">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Total Slippage END 2
              </Text>
              <Text className="text-purple-600 text-xl font-bold">
                {slippageStats.totalSlippageEnd2.toFixed(3)}"
              </Text>
              <Text className="text-purple-600 text-sm">
                ≈{decimalToFraction(slippageStats.totalSlippageEnd2)}
              </Text>
            </View>
          </View>

          {/* Average Slippage */}
          <View className="bg-orange-50 rounded-lg p-4 mb-3">
            <Text className="text-gray-700 text-xs font-medium mb-1">
              Total Average Slippage
            </Text>
            <Text className="text-orange-600 text-2xl font-bold">
              {slippageStats.totalAvgSlippage.toFixed(3)}"
            </Text>
            <Text className="text-orange-600 text-base">
              ≈{decimalToFraction(slippageStats.totalAvgSlippage)}
            </Text>
          </View>

          {/* Average by End - Side by side */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-green-50 rounded-lg p-4">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Avg Slippage END 1
              </Text>
              <Text className="text-green-600 text-xl font-bold">
                {slippageStats.totalAvgSlippageEnd1.toFixed(3)}"
              </Text>
              <Text className="text-green-600 text-sm">
                ≈{decimalToFraction(slippageStats.totalAvgSlippageEnd1)}
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-4">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Avg Slippage END 2
              </Text>
              <Text className="text-purple-600 text-xl font-bold">
                {slippageStats.totalAvgSlippageEnd2.toFixed(3)}"
              </Text>
              <Text className="text-purple-600 text-sm">
                ≈{decimalToFraction(slippageStats.totalAvgSlippageEnd2)}
              </Text>
            </View>
          </View>

          {/* Individual Strand Values */}
          <View className="bg-gray-50 rounded-lg p-4 mb-3">
            <Text className="text-gray-700 text-sm font-semibold mb-3">
              Individual Slippage Values
            </Text>
            {slippages.map((strand) => {
              const end1Value = parseMeasurementInput(strand.leftSlippage);
              const end2Value = parseMeasurementInput(strand.rightSlippage);
              
              return (
                <View key={strand.strandId} className="mb-3 pb-3 border-b border-gray-300">
                  <View className="flex-row items-center mb-2">
                    <View className="bg-red-500 rounded-full w-6 h-6 items-center justify-center mr-2">
                      <Text className="text-white font-bold text-xs">
                        {strand.strandId}
                      </Text>
                    </View>
                    <Text className="text-gray-900 text-sm font-semibold">
                      Strand {strand.strandId}
                    </Text>
                  </View>
                  
                  <View className="flex-row gap-3 ml-8">
                    {/* END 1 Value */}
                    <View className="flex-1 bg-white rounded-lg p-3 border border-green-200">
                      <Text className="text-gray-600 text-xs mb-1">END 1</Text>
                      {end1Value !== null ? (
                        <>
                          <Text className="text-green-600 text-base font-bold">
                            {end1Value.toFixed(3)}"
                          </Text>
                          <Text className="text-green-600 text-xs">
                            ≈{decimalToFraction(end1Value)}
                          </Text>
                        </>
                      ) : (
                        <Text className="text-gray-400 text-sm italic">No value</Text>
                      )}
                    </View>
                    
                    {/* END 2 Value */}
                    <View className="flex-1 bg-white rounded-lg p-3 border border-purple-200">
                      <Text className="text-gray-600 text-xs mb-1">END 2</Text>
                      {end2Value !== null ? (
                        <>
                          <Text className="text-purple-600 text-base font-bold">
                            {end2Value.toFixed(3)}"
                          </Text>
                          <Text className="text-purple-600 text-xs">
                            ≈{decimalToFraction(end2Value)}
                          </Text>
                        </>
                      ) : (
                        <Text className="text-gray-400 text-sm italic">No value</Text>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Per-Strand Totals */}
          <View className="bg-gray-50 rounded-lg p-4 mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-3">
              Total Slippage Per Strand
            </Text>
            {slippageStats.strandTotals.map((strand) => (
              <View
                key={strand.strandId}
                className="flex-row justify-between items-center py-2 border-b border-gray-200"
              >
                <View className="flex-row items-center">
                  <View className="bg-red-500 rounded-full w-6 h-6 items-center justify-center mr-2">
                    <Text className="text-white font-bold text-xs">
                      {strand.strandId}
                    </Text>
                  </View>
                  <Text className="text-gray-600 text-sm">
                    Strand {strand.strandId}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-gray-900 text-base font-bold">
                    {strand.total.toFixed(3)}"
                  </Text>
                  <Text className="text-gray-600 text-xs">
                    ≈{decimalToFraction(strand.total)}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Back Button */}
          <Pressable
            className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600 mb-4"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white text-base font-semibold">
              Back to Input
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
