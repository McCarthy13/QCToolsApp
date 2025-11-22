import React, { useMemo, useState, useRef } from "react";
import { View, Text, ScrollView, Pressable, Alert, Platform } from "react-native";
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
import CrossSection1047 from "../components/CrossSection1047";
import CrossSection1247 from "../components/CrossSection1247";
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

  // Get the selected strand patterns (bottom and optionally top)
  const selectedPattern = customPatterns.find(p => p.id === config.strandPattern);
  const selectedTopPattern = config.topStrandPattern
    ? customPatterns.find(p => p.id === config.topStrandPattern)
    : undefined;

  // Helper to get strand size by position
  const getStrandSize = (strandId: string): string => {
    // Check if it's a top strand (starts with T) or bottom strand (starts with B or is just a number)
    const isTopStrand = strandId.startsWith('T');
    const isBottomStrand = strandId.startsWith('B');

    // Extract the numeric part (remove T or B prefix if present)
    const numericId = isTopStrand || isBottomStrand
      ? strandId.substring(1)
      : strandId;
    const index = parseInt(numericId) - 1;

    // Get size from the appropriate pattern
    const pattern = isTopStrand ? selectedTopPattern : selectedPattern;
    const size = pattern?.strandSizes?.[index];
    return size ? `${size}"` : '';
  };

  // Save and publish handlers
  const handleSave = () => {
    console.log('[SlippageSummaryScreen] Current user object:', JSON.stringify(currentUser, null, 2));
    console.log('[SlippageSummaryScreen] Current user ID:', currentUser?.id);
    console.log('[SlippageSummaryScreen] Current user email:', currentUser?.email);

    const record: SlippageRecord = {
      id: `slippage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      slippages,
      config,
      createdBy: currentUser?.email || 'Unknown',
      userId: currentUser?.id || '',
    };

    console.log('[SlippageSummaryScreen] Created record with userId:', record.userId);
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
      userId: currentUser?.id || '',
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
      const isWeb = Platform.OS === 'web';

      if (crossSectionRef.current) {
        try {
          console.log('[PDF] Capturing cross-section...');
          console.log('[PDF] Platform:', isWeb ? 'web' : 'native');
          console.log('[PDF] crossSectionRef.current exists:', !!crossSectionRef.current);

          if (isWeb) {
            // On web, we need to use html2canvas directly since captureRef doesn't work
            console.log('[PDF] Using html2canvas for web...');

            // Dynamically import html2canvas
            const html2canvas = await import('html2canvas');

            // Find the actual DOM element - the ref.current might be a React Native component wrapper
            // We need to find the actual div element
            let element = crossSectionRef.current as any;

            // If it's a React Native component, try to get the underlying DOM element
            if (element._nativeTag || element._internalFiberInstanceHandleDEV) {
              // Try to find the rendered DOM element
              const container = document.querySelector('[data-testid="cross-section-container"]');
              if (container) {
                element = container;
                console.log('[PDF] Found cross-section container via selector');
              }
            }

            console.log('[PDF] Capturing element:', element);

            const canvas = await html2canvas.default(element, {
              scale: 2,
              useCORS: true,
              allowTaint: true,
              backgroundColor: '#ffffff',
              logging: false,
            });

            crossSectionImageUri = canvas.toDataURL('image/png');
            console.log('[PDF] Cross-section captured successfully via html2canvas');
            console.log('[PDF] Image URI length:', crossSectionImageUri?.length);
          } else {
            // On native, use captureRef
            crossSectionImageUri = await captureRef(crossSectionRef, {
              format: 'png',
              quality: 0.8,
            });
            console.log('[PDF] Cross-section captured successfully via captureRef');
          }
        } catch (captureError) {
          console.error('[PDF] Error capturing cross-section:', captureError);
          console.log('[PDF] Continuing without cross-section image');
          // Continue without the image if capture fails
          crossSectionImageUri = undefined;
        }
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
        strandPatternName: selectedPattern?.name,
      });

      if (filePath) {
        console.log('[PDF] PDF generated successfully:', filePath);

        // Handle different web responses
        if (filePath === 'web-pdf-downloaded') {
          console.log('[PDF] PDF downloaded successfully on web');
          Alert.alert(
            'PDF Downloaded',
            'The slippage report has been downloaded to your Downloads folder.'
          );
        } else if (filePath === 'web-print-dialog-opened') {
          console.log('[PDF] Web print dialog opened - user can save as PDF from browser');
          Alert.alert(
            'Print Dialog Opened',
            'Use your browser\'s print dialog to save the report as PDF. Select "Save as PDF" as the printer destination.'
          );
        } else {
          // On native platforms, share the PDF file
          await sharePDF(filePath);
          console.log('[PDF] PDF shared successfully');
        }
      } else {
        console.log('[PDF] Failed to generate PDF - no file path returned');
        Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
      }
    } catch (error) {
      console.error('[PDF] Error generating/sharing PDF:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[PDF] Error details:', errorMessage);

      // Provide more helpful error message
      if (errorMessage.includes('C++') || errorMessage.includes('exception')) {
        Alert.alert(
          'PDF Generation Error',
          'There was an issue processing the image. The PDF may have been generated without the cross-section diagram. Please try again.'
        );
      } else {
        Alert.alert('Error', `Failed to generate or share PDF report: ${errorMessage}`);
      }
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
    if (!selectedPattern || !selectedPattern.strandCoordinates || !config.productWidth || !config.productSide) {
      return null;
    }

    const { strandCoordinates } = selectedPattern;
    const { productWidth, productSide } = config;

    // The x coordinates are already positions in the full product (0" to 48")
    // Strands are at x=2" to x=46" within the 48" product
    const minX = Math.min(...strandCoordinates.map(c => c.x));
    const maxX = Math.max(...strandCoordinates.map(c => c.x));
    const fullProductWidth = maxX + 2; // Rightmost strand + 2" concrete cover

    console.log('[SlippageSummary] Calculating active strands:');
    console.log('  Strand positions:', `x=${minX}" to x=${maxX}"`);
    console.log('  Full product width:', fullProductWidth);
    console.log('  Cut product width:', productWidth);
    console.log('  Product side:', productSide);
    console.log('  Total strands:', strandCoordinates.length);

    const activeIndices: number[] = [];
    strandCoordinates.forEach((coord, index) => {
      let isActive = false;
      if (productSide === 'L1') {
        // L1 is kept (left side) - keep strands from 0 to productWidth
        isActive = coord.x <= productWidth;
        console.log(`  Strand ${index + 1} at x=${coord.x}": ${isActive ? 'ACTIVE' : 'inactive'} (keeping 0-${productWidth}")`);
      } else if (productSide === 'L2') {
        // L2 is kept (right side) - keep strands from (fullProductWidth - productWidth) to fullProductWidth
        const cutPosition = fullProductWidth - productWidth;
        isActive = coord.x >= cutPosition;
        console.log(`  Strand ${index + 1} at x=${coord.x}": ${isActive ? 'ACTIVE' : 'inactive'} (keeping ${cutPosition}-${fullProductWidth}")`);
      }
      if (isActive) {
        activeIndices.push(index + 1); // Convert to 1-based
      }
    });

    console.log('[SlippageSummary] Active strand count:', activeIndices.length);
    console.log('[SlippageSummary] Active strand indices:', activeIndices);

    return activeIndices;
  }, [selectedPattern, config.productWidth, config.productSide]);

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
        <View
          ref={crossSectionRef}
          className="items-center my-3"
          style={{ overflow: 'visible', minHeight: 200 }}
          collapsable={false}
          // @ts-ignore - data-testid is not in React Native types but works on web
          data-testid="cross-section-container"
        >
          <Text className="text-gray-700 text-xs font-semibold mb-2">
            Cross Section with Slippage Values
          </Text>
          {config.productType === '1047' ? (
            <CrossSection1047
              scale={6}
              activeStrands={activeStrandIndices || undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              slippages={slippages}
              showSlippageValues={true}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          ) : config.productType === '1247' ? (
            <CrossSection1247
              scale={6}
              activeStrands={activeStrandIndices || undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              slippages={slippages}
              showSlippageValues={true}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          ) : config.productType === '1250' ? (
            <CrossSection1250
              scale={6}
              activeStrands={activeStrandIndices || undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              slippages={slippages}
              showSlippageValues={true}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          ) : (
            <CrossSection8048
              scale={6}
              activeStrands={activeStrandIndices || undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              slippages={slippages}
              showSlippageValues={true}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          )}
        </View>

        {/* Cut-width info banner - more compact */}
        {config.productWidth && config.productSide && selectedPattern?.strandCoordinates && (
          <View className="px-6 mb-2">
            <View className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
              <View className="flex-row items-center">
                <Ionicons name="cut" size={16} color="#F59E0B" />
                <Text className="text-amber-900 text-xs ml-2">
                  Cut: {config.productWidth}" • {config.productSide} • {slippages.length}/{selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6} strands
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

          {/* Per-Strand Details - separated by bottom/top */}
          <View className="bg-gray-50 rounded-lg p-2.5 mb-3">
            <Text className="text-gray-700 text-xs font-semibold mb-2">
              By Strand
            </Text>

            {/* Bottom Strands */}
            {slippages.some(s => s.strandId.startsWith('B')) && (
              <>
                <Text className="text-gray-600 text-xs font-semibold mb-1.5">
                  Bottom Strands
                </Text>
                {slippages.filter(s => s.strandId.startsWith('B')).map((strand) => {
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
                          <View className="bg-green-600 rounded-full w-5 h-5 items-center justify-center mr-1.5">
                            <Text className="text-white font-bold text-xs">
                              {strand.strandId.substring(1)}
                            </Text>
                          </View>
                          <Text className="text-gray-900 text-xs font-semibold">
                            Bottom Strand {strand.strandId.substring(1)}
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
              </>
            )}

            {/* Top Strands */}
            {slippages.some(s => s.strandId.startsWith('T')) && (
              <>
                <Text className="text-gray-600 text-xs font-semibold mb-1.5 mt-2">
                  Top Strands
                </Text>
                {slippages.filter(s => s.strandId.startsWith('T')).map((strand) => {
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
                          <View className="bg-blue-600 rounded-full w-5 h-5 items-center justify-center mr-1.5">
                            <Text className="text-white font-bold text-xs">
                              {strand.strandId.substring(1)}
                            </Text>
                          </View>
                          <Text className="text-gray-900 text-xs font-semibold">
                            Top Strand {strand.strandId.substring(1)}
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
              </>
            )}
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
