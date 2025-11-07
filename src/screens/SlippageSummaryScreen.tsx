import React, { useMemo, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { decimalToFraction, parseMeasurementInput } from "../utils/cn";
import { useStrandPatternStore } from "../state/strandPatternStore";
import { useSlippageHistoryStore, SlippageRecord } from "../state/slippageHistoryStore";
import { useAuthStore } from "../state/authStore";
import ConfirmModal from "../components/ConfirmModal";
import CrossSection8048 from "../components/CrossSection8048";
import CrossSection1048 from "../components/CrossSection1048";
import CrossSection1248 from "../components/CrossSection1248";
import CrossSection1250 from "../components/CrossSection1250";
import { generateSlippagePDF, sharePDF } from "../utils/pdfGenerator";
import { captureRef } from "react-native-view-shot";

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Ref for capturing cross-section as image
  const crossSectionRef = useRef<View>(null);

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

  const handleGeneratePDFReport = async () => {
    setIsGeneratingPDF(true);

    try {
      // Capture the cross-section diagram as an image
      let crossSectionImageUri: string | undefined;
      if (crossSectionRef.current) {
        console.log('[PDF] Capturing cross-section...');
        crossSectionImageUri = await captureRef(crossSectionRef, {
          format: 'png',
          quality: 0.7, // Reduce quality to prevent large file sizes
          width: 800, // Limit width to prevent huge images
        });
        console.log('[PDF] Cross-section captured:', crossSectionImageUri);
      } else {
        console.log('[PDF] No cross-section ref available');
      }

      // Get user's email and name
      const userEmail = currentUser?.email || 'unknown@example.com';
      const userName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : 'Unknown User';

      console.log('[PDF] Generating PDF...');
      // Generate the PDF
      const filePath = await generateSlippagePDF({
        slippages,
        config,
        slippageStats,
        userEmail,
        userName,
        crossSectionImageUri,
        getStrandSize,
      });

      if (filePath) {
        console.log('[PDF] PDF generated successfully:', filePath);
        // Share the PDF
        await sharePDF(filePath);
        console.log('[PDF] PDF shared successfully');
      } else {
        console.log('[PDF] Failed to generate PDF - no file path returned');
        Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
      }
    } catch (error) {
      console.error('[PDF] Error generating/sharing PDF:', error);
      Alert.alert('Error', `Failed to generate or share PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Calculate all slippage statistics
  const slippageStats = useMemo(() => {
    // Parse all values to decimals and track exceeds flags
    const parsedValues = slippages.map((s) => ({
      strandId: s.strandId,
      end1Raw: parseMeasurementInput(s.leftSlippage),
      end2Raw: parseMeasurementInput(s.rightSlippage),
      end1Exceeds: s.leftExceedsOne,
      end2Exceeds: s.rightExceedsOne,
      // When exceeds is true, use 1.0 for calculations, otherwise use the parsed value
      end1: s.leftExceedsOne ? 1.0 : (parseMeasurementInput(s.leftSlippage) ?? 0),
      end2: s.rightExceedsOne ? 1.0 : (parseMeasurementInput(s.rightSlippage) ?? 0),
    }));

    // Check if any value exceeds 1"
    const anyEnd1Exceeds = parsedValues.some((v) => v.end1Exceeds);
    const anyEnd2Exceeds = parsedValues.some((v) => v.end2Exceeds);
    const anyValueExceeds = anyEnd1Exceeds || anyEnd2Exceeds;

    // Get values for calculations (using the adjusted values that account for >1")
    // Include ALL strands, even those with 0 slippage
    const end1Values = parsedValues
      .map((v) => v.end1)
      .filter((v): v is number => v !== null && !isNaN(v));
    const end2Values = parsedValues
      .map((v) => v.end2)
      .filter((v): v is number => v !== null && !isNaN(v));
    const allValues = [...end1Values, ...end2Values];

    // Total slippage (all values) - now includes 1.0 for any >1" values
    const totalSlippage = allValues.reduce((sum, val) => sum + val, 0);

    // Total slippage per end - now includes 1.0 for any >1" values
    const totalSlippageEnd1 = end1Values.reduce((sum, val) => sum + val, 0);
    const totalSlippageEnd2 = end2Values.reduce((sum, val) => sum + val, 0);

    // Total slippage per strand with exceeds tracking
    const strandTotals = parsedValues.map((v) => {
      return {
        strandId: v.strandId,
        total: v.end1 + v.end2, // Uses the adjusted values (1.0 if exceeds)
        exceeds: v.end1Exceeds || v.end2Exceeds,
      };
    });

    // Average calculations - now includes all active strands (including those with 0 slippage)
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

  // Calculate active strand indices for the cross-section
  const activeStrandIndices = useMemo(() => {
    if (!selectedPattern || !selectedPattern.strandCoordinates || !config.productWidth || !config.offcutSide) {
      return null;
    }

    const { strandCoordinates } = selectedPattern;
    const { productWidth, offcutSide } = config;
    const fullWidth = Math.max(...strandCoordinates.map(c => c.x));

    console.log('[SlippageSummary] Calculating active strands:');
    console.log('  Full width:', fullWidth);
    console.log('  Product width:', productWidth);
    console.log('  Offcut side:', offcutSide);
    console.log('  Total strands:', strandCoordinates.length);

    const activeIndices: number[] = [];
    strandCoordinates.forEach((coord, index) => {
      let isActive = false;
      if (offcutSide === 'L1') {
        const cutoffPoint = fullWidth - productWidth;
        // Use strict inequality to exclude strands right at the boundary
        isActive = coord.x > cutoffPoint;
        console.log(`  Strand ${index + 1} at x=${coord.x}: ${isActive ? 'ACTIVE' : 'inactive'} (cutoff: ${cutoffPoint})`);
      } else if (offcutSide === 'L2') {
        // Use strict inequality to exclude strands right at the boundary
        isActive = coord.x < productWidth;
        console.log(`  Strand ${index + 1} at x=${coord.x}: ${isActive ? 'ACTIVE' : 'inactive'} (cutoff: ${productWidth})`);
      }
      if (isActive) {
        activeIndices.push(index + 1); // Convert to 1-based
      }
    });

    console.log('[SlippageSummary] Active strand count:', activeIndices.length);
    console.log('[SlippageSummary] Active strand indices:', activeIndices);

    return activeIndices;
  }, [selectedPattern, config.productWidth, config.offcutSide]);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Header - More compact */}
        <View className="px-6 py-3 border-b border-gray-200">
          <Text className="text-gray-900 text-xl font-bold">
            Slippage Summary
          </Text>
        </View>

        {/* Cross-section diagram - smaller */}
        <View ref={crossSectionRef} className="items-center my-3" collapsable={false}>
          <Text className="text-gray-700 text-xs font-semibold mb-2">
            Cross Section with Slippage Values
          </Text>
          {config.productType === '1048' ? (
            <CrossSection1048
              scale={6}
              activeStrands={activeStrandIndices || undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              slippages={slippages}
              showSlippageValues={true}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          ) : config.productType === '1248' ? (
            <CrossSection1248
              scale={6}
              activeStrands={activeStrandIndices || undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              slippages={slippages}
              showSlippageValues={true}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          ) : config.productType === '1250' ? (
            <CrossSection1250
              scale={6}
              activeStrands={activeStrandIndices || undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              slippages={slippages}
              showSlippageValues={true}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          ) : (
            <CrossSection8048
              scale={6}
              activeStrands={activeStrandIndices || undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              slippages={slippages}
              showSlippageValues={true}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          )}
        </View>

        {/* Cut-width info banner - more compact */}
        {config.productWidth && config.offcutSide && selectedPattern?.strandCoordinates && (
          <View className="px-6 mb-2">
            <View className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <View className="flex-row items-center">
                <Ionicons name="cut" size={16} color="#F59E0B" />
                <Text className="text-amber-900 text-xs ml-2">
                  Cut: {config.productWidth}" • {config.offcutSide} • {slippages.length}/{selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6} strands
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Slippage Statistics - more compact */}
        <View className="px-6">
          <Text className="text-gray-900 text-base font-semibold mb-2">
            Statistics
          </Text>

          {/* Total & Average side by side */}
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1 bg-blue-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium mb-0.5">
                Total Slippage
              </Text>
              <Text className="text-blue-600 text-lg font-bold">
                {slippageStats.anyValueExceeds && ">"}
                {slippageStats.totalSlippage.toFixed(3)}"
              </Text>
              <Text className="text-blue-600 text-xs">
                ≈{slippageStats.anyValueExceeds && ">"}{decimalToFraction(slippageStats.totalSlippage)}
              </Text>
            </View>

            <View className="flex-1 bg-orange-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium mb-0.5">
                Avg Slippage
              </Text>
              <Text className="text-orange-600 text-lg font-bold">
                {slippageStats.anyValueExceeds && ">"}
                {slippageStats.totalAvgSlippage.toFixed(3)}"
              </Text>
              <Text className="text-orange-600 text-xs">
                ≈{slippageStats.anyValueExceeds && ">"}{decimalToFraction(slippageStats.totalAvgSlippage)}
              </Text>
            </View>
          </View>

          {/* End Totals - compact */}
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1 bg-green-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium">END 1 Total</Text>
              <Text className="text-green-600 text-base font-bold">
                {slippageStats.anyEnd1Exceeds && ">"}
                {slippageStats.totalSlippageEnd1.toFixed(3)}"
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium">END 2 Total</Text>
              <Text className="text-purple-600 text-base font-bold">
                {slippageStats.anyEnd2Exceeds && ">"}
                {slippageStats.totalSlippageEnd2.toFixed(3)}"
              </Text>
            </View>
          </View>

          {/* End Averages - compact */}
          <View className="flex-row gap-2 mb-2">
            <View className="flex-1 bg-green-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium">END 1 Avg</Text>
              <Text className="text-green-600 text-base font-bold">
                {slippageStats.anyEnd1Exceeds && ">"}
                {slippageStats.totalAvgSlippageEnd1.toFixed(3)}"
              </Text>
            </View>

            <View className="flex-1 bg-purple-50 rounded-lg p-2.5">
              <Text className="text-gray-700 text-xs font-medium">END 2 Avg</Text>
              <Text className="text-purple-600 text-base font-bold">
                {slippageStats.anyEnd2Exceeds && ">"}
                {slippageStats.totalAvgSlippageEnd2.toFixed(3)}"
              </Text>
            </View>
          </View>

          {/* Per-Strand Details - more compact */}
          <View className="bg-gray-50 rounded-lg p-2.5 mb-3">
            <Text className="text-gray-700 text-xs font-semibold mb-2">
              By Strand
            </Text>
            {slippages.map((strand) => {
              const end1Value = parseMeasurementInput(strand.leftSlippage);
              const end2Value = parseMeasurementInput(strand.rightSlippage);
              // Use adjusted values: 1.0 if exceeds, otherwise use parsed value
              const e1 = strand.leftExceedsOne ? 1.0 : (end1Value ?? 0);
              const e2 = strand.rightExceedsOne ? 1.0 : (end2Value ?? 0);
              const strandTotal = e1 + e2;
              const hasExceeds = strand.leftExceedsOne || strand.rightExceedsOne;
              
              return (
                <View key={strand.strandId} className="mb-2 pb-2 border-b border-gray-300 last:border-b-0">
                  {/* Strand Header - inline */}
                  <View className="flex-row items-center justify-between mb-1.5">
                    <View className="flex-row items-center">
                      <View className="bg-red-500 rounded-full w-5 h-5 items-center justify-center mr-1.5">
                        <Text className="text-white font-bold text-xs">
                          {strand.strandId}
                        </Text>
                      </View>
                      <Text className="text-gray-900 text-xs font-semibold">
                        Strand {strand.strandId}
                        {getStrandSize(strand.strandId) && (
                          <Text className="text-gray-600 font-normal">
                            {' '}({getStrandSize(strand.strandId)})
                          </Text>
                        )}
                      </Text>
                    </View>
                    <View className="bg-blue-100 px-2 py-0.5 rounded">
                      <Text className="text-blue-700 text-xs font-bold">
                        {hasExceeds && ">"}Total: {strandTotal.toFixed(2)}"
                      </Text>
                    </View>
                  </View>
                  
                  {/* END 1 & END 2 - inline */}
                  <View className="flex-row gap-2 ml-6">
                    <View className="flex-1 bg-white rounded p-1.5 border border-green-200">
                      <Text className="text-gray-600 text-xs mb-0.5">E1</Text>
                      <Text className="text-green-600 text-xs font-bold">
                        {strand.leftExceedsOne ? '>1"' : (end1Value !== null && end1Value !== 0 ? `${end1Value.toFixed(3)}"` : '0"')}
                      </Text>
                    </View>
                    
                    <View className="flex-1 bg-white rounded p-1.5 border border-purple-200">
                      <Text className="text-gray-600 text-xs mb-0.5">E2</Text>
                      <Text className="text-purple-600 text-xs font-bold">
                        {strand.rightExceedsOne ? '>1"' : (end2Value !== null && end2Value !== 0 ? `${end2Value.toFixed(3)}"` : '0"')}
                      </Text>
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
            onPress={handleGeneratePDFReport}
            disabled={isGeneratingPDF}
          >
            <View className="flex-row items-center">
              <Ionicons name={isGeneratingPDF ? "hourglass-outline" : "document-text-outline"} size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">
                {isGeneratingPDF ? 'Generating PDF...' : 'Generate Report'}
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
