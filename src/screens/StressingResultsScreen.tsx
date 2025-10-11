import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/types";
import { Ionicons } from "@expo/vector-icons";
import {
  calculateElongation,
  STRAND_PROPERTIES,
  formatValue,
} from "../utils/stressing-calculations";

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

  // Calculate elongation
  const results = useMemo(() => calculateElongation(inputs), [inputs]);

  // Get strand properties
  const strandProps = STRAND_PROPERTIES[inputs.strandSize];

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Header */}
        <View className="px-6 py-4 border-b border-gray-200">
          <Text className="text-gray-900 text-2xl font-bold">
            Elongation Results
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            {inputs.strandSize}" strand • {inputs.numberOfStrands} strands • {inputs.bedLength}" bed
          </Text>
        </View>

        {/* Warnings */}
        {results.warnings.length > 0 && (
          <View className="px-6 mt-4">
            {results.warnings.map((warning, index) => {
              const isWarning = warning.startsWith("WARNING");
              const isCaution = warning.startsWith("CAUTION");
              return (
                <View
                  key={index}
                  className={`rounded-lg p-3 mb-2 ${
                    isWarning
                      ? "bg-red-50 border border-red-200"
                      : isCaution
                      ? "bg-orange-50 border border-orange-200"
                      : "bg-blue-50 border border-blue-200"
                  }`}
                >
                  <View className="flex-row items-start">
                    <Ionicons
                      name={
                        isWarning
                          ? "warning"
                          : isCaution
                          ? "alert-circle"
                          : "information-circle"
                      }
                      size={18}
                      color={
                        isWarning ? "#EF4444" : isCaution ? "#F59E0B" : "#3B82F6"
                      }
                    />
                    <Text
                      className={`flex-1 ml-2 text-xs font-medium ${
                        isWarning
                          ? "text-red-900"
                          : isCaution
                          ? "text-orange-900"
                          : "text-blue-900"
                      }`}
                    >
                      {warning}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

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
            </View>

            {/* Stress Per Strand */}
            <View className="flex-1 bg-gray-50 rounded-lg p-3">
              <Text className="text-gray-600 text-xs mb-1">Stress/Strand</Text>
              <Text className="text-gray-900 text-base font-bold">
                {formatValue(results.stressPerStrand, 1, " ksi")}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2 mb-2">
            {/* % of Breaking */}
            <View className="flex-1 bg-gray-50 rounded-lg p-3">
              <Text className="text-gray-600 text-xs mb-1">% Breaking</Text>
              <Text
                className={`text-base font-bold ${
                  results.percentOfBreaking > 80
                    ? "text-red-600"
                    : results.percentOfBreaking > 70
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {formatValue(results.percentOfBreaking, 1, "%")}
              </Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                of {formatValue(strandProps.breakingStrength, 1, " kips")}
              </Text>
            </View>

            {/* % of Yield */}
            <View className="flex-1 bg-gray-50 rounded-lg p-3">
              <Text className="text-gray-600 text-xs mb-1">% Yield</Text>
              <Text
                className={`text-base font-bold ${
                  results.percentOfYield > 90
                    ? "text-red-600"
                    : results.percentOfYield > 80
                    ? "text-orange-600"
                    : "text-green-600"
                }`}
              >
                {formatValue(results.percentOfYield, 1, "%")}
              </Text>
              <Text className="text-gray-500 text-xs mt-0.5">
                of {formatValue(strandProps.yieldStrength, 1, " kips")}
              </Text>
            </View>
          </View>
        </View>

        {/* Strand Properties Reference */}
        <View className="px-6 mt-4">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Strand Properties ({inputs.strandSize}" Diameter)
          </Text>

          <View className="bg-gray-50 rounded-lg p-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 text-sm">Cross-Sectional Area</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {formatValue(strandProps.area, 3, " in²")}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 text-sm">Elastic Modulus</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {formatValue(strandProps.elasticModulus, 0, " ksi")}
              </Text>
            </View>
            <View className="flex-row justify-between mb-2">
              <Text className="text-gray-600 text-sm">Breaking Strength</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {formatValue(strandProps.breakingStrength, 1, " kips")}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-gray-600 text-sm">Yield Strength (90%)</Text>
              <Text className="text-gray-900 text-sm font-semibold">
                {formatValue(strandProps.yieldStrength, 1, " kips")}
              </Text>
            </View>
            <Text className="text-gray-500 text-xs mt-3">
              Based on ASTM A416 Grade 270 standards
            </Text>
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
