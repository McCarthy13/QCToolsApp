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
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { useStrandPatternStore } from "../state/strandPatternStore";
import CrossSection8048 from "../components/CrossSection8048";
import CrossSection1047 from "../components/CrossSection1047";
import CrossSection1247 from "../components/CrossSection1247";
import CrossSection1250 from "../components/CrossSection1250";
import CrossSection1648 from "../components/CrossSection1648";
import CrossSection1650 from "../components/CrossSection1650";

type SlippageIdentifierScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "SlippageIdentifier"
>;
type SlippageIdentifierScreenRouteProp = RouteProp<
  RootStackParamList,
  "SlippageIdentifier"
>;

interface Props {
  navigation: SlippageIdentifierScreenNavigationProp;
  route: SlippageIdentifierScreenRouteProp;
}

interface StrandSlippage {
  strandId: string;
  leftSlippage: string;
  rightSlippage: string;
  leftExceedsOne: boolean;
  rightExceedsOne: boolean;
  size?: '3/8' | '1/2' | '0.6'; // Strand size from pattern
}

export default function SlippageIdentifierScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { config, editMode, existingSlippages, recordId } = route.params;
  const { customPatterns } = useStrandPatternStore();

  // Get the selected strand patterns (bottom and optionally top)
  const selectedPattern = customPatterns.find(p => p.id === config.strandPattern);
  const selectedTopPattern = config.topStrandPattern
    ? customPatterns.find(p => p.id === config.topStrandPattern)
    : undefined;

  // Calculate active strands based on product width and product side
  const activeStrandIndices = useMemo(() => {
    if (!selectedPattern || !selectedPattern.strandCoordinates || !config.productWidth || !config.productSide) {
      // No coordinates, width, or product side provided - all strands are active
      return null;
    }

    const { strandCoordinates } = selectedPattern;
    const { productWidth, productSide } = config;

    // The x coordinates are already positions in the full product (0" to 48")
    // Strands are at x=2" to x=46" within the 48" product
    const minX = Math.min(...strandCoordinates.map(c => c.x));
    const maxX = Math.max(...strandCoordinates.map(c => c.x));
    const fullProductWidth = maxX + 2; // Rightmost strand + 2" concrete cover

    console.log('[SlippageIdentifier] Calculating active strands:');
    console.log('  Strand positions:', `x=${minX}" to x=${maxX}"`);
    console.log('  Full product width:', fullProductWidth);
    console.log('  Cut product width:', productWidth);
    console.log('  Product side:', productSide);
    console.log('  Total strands:', strandCoordinates.length);

    // Filter strands based on which side to keep
    const activeIndices: number[] = [];
    strandCoordinates.forEach((coord, index) => {
      let isActive = false;

      if (productSide === 'L1') {
        // L1 is kept (left side) - keep strands from 0 to productWidth
        // Keep strands where x <= productWidth
        isActive = coord.x <= productWidth;
        console.log(`  Strand ${index + 1} at x=${coord.x}": ${isActive ? 'ACTIVE' : 'inactive'} (keeping 0-${productWidth}")`);
      } else if (productSide === 'L2') {
        // L2 is kept (right side) - keep strands from (fullProductWidth - productWidth) to fullProductWidth
        const cutPosition = fullProductWidth - productWidth;
        isActive = coord.x >= cutPosition;
        console.log(`  Strand ${index + 1} at x=${coord.x}": ${isActive ? 'ACTIVE' : 'inactive'} (keeping ${cutPosition}-${fullProductWidth}")`);
      }

      if (isActive) {
        activeIndices.push(index);
      }
    });

    console.log('[SlippageIdentifier] Active strand count:', activeIndices.length);
    console.log('[SlippageIdentifier] Active strand indices:', activeIndices);

    return activeIndices;
  }, [selectedPattern, config.productWidth, config.productSide]);

  // Calculate total strand count and initialize fields
  const initialSlippages = useMemo(() => {
    // If we're in edit mode and have existing slippages, use those
    if (editMode && existingSlippages) {
      // Need to add the size field from the strand patterns
      return existingSlippages.map(slip => {
        const isTopStrand = slip.strandId.startsWith('T');
        const isBottomStrand = slip.strandId.startsWith('B');
        const numericId = isTopStrand || isBottomStrand
          ? slip.strandId.substring(1)
          : slip.strandId;
        const index = parseInt(numericId) - 1;
        const pattern = isTopStrand ? selectedTopPattern : selectedPattern;
        const size = pattern?.strandSizes?.[index];

        return {
          ...slip,
          size: size,
        };
      });
    }

    // Otherwise, create initial slippages from scratch
    const strands: StrandSlippage[] = [];

    // Add bottom strands
    if (selectedPattern) {
      const totalCount = selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6;

      // Determine which strands are active based on activeStrandIndices
      let activeStrands: number[];

      if (activeStrandIndices === null) {
        // No filtering - all strands are active
        activeStrands = Array.from({ length: totalCount }, (_, i) => i + 1);
      } else {
        // Convert 0-based indices to 1-based strand numbers
        activeStrands = activeStrandIndices.map(idx => idx + 1);
      }

      // Create array of strands with their sizes - only for active strands
      for (const strandNum of activeStrands) {
        const strandSize = selectedPattern.strandSizes?.[strandNum - 1];
        strands.push({
          strandId: `B${strandNum}`, // B prefix for bottom strands
          leftSlippage: "0",
          rightSlippage: "0",
          leftExceedsOne: false,
          rightExceedsOne: false,
          size: strandSize,
        });
      }
    }

    // Add top strands
    if (selectedTopPattern) {
      const totalTopCount = selectedTopPattern.strand_3_8 + selectedTopPattern.strand_1_2 + selectedTopPattern.strand_0_6;

      // For top strands, use all strands (no cut-width filtering for now)
      // TODO: Implement cut-width filtering for top strands if needed
      for (let i = 1; i <= totalTopCount; i++) {
        const strandSize = selectedTopPattern.strandSizes?.[i - 1];
        strands.push({
          strandId: `T${i}`, // T prefix for top strands
          leftSlippage: "0",
          rightSlippage: "0",
          leftExceedsOne: false,
          rightExceedsOne: false,
          size: strandSize,
        });
      }
    }

    return strands;
  }, [selectedPattern, selectedTopPattern, activeStrandIndices, editMode, existingSlippages]);

  const [slippages, setSlippages] = useState<StrandSlippage[]>(initialSlippages);

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

  const handleFocus = (
    strandId: string,
    side: "left" | "right"
  ) => {
    // Clear "0" when user focuses on the field
    setSlippages((prev) =>
      prev.map((s) => {
        if (s.strandId === strandId) {
          const currentValue = side === "left" ? s.leftSlippage : s.rightSlippage;
          if (currentValue === "0") {
            return {
              ...s,
              [side === "left" ? "leftSlippage" : "rightSlippage"]: "",
            };
          }
        }
        return s;
      })
    );
  };

  const handleBlur = (
    strandId: string,
    side: "left" | "right"
  ) => {
    // Revert to "0" if empty when user leaves the field
    setSlippages((prev) =>
      prev.map((s) => {
        if (s.strandId === strandId) {
          const currentValue = side === "left" ? s.leftSlippage : s.rightSlippage;
          if (currentValue.trim() === "") {
            return {
              ...s,
              [side === "left" ? "leftSlippage" : "rightSlippage"]: "0",
            };
          }
        }
        return s;
      })
    );
  };

  const toggleExceedsOne = (
    strandId: string,
    side: "left" | "right"
  ) => {
    setSlippages((prev) =>
      prev.map((s) =>
        s.strandId === strandId
          ? {
              ...s,
              [side === "left" ? "leftExceedsOne" : "rightExceedsOne"]: !s[side === "left" ? "leftExceedsOne" : "rightExceedsOne"],
            }
          : s
      )
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
        <View className="items-center my-4" style={{ overflow: 'visible', minHeight: 200 }}>
          <Text className="text-gray-700 text-xs font-semibold mb-2">
            Cross Section - {config.productType} Hollow Core Plank
          </Text>
          {config.productType === '1047' ? (
            <CrossSection1047
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          ) : config.productType === '1247' ? (
            <CrossSection1247
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          ) : config.productType === '1250' ? (
            <CrossSection1250
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          ) : config.productType === '1648' ? (
            <CrossSection1648
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          ) : config.productType === '1650' ? (
            <CrossSection1650
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          ) : (
            <CrossSection8048
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              productSide={config.productSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
              bottomStrandSizes={selectedPattern?.strandSizes}
              topStrandCoordinates={selectedTopPattern?.strandCoordinates}
              topStrandSizes={selectedTopPattern?.strandSizes}
            />
          )}
        </View>

        {/* Cut-width info banner */}
        {activeStrandIndices !== null && selectedPattern && config.productSide && (
          <View className="px-6 mb-3">
            <View className="bg-green-50 border border-green-200 rounded-lg p-3">
              <View className="flex-row items-start">
                <Ionicons name="cut" size={18} color="#10B981" />
                <View className="flex-1 ml-2">
                  <Text className="text-green-900 font-semibold text-xs mb-0.5">
                    Cut-Width Product
                  </Text>
                  <Text className="text-green-800 text-xs">
                    {config.productWidth}" • {config.productSide} ({config.productSide === 'L1' ? 'Left side' : 'Right side'}) • {slippages.length}/{selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6} strands
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Slippage inputs for each strand */}
        <View className="px-6">
          {/* Bottom Strands Section */}
          {slippages.some(s => s.strandId.startsWith('B')) && (
            <>
              <Text className="text-gray-900 text-base font-semibold mb-2">
                Bottom Strands {activeStrandIndices === null ? '' : '(Active Strands)'}
              </Text>

              {slippages.filter(s => s.strandId.startsWith('B')).map((strand, index) => (
                <View
                  key={strand.strandId}
                  className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200"
                >
                  {/* Strand header - more compact */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="bg-green-600 rounded-full w-6 h-6 items-center justify-center mr-2">
                        <Text className="text-white font-bold text-xs">
                          {strand.strandId.substring(1)}
                        </Text>
                      </View>
                      <Text className="text-gray-900 font-semibold text-sm">
                        Bottom Strand {strand.strandId.substring(1)}
                        {strand.size && (
                          <Text className="text-gray-600 font-normal text-xs">
                            {' '}({strand.size}")
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                    {/* End 1 */}
                    <View className="flex-1">
                      <Text className="text-xs font-medium text-gray-600 mb-1">
                        END 1
                      </Text>
                      <TextInput
                        className={`bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm mb-1 ${
                          strand.leftExceedsOne
                            ? "text-orange-600 font-bold"
                            : "text-gray-900"
                        }`}
                        placeholder="0.5"
                        placeholderTextColor="#9CA3AF"
                        cursorColor="#000000"
                        value={strand.leftExceedsOne ? ">1\"" : strand.leftSlippage}
                        onChangeText={(text) =>
                          updateSlippage(strand.strandId, "left", text)
                        }
                        onFocus={() => handleFocus(strand.strandId, "left")}
                        onBlur={() => handleBlur(strand.strandId, "left")}
                        editable={!strand.leftExceedsOne}
                        keyboardType="default"
                      />
                      <Pressable
                        className="flex-row items-center"
                        onPress={() => toggleExceedsOne(strand.strandId, "left")}
                      >
                        <View
                          className={`w-4 h-4 rounded border-2 mr-1.5 items-center justify-center ${
                            strand.leftExceedsOne
                              ? "bg-orange-500 border-orange-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {strand.leftExceedsOne && (
                            <Text className="text-white text-xs font-bold">✓</Text>
                          )}
                        </View>
                        <Text className="text-gray-700 text-xs">
                          {'>1"'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* End 2 */}
                    <View className="flex-1">
                      <Text className="text-xs font-medium text-gray-600 mb-1">
                        END 2
                      </Text>
                      <TextInput
                        className={`bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm mb-1 ${
                          strand.rightExceedsOne
                            ? "text-orange-600 font-bold"
                            : "text-gray-900"
                        }`}
                        placeholder="0.5"
                        placeholderTextColor="#9CA3AF"
                        cursorColor="#000000"
                        value={strand.rightExceedsOne ? ">1\"" : strand.rightSlippage}
                        onChangeText={(text) =>
                          updateSlippage(strand.strandId, "right", text)
                        }
                        onFocus={() => handleFocus(strand.strandId, "right")}
                        onBlur={() => handleBlur(strand.strandId, "right")}
                        editable={!strand.rightExceedsOne}
                        keyboardType="default"
                      />
                      <Pressable
                        className="flex-row items-center"
                        onPress={() => toggleExceedsOne(strand.strandId, "right")}
                      >
                        <View
                          className={`w-4 h-4 rounded border-2 mr-1.5 items-center justify-center ${
                            strand.rightExceedsOne
                              ? "bg-orange-500 border-orange-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {strand.rightExceedsOne && (
                            <Text className="text-white text-xs font-bold">✓</Text>
                          )}
                        </View>
                        <Text className="text-gray-700 text-xs">
                          {'>1"'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Top Strands Section */}
          {slippages.some(s => s.strandId.startsWith('T')) && (
            <>
              <Text className="text-gray-900 text-base font-semibold mb-2 mt-4">
                Top Strands
              </Text>

              {slippages.filter(s => s.strandId.startsWith('T')).map((strand, index) => (
                <View
                  key={strand.strandId}
                  className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200"
                >
                  {/* Strand header - more compact */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center">
                      <View className="bg-blue-600 rounded-full w-6 h-6 items-center justify-center mr-2">
                        <Text className="text-white font-bold text-xs">
                          {strand.strandId.substring(1)}
                        </Text>
                      </View>
                      <Text className="text-gray-900 font-semibold text-sm">
                        Top Strand {strand.strandId.substring(1)}
                        {strand.size && (
                          <Text className="text-gray-600 font-normal text-xs">
                            {' '}({strand.size}")
                          </Text>
                        )}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row gap-2">
                    {/* End 1 */}
                    <View className="flex-1">
                      <Text className="text-xs font-medium text-gray-600 mb-1">
                        END 1
                      </Text>
                      <TextInput
                        className={`bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm mb-1 ${
                          strand.leftExceedsOne
                            ? "text-orange-600 font-bold"
                            : "text-gray-900"
                        }`}
                        placeholder="0.5"
                        placeholderTextColor="#9CA3AF"
                        cursorColor="#000000"
                        value={strand.leftExceedsOne ? ">1\"" : strand.leftSlippage}
                        onChangeText={(text) =>
                          updateSlippage(strand.strandId, "left", text)
                        }
                        onFocus={() => handleFocus(strand.strandId, "left")}
                        onBlur={() => handleBlur(strand.strandId, "left")}
                        editable={!strand.leftExceedsOne}
                        keyboardType="default"
                      />
                      <Pressable
                        className="flex-row items-center"
                        onPress={() => toggleExceedsOne(strand.strandId, "left")}
                      >
                        <View
                          className={`w-4 h-4 rounded border-2 mr-1.5 items-center justify-center ${
                            strand.leftExceedsOne
                              ? "bg-orange-500 border-orange-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {strand.leftExceedsOne && (
                            <Text className="text-white text-xs font-bold">✓</Text>
                          )}
                        </View>
                        <Text className="text-gray-700 text-xs">
                          {'>1"'}
                        </Text>
                      </Pressable>
                    </View>

                    {/* End 2 */}
                    <View className="flex-1">
                      <Text className="text-xs font-medium text-gray-600 mb-1">
                        END 2
                      </Text>
                      <TextInput
                        className={`bg-white border border-gray-300 rounded-lg px-2 py-2 text-sm mb-1 ${
                          strand.rightExceedsOne
                            ? "text-orange-600 font-bold"
                            : "text-gray-900"
                        }`}
                        placeholder="0.5"
                        placeholderTextColor="#9CA3AF"
                        cursorColor="#000000"
                        value={strand.rightExceedsOne ? ">1\"" : strand.rightSlippage}
                        onChangeText={(text) =>
                          updateSlippage(strand.strandId, "right", text)
                        }
                        onFocus={() => handleFocus(strand.strandId, "right")}
                        onBlur={() => handleBlur(strand.strandId, "right")}
                        editable={!strand.rightExceedsOne}
                        keyboardType="default"
                      />
                      <Pressable
                        className="flex-row items-center"
                        onPress={() => toggleExceedsOne(strand.strandId, "right")}
                      >
                        <View
                          className={`w-4 h-4 rounded border-2 mr-1.5 items-center justify-center ${
                            strand.rightExceedsOne
                              ? "bg-orange-500 border-orange-500"
                              : "bg-white border-gray-300"
                          }`}
                        >
                          {strand.rightExceedsOne && (
                            <Text className="text-white text-xs font-bold">✓</Text>
                          )}
                        </View>
                        <Text className="text-gray-700 text-xs">
                          {'>1"'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Calculate button */}
          <Pressable
            className="bg-blue-500 rounded-xl py-3 items-center active:bg-blue-600 mt-2"
            onPress={() => navigation.navigate("SlippageSummary", { slippages, config })}
          >
            <Text className="text-white text-sm font-semibold">
              Calculate Results
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
