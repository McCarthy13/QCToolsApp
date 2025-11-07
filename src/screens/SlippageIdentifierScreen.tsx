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
import CrossSection1048 from "../components/CrossSection1048";
import CrossSection1248 from "../components/CrossSection1248";
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
  const { config } = route.params;
  const { customPatterns } = useStrandPatternStore();

  // Get the selected strand pattern
  const selectedPattern = customPatterns.find(p => p.id === config.strandPattern);

  // Calculate active strands based on product width and offcut side
  const activeStrandIndices = useMemo(() => {
    if (!selectedPattern || !selectedPattern.strandCoordinates || !config.productWidth || !config.offcutSide) {
      // No coordinates, width, or offcut side provided - all strands are active
      return null;
    }

    const { strandCoordinates } = selectedPattern;
    const { productWidth, offcutSide } = config;

    // The x coordinates are already positions in the full product (0" to 48")
    // Strands are at x=2" to x=46" within the 48" product
    const minX = Math.min(...strandCoordinates.map(c => c.x));
    const maxX = Math.max(...strandCoordinates.map(c => c.x));
    const fullProductWidth = maxX + 2; // Rightmost strand + 2" concrete cover

    console.log('[SlippageIdentifier] Calculating active strands:');
    console.log('  Strand positions:', `x=${minX}" to x=${maxX}"`);
    console.log('  Full product width:', fullProductWidth);
    console.log('  Cut product width:', productWidth);
    console.log('  Offcut side:', offcutSide);
    console.log('  Total strands:', strandCoordinates.length);

    // Filter strands based on which side to keep
    const activeIndices: number[] = [];
    strandCoordinates.forEach((coord, index) => {
      let isActive = false;

      if (offcutSide === 'L1') {
        // L1 is kept (left side) - keep strands from 0 to productWidth
        // Keep strands where x <= productWidth
        isActive = coord.x <= productWidth;
        console.log(`  Strand ${index + 1} at x=${coord.x}": ${isActive ? 'ACTIVE' : 'inactive'} (keeping 0-${productWidth}")`);
      } else if (offcutSide === 'L2') {
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
  }, [selectedPattern, config.productWidth, config.offcutSide]);

  // Calculate total strand count and initialize fields
  const initialSlippages = useMemo(() => {
    if (!selectedPattern) return [];
    
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
    const strands: StrandSlippage[] = [];
    for (const strandNum of activeStrands) {
      const strandSize = selectedPattern.strandSizes?.[strandNum - 1];
      strands.push({
        strandId: strandNum.toString(),
        leftSlippage: "0",
        rightSlippage: "0",
        leftExceedsOne: false,
        rightExceedsOne: false,
        size: strandSize,
      });
    }
    
    return strands;
  }, [selectedPattern, activeStrandIndices]);

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
        <View className="items-center my-4">
          <Text className="text-gray-700 text-xs font-semibold mb-2">
            Cross Section - {config.productType} Hollow Core Plank
          </Text>
          {config.productType === '1048' ? (
            <CrossSection1048
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          ) : config.productType === '1248' ? (
            <CrossSection1248
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          ) : config.productType === '1250' ? (
            <CrossSection1250
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          ) : config.productType === '1648' ? (
            <CrossSection1648
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          ) : config.productType === '1650' ? (
            <CrossSection1650
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          ) : (
            <CrossSection8048
              scale={6}
              activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : undefined}
              offcutSide={config.offcutSide || null}
              productWidth={config.productWidth}
              strandCoordinates={selectedPattern?.strandCoordinates}
            />
          )}
        </View>

        {/* Cut-width info banner */}
        {activeStrandIndices !== null && selectedPattern && config.offcutSide && (
          <View className="px-6 mb-3">
            <View className="bg-green-50 border border-green-200 rounded-lg p-3">
              <View className="flex-row items-start">
                <Ionicons name="cut" size={18} color="#10B981" />
                <View className="flex-1 ml-2">
                  <Text className="text-green-900 font-semibold text-xs mb-0.5">
                    Cut-Width Product
                  </Text>
                  <Text className="text-green-800 text-xs">
                    {config.productWidth}" • {config.offcutSide} ({config.offcutSide === 'L1' ? 'Left removed' : 'Right removed'}) • {slippages.length}/{selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6} strands
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Slippage inputs for each strand */}
        <View className="px-6">
          <Text className="text-gray-900 text-base font-semibold mb-2">
            {activeStrandIndices === null ? 'Slippage Values' : 'Slippage Values (Active Strands)'}
          </Text>

          {slippages.map((strand, index) => (
            <View
              key={strand.strandId}
              className="bg-gray-50 rounded-lg p-3 mb-2 border border-gray-200"
            >
              {/* Strand header - more compact */}
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center">
                  <View className="bg-red-500 rounded-full w-6 h-6 items-center justify-center mr-2">
                    <Text className="text-white font-bold text-xs">
                      {strand.strandId}
                    </Text>
                  </View>
                  <Text className="text-gray-900 font-semibold text-sm">
                    Strand {strand.strandId}
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
