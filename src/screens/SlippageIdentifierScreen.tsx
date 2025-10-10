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

    // Calculate full width from max x coordinate
    const fullWidth = Math.max(...strandCoordinates.map(c => c.x));

    // Filter strands based on which side was cut off
    const activeIndices: number[] = [];
    strandCoordinates.forEach((coord, index) => {
      let isActive = false;

      if (offcutSide === 'L1') {
        // L1 (Left) was cut off - keep right side (strands near L2)
        // Keep strands where x >= (fullWidth - productWidth)
        isActive = coord.x >= (fullWidth - productWidth);
      } else if (offcutSide === 'L2') {
        // L2 (Right) was cut off - keep left side (strands near L1)
        // Keep strands where x <= productWidth
        isActive = coord.x <= productWidth;
      }

      if (isActive) {
        activeIndices.push(index);
      }
    });

    return activeIndices;
  }, [selectedPattern, config.productWidth, config.offcutSide]);

  // Calculate total strand count and initialize fields
  const initialSlippages = useMemo(() => {
    if (!selectedPattern) return [];
    
    const totalCount = selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6;
    
    // Create array of strands with their sizes - default to "0"
    const strands: StrandSlippage[] = [];
    for (let i = 1; i <= totalCount; i++) {
      const strandSize = selectedPattern.strandSizes?.[i - 1];
      const isActive = activeStrandIndices === null || activeStrandIndices.includes(i - 1);
      
      // Only include active strands
      if (isActive) {
        strands.push({
          strandId: i.toString(),
          leftSlippage: "0",
          rightSlippage: "0",
          leftExceedsOne: false,
          rightExceedsOne: false,
          size: strandSize,
        });
      }
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
        <View className="items-center my-6">
          <Text className="text-gray-700 text-sm font-semibold mb-4">
            Cross Section - 8048 Hollow Core Plank
          </Text>
          <CrossSection8048
            scale={8}
            activeStrands={activeStrandIndices !== null ? activeStrandIndices.map(i => i + 1) : [1, 2, 3, 4, 5, 6, 7]}
            offcutSide={config.offcutSide || null}
            productWidth={config.productWidth}
          />
        </View>

        {/* Cut-width info banner */}
        {activeStrandIndices !== null && selectedPattern && config.offcutSide && (
          <View className="px-6 mt-4">
            <View className="bg-green-50 border border-green-200 rounded-lg p-4">
              <View className="flex-row items-start">
                <Ionicons name="cut" size={20} color="#10B981" />
                <View className="flex-1 ml-3">
                  <Text className="text-green-900 font-semibold text-sm mb-1">
                    Cut-Width Product
                  </Text>
                  <Text className="text-green-800 text-sm">
                    Width: {config.productWidth}" • {' '}
                    Offcut Side: {config.offcutSide} ({config.offcutSide === 'L1' ? 'Left removed, keeping right' : 'Right removed, keeping left'})
                    {'\n'}
                    Active strands: {slippages.length} of {selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Slippage inputs for each strand */}
        <View className="px-6">{activeStrandIndices === null ? (
          <Text className="text-gray-900 text-lg font-semibold mb-4">
            Slippage Values
          </Text>
        ) : (
          <Text className="text-gray-900 text-lg font-semibold mb-4 mt-4">
            Slippage Values (Active Strands Only)
          </Text>
        )}

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
                  {strand.size && (
                    <Text className="text-gray-600 font-normal text-sm">
                      {' '}({strand.size}")
                    </Text>
                  )}
                </Text>
              </View>

              <View className="flex-row gap-3">
                {/* End 1 */}
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-gray-600 mb-2">
                    END 1
                  </Text>
                  <TextInput
                    className={`bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base mb-2 ${
                      strand.leftExceedsOne 
                        ? "text-orange-600 font-bold" 
                        : "text-gray-900"
                    }`}
                    placeholder='0.5 or 5/16"'
                    placeholderTextColor="#9CA3AF"
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
                      className={`w-5 h-5 rounded border-2 mr-2 items-center justify-center ${
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
                  <Text className="text-xs font-semibold text-gray-600 mb-2">
                    END 2
                  </Text>
                  <TextInput
                    className={`bg-white border border-gray-300 rounded-lg px-3 py-2.5 text-base mb-2 ${
                      strand.rightExceedsOne 
                        ? "text-orange-600 font-bold" 
                        : "text-gray-900"
                    }`}
                    placeholder='0.5 or 5/16"'
                    placeholderTextColor="#9CA3AF"
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
                      className={`w-5 h-5 rounded border-2 mr-2 items-center justify-center ${
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
            className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600 mt-4"
            onPress={() => navigation.navigate("SlippageSummary", { slippages, config })}
          >
            <Text className="text-white text-base font-semibold">
              Calculate Results
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
