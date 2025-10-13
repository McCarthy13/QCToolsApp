import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import { useStrandLibraryStore } from "../state/strandLibraryStore";
import { calculateTheoreticalElongation, formatValue } from "../utils/stressing-calculations";

type StressingResultsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "StressingResults"
>;
type StressingResultsScreenRouteProp = RouteProp<
  RootStackParamList,
  "StressingResults"
>;

interface Props {
  navigation: StressingResultsScreenNavigationProp;
  route: StressingResultsScreenRouteProp;
}

export default function StressingResultsScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const inputs = route.params;
  
  // Get strand from library
  const getStrandById = useStrandLibraryStore((state) => state.getStrandById);
  const strand = getStrandById(inputs.strandId);

  // Calculate elongation
  const results = useMemo(() => {
    if (!strand) {
      return null;
    }

    // Convert bed length from feet to inches
    const bedLengthInches = inputs.bedLength * 12;

    // Calculate force per strand
    const forcePerStrand = inputs.jackingForce / inputs.numberOfStrands;

    // Calculate stress per strand
    const stressPerStrand = forcePerStrand / strand.area;

    // Calculate theoretical elongation for one strand
    const theoreticalElongation = calculateTheoreticalElongation(
      forcePerStrand,
      bedLengthInches,
      strand.area,
      strand.elasticModulus
    );

    // Bed shortening (elastic compression of the bed during stressing)
    const bedShortening = inputs.bedShortening || 0;

    // Friction loss (typically 0.5-2% of length for long beds)
    const frictionLossPercent = inputs.frictionLoss || 0;
    const frictionLoss = (frictionLossPercent / 100) * theoreticalElongation;

    // Anchor set loss (slip at anchorage during lock-off)
    const anchorSetLoss = inputs.anchorSetLoss || 0;

    // Total elongation = theoretical + bed shortening - friction - anchor set
    const totalElongation =
      theoreticalElongation + bedShortening - frictionLoss - anchorSetLoss;

    return {
      theoreticalElongation,
      bedShortening,
      frictionLoss,
      anchorSetLoss,
      totalElongation,
      forcePerStrand,
      stressPerStrand,
    };
  }, [inputs, strand]);

  if (!strand || !results) {
    return (
      <View className="flex-1 bg-white items-center justify-center" style={{ paddingTop: insets.top }}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text className="text-gray-900 text-lg font-bold mt-4">
          Strand Not Found
        </Text>
        <Text className="text-gray-600 text-sm mt-2 px-6 text-center">
          The selected strand is no longer available in the library.
        </Text>
        <Pressable
          className="bg-blue-500 rounded-xl py-3 px-6 mt-6"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white text-base font-semibold">
            Go Back
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200">
          <Text className="text-gray-900 text-2xl font-bold">
            Elongation Results
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            {strand.name} • {inputs.numberOfStrands} strands • {inputs.bedLength}" bed
          </Text>
        </View>

        {/* Main Result - Total Elongation */}
        <View className="px-6 mt-4">
          <View className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-500">
            <Text className="text-gray-700 text-sm font-medium mb-2">
              Expected Elongation (Per Strand)
            </Text>
            <Text className="text-blue-600 text-4xl font-bold">
              {formatValue(results.totalElongation, 3, '"')}
            </Text>
            <Text className="text-gray-600 text-xs mt-2">
              Measurement reading on gauge/dial
            </Text>
          </View>
        </View>

        {/* Elongation Breakdown */}
        <View className="px-6 mt-4">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Elongation Breakdown
          </Text>

          {/* Theoretical Elongation */}
          <View className="bg-green-50 rounded-lg p-4 mb-2">
            <View className="flex-row justify-between items-center">
              <Text className="text-gray-700 text-sm font-medium">
                Theoretical Elongation
              </Text>
              <Text className="text-green-600 text-lg font-bold">
                +{formatValue(results.theoreticalElongation, 3, '"')}
              </Text>
            </View>
            <Text className="text-gray-600 text-xs mt-1">
              Based on elastic deformation formula
            </Text>
          </View>

          {/* Bed Shortening */}
          {results.bedShortening > 0 && (
            <View className="bg-blue-50 rounded-lg p-4 mb-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-700 text-sm font-medium">
                  Bed Shortening
                </Text>
                <Text className="text-blue-600 text-lg font-bold">
                  +{formatValue(results.bedShortening, 3, '"')}
                </Text>
              </View>
              <Text className="text-gray-600 text-xs mt-1">
                Elastic compression of casting bed
              </Text>
            </View>
          )}

          {/* Friction Loss */}
          {results.frictionLoss > 0 && (
            <View className="bg-orange-50 rounded-lg p-4 mb-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-700 text-sm font-medium">
                  Friction Loss
                </Text>
                <Text className="text-orange-600 text-lg font-bold">
                  -{formatValue(results.frictionLoss, 3, '"')}
                </Text>
              </View>
              <Text className="text-gray-600 text-xs mt-1">
                Loss due to friction along bed length
              </Text>
            </View>
          )}

          {/* Anchor Set Loss */}
          {results.anchorSetLoss > 0 && (
            <View className="bg-purple-50 rounded-lg p-4 mb-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-700 text-sm font-medium">
                  Anchor Set Loss
                </Text>
                <Text className="text-purple-600 text-lg font-bold">
                  -{formatValue(results.anchorSetLoss, 3, '"')}
                </Text>
              </View>
              <Text className="text-gray-600 text-xs mt-1">
                Slip during anchorage lock-off
              </Text>
            </View>
          )}
        </View>

        {/* Force & Stress Details */}
        <View className="px-6 mt-4">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Force & Stress Analysis
          </Text>

          <View className="flex-row gap-2 mb-2">
            {/* Force Per Strand */}
            <View className="flex-1 bg-gray-50 rounded-lg p-3">
              <Text className="text-gray-600 text-xs mb-1">Force/Strand</Text>
              <Text className="text-gray-900 text-base font-bold">
                {formatValue(results.forcePerStrand, 2, " kips")}
              </Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                {formatValue(results.forcePerStrand * 1000, 0, " lbs")}
              </Text>
            </View>

            {/* Stress Per Strand */}
            <View className="flex-1 bg-gray-50 rounded-lg p-3">
              <Text className="text-gray-600 text-xs mb-1">Stress/Strand</Text>
              <Text className="text-gray-900 text-base font-bold">
                {formatValue(results.stressPerStrand, 1, " ksi")}
              </Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                {formatValue(results.stressPerStrand * 1000, 0, " psi")}
              </Text>
            </View>
          </View>
        </View>

        {/* Strand Properties Reference */}
        <View className="px-6 mt-4">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Strand Properties
          </Text>

          <View className="bg-gray-50 rounded-lg p-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 text-sm">Name</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {strand.name}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 text-sm">Diameter</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {formatValue(strand.diameter, 3, '"')}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 text-sm">Cross-Sectional Area</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {formatValue(strand.area, 3, " in²")}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 text-sm">Elastic Modulus</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {formatValue(strand.elasticModulus, 0, " ksi")}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">Minimum Breaking Strength</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {formatValue(strand.breakingStrength, 1, " kips")} ({formatValue(strand.breakingStrength * 1000, 0, " lbs")})
              </Text>
            </View>
            {strand.grade && (
              <View className="flex-row justify-between mt-2">
                <Text className="text-gray-600 text-sm">Grade</Text>
                <Text className="text-gray-900 text-sm font-semibold">
                  {strand.grade} ksi
                </Text>
              </View>
            )}
            {strand.isDefault && (
              <Text className="text-gray-500 text-xs mt-3">
                Based on ASTM A416 Grade {strand.grade} standards
              </Text>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View className="px-6 mt-6">
          <Pressable
            className="bg-gray-100 rounded-xl py-4 items-center active:bg-gray-200 mb-3"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-gray-700 text-base font-semibold">
              Back to Calculator
            </Text>
          </Pressable>

          <Pressable
            className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
            onPress={() => navigation.navigate("Dashboard")}
          >
            <Text className="text-white text-base font-semibold">
              Return to Dashboard
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
