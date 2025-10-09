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
import Svg, { Line, Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { useStrandPatternStore } from "../state/strandPatternStore";

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

  // Calculate active strands based on product width (if coordinates exist)
  const activeStrandIndices = useMemo(() => {
    if (!selectedPattern || !selectedPattern.strandCoordinates || !config.productWidth) {
      // No coordinates or width provided, all strands are active
      return null;
    }

    const { strandCoordinates } = selectedPattern;
    const { productWidth } = config;

    // Filter strands where x coordinate <= product width
    const activeIndices: number[] = [];
    strandCoordinates.forEach((coord, index) => {
      if (coord.x <= productWidth) {
        activeIndices.push(index);
      }
    });

    return activeIndices;
  }, [selectedPattern, config.productWidth]);

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

  // 3D Isometric view of 8048 hollow-core plank with strands
  const GenericCrossSection = () => {
    const svgWidth = 380;
    const svgHeight = 320;

    // EXACT DIMENSIONS from specifications
    // Real: 8" tall x 48" wide
    // Scale factor for display - adjusted to fit screen
    const scale = 4; // 4 pixels per inch
    const plankWidth = 48 * scale; // 192px
    const plankHeight = 8 * scale; // 32px
    
    // Starting position for near face
    const startX = 30;
    const startY = 135;

    // Isometric angle offsets
    const depth = 180;
    const depthX = depth * 0.866;
    const depthY = depth * 0.5;

    // EXACT CORE DIMENSIONS
    const coreWidth = 5.5 * scale; // 22px
    const coreHeight = 5.625 * scale; // 22.5px
    const coreBottomFromPlankBottom = 1.1875 * scale; // 4.75px
    const edgeToCoreEdge = 2.625 * scale; // 10.5px
    const spacingBetweenCores = 1.9375 * scale; // 7.75px
    
    // Calculate core center positions
    const coreBottomY = plankHeight - coreBottomFromPlankBottom;
    const coreCenterY = coreBottomY - (coreHeight / 2);
    
    // First core center X position
    const firstCoreCenterX = edgeToCoreEdge + (coreWidth / 2);
    
    // Build array of 6 cores with exact spacing
    const cores = Array.from({ length: 6 }, (_, i) => ({
      cx: firstCoreCenterX + i * (coreWidth + spacingBetweenCores),
      cy: coreCenterY,
    }));

    // Traced SVG path from the provided core shape image
    // This is the EXACT shape traced from the user's drawing
    // Normalized to fit within a unit square (0-1), will be scaled to actual size
    const coreShapePath = `
      M 0.5 1
      L 0.75 0.93
      L 0.93 0.75
      L 1 0.5
      L 1 0.25
      C 1 0.11 0.89 0 0.5 0
      C 0.11 0 0 0.11 0 0.25
      L 0 0.5
      L 0.07 0.75
      L 0.25 0.93
      L 0.5 1
      Z
    `;

    // Helper function to place the core shape at a specific position and size
    const drawCore = (cx: number, cy: number) => {
      // Scale the normalized path to actual core dimensions
      // Transform: scale and translate to center at (cx, cy)
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

    // Strand positions (will add back later)
    const strandPositions: any[] = [];

    // Helper to draw the 8048 cross-section shape
    const drawCrossSection = (offsetX: number, offsetY: number, isHidden: boolean, solidTop: boolean = false, solidRight: boolean = false) => {
      const x = startX + offsetX;
      const y = startY + offsetY;
      
      // Keyway dimensions (on the SIDES, indenting IN) - larger and more rectangular
      const keywayWidth = 8; // Taller
      const keywayDepth = 3; // Deeper indent
      const keywayFromTop = 6;
      
      // Draft angle - WIDER at bottom, NARROWER at top (more subtle taper)
      const topInset = 2; // Reduced for more subtle draft angle
      const lipRadius = 4; // More pronounced rounded lips at bottom corners

      // Build separate paths for different stroke styles
      // Path 1: Left side and bottom
      let leftPath = `M ${x + lipRadius} ${y + plankHeight}`; // Start at bottom left after lip
      
      // Bottom left corner lip (pronounced curve)
      leftPath += ` Q ${x} ${y + plankHeight} ${x} ${y + plankHeight - lipRadius}`;
      
      // Up left side with draft angle (tapering IN toward top) to below keyway
      leftPath += ` L ${x + topInset} ${y + keywayFromTop + keywayWidth}`;
      
      // Left keyway (indent IN)
      leftPath += ` L ${x + topInset + keywayDepth} ${y + keywayFromTop + keywayWidth}`;
      leftPath += ` L ${x + topInset + keywayDepth} ${y + keywayFromTop}`;
      leftPath += ` L ${x + topInset} ${y + keywayFromTop}`;
      
      // Continue up to top left corner
      leftPath += ` L ${x + topInset} ${y}`;
      
      // Path 2: Just the top edge (may have different stroke style)
      const topPath = `M ${x + topInset} ${y} L ${x + plankWidth - topInset} ${y}`;
      
      // Path 3: Right side continuation
      let rightPath = `M ${x + plankWidth - topInset} ${y}`;
      
      // Down right side to keyway
      rightPath += ` L ${x + plankWidth - topInset} ${y + keywayFromTop}`;
      
      // Right keyway (indent IN)
      rightPath += ` L ${x + plankWidth - topInset - keywayDepth} ${y + keywayFromTop}`;
      rightPath += ` L ${x + plankWidth - topInset - keywayDepth} ${y + keywayFromTop + keywayWidth}`;
      rightPath += ` L ${x + plankWidth - topInset} ${y + keywayFromTop + keywayWidth}`;
      
      // Down right side with draft angle (tapering OUT toward bottom)
      rightPath += ` L ${x + plankWidth} ${y + plankHeight - lipRadius}`;
      
      // Bottom right corner lip (pronounced curve)
      rightPath += ` Q ${x + plankWidth} ${y + plankHeight} ${x + plankWidth - lipRadius} ${y + plankHeight}`;
      
      // Bottom edge back to start
      rightPath += ` L ${x + lipRadius} ${y + plankHeight}`;

      const leftStrokeDash = isHidden ? "3,3" : undefined;
      const topStrokeDash = solidTop ? undefined : (isHidden ? "3,3" : undefined);
      const rightStrokeDash = solidRight ? undefined : (isHidden ? "3,3" : undefined);

      return (
        <React.Fragment>
          {/* Left side and bottom outline */}
          <Path
            d={leftPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={leftStrokeDash}
            fill="none"
          />
          
          {/* Top edge - can be solid even when rest is hidden */}
          <Path
            d={topPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={topStrokeDash}
            fill="none"
          />
          
          {/* Right side outline - can be solid even when rest is hidden */}
          <Path
            d={rightPath}
            stroke="#2563EB"
            strokeWidth={2}
            strokeDasharray={rightStrokeDash}
            fill="none"
          />

          {/* Hollow cores */}
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
          {/* NEAR FACE (END 1) - SOLID (visible) */}
          {drawCrossSection(0, 0, false, false, false)}

          {/* FAR FACE (END 2) - DOTTED (hidden) BUT with SOLID top and SOLID right */}
          {drawCrossSection(depthX, -depthY, true, true, true)}

          {/* CONNECTING EDGES for 3D effect */}
          {/* Top left - SOLID (visible from this perspective) */}
          <Line
            x1={startX}
            y1={startY}
            x2={startX + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
          {/* Top right - SOLID (visible) */}
          <Line
            x1={startX + plankWidth}
            y1={startY}
            x2={startX + plankWidth + depthX}
            y2={startY - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
          {/* Bottom right - SOLID (visible) */}
          <Line
            x1={startX + plankWidth}
            y1={startY + plankHeight}
            x2={startX + plankWidth + depthX}
            y2={startY + plankHeight - depthY}
            stroke="#2563EB"
            strokeWidth={1.5}
          />
          {/* Bottom left - DOTTED (cannot be seen from this perspective) */}
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
        
        {/* Labels for ends */}
        <View className="flex-row justify-between w-full px-12 mt-2">
          <Text className="text-blue-600 text-xs font-bold">END 1 (Near)</Text>
          <Text className="text-blue-600 text-xs font-bold">END 2 (Far)</Text>
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

        {/* Cut-width info banner */}
        {activeStrandIndices !== null && selectedPattern && (
          <View className="px-6 mt-4">
            <View className="bg-green-50 border border-green-200 rounded-lg p-4">
              <View className="flex-row items-start">
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <View className="flex-1 ml-3">
                  <Text className="text-green-900 font-semibold text-sm mb-1">
                    Cut-Width Product Detected
                  </Text>
                  <Text className="text-green-800 text-sm">
                    Product width: {config.productWidth}" • {' '}
                    Active strands: {slippages.length} of {selectedPattern.strand_3_8 + selectedPattern.strand_1_2 + selectedPattern.strand_0_6}
                    {'\n'}
                    Only showing strands within the cut width.
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
