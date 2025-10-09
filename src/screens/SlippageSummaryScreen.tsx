import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Linking, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import Svg, { Line, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { decimalToFraction, parseMeasurementInput } from "../utils/cn";
import { useStrandPatternStore } from "../state/strandPatternStore";
import { useSlippageHistoryStore, SlippageRecord } from "../state/slippageHistoryStore";
import { useAuthStore } from "../state/authStore";
import ConfirmModal from "../components/ConfirmModal";

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
  const { slippages, config } = route.params;
  const { customPatterns } = useStrandPatternStore();
  const { addUserRecord, publishRecord } = useSlippageHistoryStore();
  const currentUser = useAuthStore((state) => state.currentUser);
  
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  // Get the selected strand pattern
  const selectedPattern = customPatterns.find(p => p.id === config.strandPattern);

  // Helper to get strand size by position
  const getStrandSize = (strandId: string): string => {
    const index = parseInt(strandId) - 1;
    const size = selectedPattern?.strandSizes?.[index];
    return size ? `${size}"` : '';
  };

  // Save and publish handlers
  const handleSave = () => {
    const record: SlippageRecord = {
      id: `slippage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      slippages,
      config,
      createdBy: currentUser?.email || 'Unknown',
    };
    addUserRecord(record);
    setSaveSuccess(true);
    setShowSaveModal(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePublish = () => {
    const record: SlippageRecord = {
      id: `slippage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      slippages,
      config,
      createdBy: currentUser?.email || 'Unknown',
    };
    publishRecord(record, currentUser?.email || 'Unknown');
    setPublishSuccess(true);
    setShowPublishModal(false);
    setTimeout(() => setPublishSuccess(false), 3000);
  };

  const handleGenerateEmailReport = async () => {
    // Get user's email
    const userEmail = currentUser?.email || 'unknown@example.com';
    const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown User';
    
    // Build email subject
    const subject = `Slippage Report - ${config.projectName || 'Unnamed Project'}`;
    
    // Build product details section
    let productDetails = "PRODUCT DETAILS:\n";
    if (config.projectName) productDetails += `• Project Name: ${config.projectName}\n`;
    if (config.projectNumber) productDetails += `• Project Number: ${config.projectNumber}\n`;
    if (config.markNumber) productDetails += `• Mark Number: ${config.markNumber}\n`;
    if (config.idNumber) productDetails += `• ID Number: ${config.idNumber}\n`;
    if (config.span) productDetails += `• Span: ${config.span}"\n`;
    productDetails += `• Product Type: ${config.productType}\n`;
    
    // Add strand pattern info
    if (selectedPattern) {
      const totalStrands = selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6;
      productDetails += `• Strand Pattern: ${selectedPattern.name}\n`;
      productDetails += `  - Total Strands: ${totalStrands}\n`;
    }
    
    // Build slippage summary section
    let slippageSummary = "\n\nSLIPPAGE SUMMARY:\n\n";
    
    // Overall statistics
    slippageSummary += "Overall Statistics:\n";
    slippageSummary += `• Total Slippage (All Values): ${slippageStats.anyValueExceeds ? ">" : ""}${slippageStats.totalSlippage.toFixed(3)}" (≈${slippageStats.anyValueExceeds ? ">" : ""}${decimalToFraction(slippageStats.totalSlippage)})\n`;
    slippageSummary += `• Total Slippage END 1: ${slippageStats.anyEnd1Exceeds ? ">" : ""}${slippageStats.totalSlippageEnd1.toFixed(3)}" (≈${slippageStats.anyEnd1Exceeds ? ">" : ""}${decimalToFraction(slippageStats.totalSlippageEnd1)})\n`;
    slippageSummary += `• Total Slippage END 2: ${slippageStats.anyEnd2Exceeds ? ">" : ""}${slippageStats.totalSlippageEnd2.toFixed(3)}" (≈${slippageStats.anyEnd2Exceeds ? ">" : ""}${decimalToFraction(slippageStats.totalSlippageEnd2)})\n`;
    slippageSummary += `• Average Slippage: ${slippageStats.anyValueExceeds ? ">" : ""}${slippageStats.totalAvgSlippage.toFixed(3)}" (≈${slippageStats.anyValueExceeds ? ">" : ""}${decimalToFraction(slippageStats.totalAvgSlippage)})\n`;
    
    if (slippageStats.anyValueExceeds) {
      slippageSummary += "\n⚠ WARNING: Contains values exceeding 1\"\n";
    }
    
    // Individual strand data
    slippageSummary += "\n\nSlippage by Strand:\n";
    slippages.forEach((strand) => {
      const end1Value = parseMeasurementInput(strand.leftSlippage);
      const end2Value = parseMeasurementInput(strand.rightSlippage);
      const e1 = end1Value ?? 0;
      const e2 = end2Value ?? 0;
      const strandTotal = e1 + e2;
      const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;
      const strandSize = getStrandSize(strand.strandId);
      
      slippageSummary += `\nStrand ${strand.strandId}${strandSize ? ` (${strandSize})` : ""}:\n`;
      slippageSummary += `  • END 1: ${strand.leftExceedsOne ? ">" : ""}${end1Value !== null ? end1Value.toFixed(3) : "0.000"}" (≈${strand.leftExceedsOne ? ">" : ""}${end1Value !== null ? decimalToFraction(end1Value) : "0"})\n`;
      slippageSummary += `  • END 2: ${strand.rightExceedsOne ? ">" : ""}${end2Value !== null ? end2Value.toFixed(3) : "0.000"}" (≈${strand.rightExceedsOne ? ">" : ""}${end2Value !== null ? decimalToFraction(end2Value) : "0"})\n`;
      slippageSummary += `  • Strand Total: ${hasExceeds ? ">" : ""}${strandTotal.toFixed(3)}" (≈${hasExceeds ? ">" : ""}${decimalToFraction(strandTotal)})\n`;
    });
    
    // Add footer with user info
    slippageSummary += `\n\n---\nGenerated by Slippage Identifier Tool\nSubmitted by: ${userName} (${userEmail})\nDate: ${new Date().toLocaleString()}`;
    
    // Combine sections
    const body = productDetails + slippageSummary;
    
    // Create mailto link with user's email as the "from" hint
    // Note: Most email clients will use their default "from" address for security,
    // but we include it here and in the body for reference
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailto);
      if (canOpen) {
        await Linking.openURL(mailto);
      } else {
        Alert.alert(
          "Unable to Open Email",
          "Please make sure you have an email app installed on your device.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to open email client. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Calculate all slippage statistics
  const slippageStats = useMemo(() => {
    // Parse all values to decimals and track exceeds flags
    const parsedValues = slippages.map((s) => ({
      strandId: s.strandId,
      end1: parseMeasurementInput(s.leftSlippage),
      end2: parseMeasurementInput(s.rightSlippage),
      end1Exceeds: s.leftExceedsOne,
      end2Exceeds: s.rightExceedsOne,
    }));

    // Check if any value exceeds 1"
    const anyEnd1Exceeds = parsedValues.some((v) => v.end1Exceeds);
    const anyEnd2Exceeds = parsedValues.some((v) => v.end2Exceeds);
    const anyValueExceeds = anyEnd1Exceeds || anyEnd2Exceeds;

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

    // Total slippage per strand with exceeds tracking
    const strandTotals = parsedValues.map((v) => {
      const e1 = v.end1 ?? 0;
      const e2 = v.end2 ?? 0;
      return {
        strandId: v.strandId,
        total: e1 + e2,
        exceeds: v.end1Exceeds || v.end2Exceeds,
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
      anyValueExceeds,
      anyEnd1Exceeds,
      anyEnd2Exceeds,
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
              {slippageStats.anyValueExceeds && ">"}
              {slippageStats.totalSlippage.toFixed(3)}"
            </Text>
            <Text className="text-blue-600 text-base">
              {slippageStats.anyValueExceeds && ">"}≈{decimalToFraction(slippageStats.totalSlippage)}
            </Text>
            {slippageStats.anyValueExceeds && (
              <Text className="text-orange-600 text-xs mt-1 font-semibold">
                ⚠ Contains values exceeding 1"
              </Text>
            )}
          </View>

          {/* End Totals - Side by side */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-green-50 rounded-lg p-4">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Total Slippage END 1
              </Text>
              <Text className="text-green-600 text-xl font-bold">
                {slippageStats.anyEnd1Exceeds && ">"}
                {slippageStats.totalSlippageEnd1.toFixed(3)}"
              </Text>
              <Text className="text-green-600 text-sm">
                {slippageStats.anyEnd1Exceeds && ">"}≈{decimalToFraction(slippageStats.totalSlippageEnd1)}
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-4">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Total Slippage END 2
              </Text>
              <Text className="text-purple-600 text-xl font-bold">
                {slippageStats.anyEnd2Exceeds && ">"}
                {slippageStats.totalSlippageEnd2.toFixed(3)}"
              </Text>
              <Text className="text-purple-600 text-sm">
                {slippageStats.anyEnd2Exceeds && ">"}≈{decimalToFraction(slippageStats.totalSlippageEnd2)}
              </Text>
            </View>
          </View>

          {/* Average Slippage */}
          <View className="bg-orange-50 rounded-lg p-4 mb-3">
            <Text className="text-gray-700 text-xs font-medium mb-1">
              Total Average Slippage
            </Text>
            <Text className="text-orange-600 text-2xl font-bold">
              {slippageStats.anyValueExceeds && ">"}
              {slippageStats.totalAvgSlippage.toFixed(3)}"
            </Text>
            <Text className="text-orange-600 text-base">
              {slippageStats.anyValueExceeds && ">"}≈{decimalToFraction(slippageStats.totalAvgSlippage)}
            </Text>
          </View>

          {/* Average by End - Side by side */}
          <View className="flex-row gap-3 mb-3">
            <View className="flex-1 bg-green-50 rounded-lg p-4">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Avg Slippage END 1
              </Text>
              <Text className="text-green-600 text-xl font-bold">
                {slippageStats.anyEnd1Exceeds && ">"}
                {slippageStats.totalAvgSlippageEnd1.toFixed(3)}"
              </Text>
              <Text className="text-green-600 text-sm">
                {slippageStats.anyEnd1Exceeds && ">"}≈{decimalToFraction(slippageStats.totalAvgSlippageEnd1)}
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-4">
              <Text className="text-gray-700 text-xs font-medium mb-1">
                Avg Slippage END 2
              </Text>
              <Text className="text-purple-600 text-xl font-bold">
                {slippageStats.anyEnd2Exceeds && ">"}
                {slippageStats.totalAvgSlippageEnd2.toFixed(3)}"
              </Text>
              <Text className="text-purple-600 text-sm">
                {slippageStats.anyEnd2Exceeds && ">"}≈{decimalToFraction(slippageStats.totalAvgSlippageEnd2)}
              </Text>
            </View>
          </View>

          {/* Per-Strand Slippage Details */}
          <View className="bg-gray-50 rounded-lg p-4 mb-4">
            <Text className="text-gray-700 text-sm font-semibold mb-3">
              Slippage by Strand
            </Text>
            {slippages.map((strand) => {
              const end1Value = parseMeasurementInput(strand.leftSlippage);
              const end2Value = parseMeasurementInput(strand.rightSlippage);
              
              // Calculate total for this strand
              const e1 = end1Value ?? 0;
              const e2 = end2Value ?? 0;
              const strandTotal = e1 + e2;
              const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;
              
              return (
                <View key={strand.strandId} className="mb-4 pb-4 border-b border-gray-300 last:border-b-0">
                  {/* Strand Header */}
                  <View className="flex-row items-center mb-3">
                    <View className="bg-red-500 rounded-full w-7 h-7 items-center justify-center mr-2">
                      <Text className="text-white font-bold text-xs">
                        {strand.strandId}
                      </Text>
                    </View>
                    <Text className="text-gray-900 text-base font-semibold">
                      Strand {strand.strandId}
                      {getStrandSize(strand.strandId) && (
                        <Text className="text-gray-600 font-normal text-sm">
                          {' '}({getStrandSize(strand.strandId)})
                        </Text>
                      )}
                    </Text>
                  </View>
                  
                  {/* END 1 & END 2 Values */}
                  <View className="flex-row gap-2 mb-3 ml-9">
                    {/* END 1 */}
                    <View className="flex-1 bg-white rounded-lg p-2.5 border border-green-200">
                      <Text className="text-gray-600 text-xs mb-1">END 1</Text>
                      {strand.leftExceedsOne ? (
                        <>
                          <Text className="text-green-600 text-sm font-bold">
                            {'>'}{end1Value !== null ? end1Value.toFixed(3) : "1.000"}"
                          </Text>
                          <Text className="text-green-600 text-xs">
                            {'>'}≈{end1Value !== null ? decimalToFraction(end1Value) : '1"'}
                          </Text>
                          <Text className="text-orange-600 text-xs font-semibold mt-0.5">
                            {'>1"'}
                          </Text>
                        </>
                      ) : end1Value !== null && end1Value !== 0 ? (
                        <>
                          <Text className="text-green-600 text-sm font-bold">
                            {end1Value.toFixed(3)}"
                          </Text>
                          <Text className="text-green-600 text-xs">
                            ≈{decimalToFraction(end1Value)}
                          </Text>
                        </>
                      ) : (
                        <Text className="text-gray-400 text-xs italic">0"</Text>
                      )}
                    </View>
                    
                    {/* END 2 */}
                    <View className="flex-1 bg-white rounded-lg p-2.5 border border-purple-200">
                      <Text className="text-gray-600 text-xs mb-1">END 2</Text>
                      {strand.rightExceedsOne ? (
                        <>
                          <Text className="text-purple-600 text-sm font-bold">
                            {'>'}{end2Value !== null ? end2Value.toFixed(3) : "1.000"}"
                          </Text>
                          <Text className="text-purple-600 text-xs">
                            {'>'}≈{end2Value !== null ? decimalToFraction(end2Value) : '1"'}
                          </Text>
                          <Text className="text-orange-600 text-xs font-semibold mt-0.5">
                            {'>1"'}
                          </Text>
                        </>
                      ) : end2Value !== null && end2Value !== 0 ? (
                        <>
                          <Text className="text-purple-600 text-sm font-bold">
                            {end2Value.toFixed(3)}"
                          </Text>
                          <Text className="text-purple-600 text-xs">
                            ≈{decimalToFraction(end2Value)}
                          </Text>
                        </>
                      ) : (
                        <Text className="text-gray-400 text-xs italic">0"</Text>
                      )}
                    </View>
                  </View>
                  
                  {/* Strand Total */}
                  <View className="bg-blue-50 rounded-lg p-2.5 ml-9 border border-blue-200">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-gray-700 text-xs font-semibold">
                        Strand Total:
                      </Text>
                      <View className="items-end">
                        <Text className="text-blue-600 text-base font-bold">
                          {hasExceeds && ">"}
                          {strandTotal.toFixed(3)}"
                        </Text>
                        <Text className="text-blue-600 text-xs">
                          {hasExceeds && ">"}≈{decimalToFraction(strandTotal)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Success Messages */}
          {saveSuccess && (
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text className="text-green-700 font-semibold ml-3">
                Record saved successfully!
              </Text>
            </View>
          )}
          
          {publishSuccess && (
            <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex-row items-center">
              <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              <Text className="text-blue-700 font-semibold ml-3">
                Record published successfully!
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-3 mb-3">
            <Pressable
              className="flex-1 bg-green-500 rounded-xl py-4 items-center active:bg-green-600"
              onPress={() => setShowSaveModal(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="save-outline" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">
                  Save
                </Text>
              </View>
            </Pressable>
            
            <Pressable
              className="flex-1 bg-purple-500 rounded-xl py-4 items-center active:bg-purple-600"
              onPress={() => setShowPublishModal(true)}
            >
              <View className="flex-row items-center">
                <Ionicons name="cloud-upload-outline" size={20} color="white" />
                <Text className="text-white text-base font-semibold ml-2">
                  Publish
                </Text>
              </View>
            </Pressable>
          </View>

          <Pressable
            className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600 mb-3"
            onPress={handleGenerateEmailReport}
          >
            <View className="flex-row items-center">
              <Ionicons name="mail-outline" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">
                Generate Email Report
              </Text>
            </View>
          </Pressable>

          <Pressable
            className="bg-gray-100 rounded-xl py-4 items-center active:bg-gray-200 mb-4"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-gray-700 text-base font-semibold">
              Back to Input
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Save Confirmation Modal */}
      <ConfirmModal
        visible={showSaveModal}
        title="Save Record"
        message="Save this slippage record to your personal records?"
        confirmText="Save"
        cancelText="Cancel"
        confirmStyle="default"
        onConfirm={handleSave}
        onCancel={() => setShowSaveModal(false)}
      />

      {/* Publish Confirmation Modal */}
      <ConfirmModal
        visible={showPublishModal}
        title="Publish Record"
        message="Publish this slippage record to the official records visible to all users?"
        confirmText="Publish"
        cancelText="Cancel"
        confirmStyle="default"
        onConfirm={handlePublish}
        onCancel={() => setShowPublishModal(false)}
      />
    </View>
  );
}
