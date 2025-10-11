import React, { useState } from "react";
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
import { RootStackParamList } from "../navigation/types";

type StressingCalculatorScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  "StressingCalculator"
>;

interface Props {
  navigation: StressingCalculatorScreenNavigationProp;
}

export default function StressingCalculatorScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  // Input states
  const [jackingForce, setJackingForce] = useState("");
  const [bedLength, setBedLength] = useState("");
  const [strandSize, setStrandSize] = useState<"3/8" | "1/2" | "0.6">("1/2");
  const [numberOfStrands, setNumberOfStrands] = useState("");
  const [bedShortening, setBedShortening] = useState("");
  const [frictionLoss, setFrictionLoss] = useState("");
  const [anchorSetLoss, setAnchorSetLoss] = useState("");

  const handleCalculate = () => {
    // Validate inputs
    if (!jackingForce || !bedLength || !numberOfStrands) {
      alert("Please fill in all required fields");
      return;
    }

    // Navigate to results screen
    navigation.navigate("StressingResults", {
      jackingForce: parseFloat(jackingForce),
      bedLength: parseFloat(bedLength),
      strandSize,
      numberOfStrands: parseInt(numberOfStrands),
      bedShortening: bedShortening ? parseFloat(bedShortening) : undefined,
      frictionLoss: frictionLoss ? parseFloat(frictionLoss) : undefined,
      anchorSetLoss: anchorSetLoss ? parseFloat(anchorSetLoss) : undefined,
    });
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
            Stressing Force & Elongation
          </Text>
          <Text className="text-gray-600 text-sm mt-1">
            Calculate expected strand elongation
          </Text>
        </View>

        {/* Info Banner */}
        <View className="px-6 mt-4 mb-3">
          <View className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#3B82F6" />
              <Text className="text-blue-900 text-xs ml-2 flex-1">
                Enter jacking force, bed dimensions, and strand details to calculate the expected elongation during prestressing operations.
              </Text>
            </View>
          </View>
        </View>

        {/* Required Inputs */}
        <View className="px-6">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Required Information
          </Text>

          {/* Jacking Force */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Total Jacking Force (kips) *
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 120.5"
              placeholderTextColor="#9CA3AF"
              value={jackingForce}
              onChangeText={setJackingForce}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Total force applied to all strands (1 kip = 1,000 lbs)
            </Text>
          </View>

          {/* Bed Length */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Bed Length (feet) *
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 400"
              placeholderTextColor="#9CA3AF"
              value={bedLength}
              onChangeText={setBedLength}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Distance between anchorages
            </Text>
          </View>

          {/* Strand Size */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Strand Size (diameter) *
            </Text>
            <View className="flex-row gap-2">
              <Pressable
                className={`flex-1 rounded-lg px-4 py-3 border-2 ${
                  strandSize === "3/8"
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
                onPress={() => setStrandSize("3/8")}
              >
                <Text
                  className={`text-center text-base font-semibold ${
                    strandSize === "3/8" ? "text-blue-700" : "text-gray-700"
                  }`}
                >
                  3/8"
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 rounded-lg px-4 py-3 border-2 ${
                  strandSize === "1/2"
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
                onPress={() => setStrandSize("1/2")}
              >
                <Text
                  className={`text-center text-base font-semibold ${
                    strandSize === "1/2" ? "text-blue-700" : "text-gray-700"
                  }`}
                >
                  1/2"
                </Text>
              </Pressable>
              <Pressable
                className={`flex-1 rounded-lg px-4 py-3 border-2 ${
                  strandSize === "0.6"
                    ? "bg-blue-50 border-blue-500"
                    : "bg-white border-gray-300"
                }`}
                onPress={() => setStrandSize("0.6")}
              >
                <Text
                  className={`text-center text-base font-semibold ${
                    strandSize === "0.6" ? "text-blue-700" : "text-gray-700"
                  }`}
                >
                  0.6"
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Number of Strands */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Number of Strands *
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 7"
              placeholderTextColor="#9CA3AF"
              value={numberOfStrands}
              onChangeText={setNumberOfStrands}
              keyboardType="number-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Total number of strands being stressed
            </Text>
          </View>
        </View>

        {/* Optional Inputs */}
        <View className="px-6 mt-2">
          <Text className="text-gray-900 text-lg font-semibold mb-3">
            Optional Adjustments
          </Text>

          {/* Bed Shortening */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Bed Shortening (inches)
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 0.125"
              placeholderTextColor="#9CA3AF"
              value={bedShortening}
              onChangeText={setBedShortening}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Elastic compression of the bed during stressing
            </Text>
          </View>

          {/* Friction Loss */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Friction Loss (%)
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 1.5"
              placeholderTextColor="#9CA3AF"
              value={frictionLoss}
              onChangeText={setFrictionLoss}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Typical range: 0.5-2% for long beds
            </Text>
          </View>

          {/* Anchor Set Loss */}
          <View className="mb-4">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Anchor Set Loss (inches)
            </Text>
            <TextInput
              className="bg-white border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="e.g., 0.25"
              placeholderTextColor="#9CA3AF"
              value={anchorSetLoss}
              onChangeText={setAnchorSetLoss}
              keyboardType="decimal-pad"
            />
            <Text className="text-gray-500 text-xs mt-1">
              Slip at anchorage during lock-off
            </Text>
          </View>
        </View>

        {/* Calculate Button */}
        <View className="px-6 mt-2">
          <Pressable
            className="bg-blue-500 rounded-xl py-4 items-center active:bg-blue-600"
            onPress={handleCalculate}
          >
            <View className="flex-row items-center">
              <Ionicons name="calculator" size={20} color="white" />
              <Text className="text-white text-base font-semibold ml-2">
                Calculate Elongation
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
